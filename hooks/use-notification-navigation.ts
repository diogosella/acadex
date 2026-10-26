import * as Notifications from "@/lib/notifications-api";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

// Ao tocar numa notificação, o app abre na aba certa: aviso de evento →
// Calendário; lembrete de tarefa → Tarefas; aviso do Pomodoro → Pomodoro.
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

type NotificationRoute = "/calendar" | "/tasks" | "/pomodoro";

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
let launchTarget: NotificationRoute | null = null;

// Rota de destino para um toque numa notificação do app (null = não é um
// toque numa notificação nossa, ou foi num botão de ação).
function routeForTap(response: NotificationResponse | null): NotificationRoute | null {
  if (!response) return null;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const data = response.notification.request.content.data;
  if (typeof data?.eventId === "string") return "/calendar";
  if (typeof data?.taskId === "string") return "/tasks";
  if (data?.pomodoro === true) return "/pomodoro";
  return null;
}

// Chamada uma vez pela rota inicial: se o app foi aberto pelo toque numa
// notificação, devolve a rota da aba certa (e "consome" a resposta, para não
// redirecionar de novo em remontagens). Senão, null.
export function getLaunchNotificationTarget(): NotificationRoute | null {
  if (launchTargetResolved) return launchTarget;
  launchTargetResolved = true;
  if (Platform.OS === "web") return null;

  try {
    const response = Notifications.getLastNotificationResponse();
    const route = routeForTap(response);
    if (response && route) {
      handledLaunchResponseKey = responseKey(response);
      Notifications.clearLastNotificationResponse();
      launchTarget = route;
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
      const route = routeForTap(response);
      if (!route) return;
      if (responseKey(response) === handledLaunchResponseKey) return;

      Notifications.clearLastNotificationResponse();
      router.navigate(route);
    });
    return () => subscription.remove();
  }, []);
}
