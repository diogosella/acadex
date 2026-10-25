import * as Notifications from "@/lib/notifications-api";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

// Ao tocar numa notificação de evento, o app deve abrir na aba Calendário.
//
// São dois casos, tratados em lugares diferentes:
//
// 1. App FECHADO, aberto pelo toque: resolvido na rota inicial
//    (app/(tabs)/index.tsx), que decide para onde redirecionar com
//    getLaunchNotificationTarget(). Antes, isso era feito aqui com
//    router.navigate() logo na montagem — mas nesse momento a navegação
//    ainda não terminou de montar: o React avisava "Can't perform a React
//    state update on a component that hasn't mounted yet", a navegação era
//    perdida e o Redirect padrão levava para o Pomodoro.
//
// 2. App ABERTO ou em segundo plano: o listener deste hook navega na hora
//    (a navegação já está montada).

type NotificationResponse = Notifications.NotificationResponse;

const CALENDAR_ROUTE = "/calendar";

// Identifica uma resposta específica (mesma notificação, mesmo disparo).
function responseKey(response: NotificationResponse): string {
  return `${response.notification.request.identifier}@${response.notification.date}`;
}

// Resposta já tratada no início do app. No Android, o listener às vezes
// também recebe a resposta que abriu o app; ela é ignorada lá para não
// navegar duas vezes (nem antes da navegação existir).
let handledLaunchResponseKey: string | null = null;

// Resultado de getLaunchNotificationTarget, calculado uma vez por execução
// do app (o React pode chamar o inicializador do useState duas vezes em
// desenvolvimento; a segunda chamada precisa dar o mesmo resultado).
let launchTargetResolved = false;
let launchTarget: typeof CALENDAR_ROUTE | null = null;

function isEventTap(response: NotificationResponse | null): response is NotificationResponse {
  if (!response) return false;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return false;
  return typeof response.notification.request.content.data?.eventId === "string";
}

// Chamada uma vez pela rota inicial: se o app foi aberto pelo toque numa
// notificação de evento, devolve a rota do Calendário (e "consome" a
// resposta, para não redirecionar de novo em remontagens). Senão, null.
export function getLaunchNotificationTarget(): typeof CALENDAR_ROUTE | null {
  if (launchTargetResolved) return launchTarget;
  launchTargetResolved = true;
  if (Platform.OS === "web") return null;

  try {
    const response = Notifications.getLastNotificationResponse();
    if (isEventTap(response)) {
      handledLaunchResponseKey = responseKey(response);
      Notifications.clearLastNotificationResponse();
      launchTarget = CALENDAR_ROUTE;
    }
  } catch (error) {
    console.warn("[notificações] falha ao ler a notificação que abriu o app", error);
  }
  return launchTarget;
}

export function useNotificationNavigation() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!isEventTap(response)) return;
      if (responseKey(response) === handledLaunchResponseKey) return;

      Notifications.clearLastNotificationResponse();
      router.navigate(CALENDAR_ROUTE);
    });
    return () => subscription.remove();
  }, []);
}
