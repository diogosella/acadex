import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

// Ao tocar numa notificação de evento, abre a aba do Calendário.
//
// Cobre os dois casos: app já aberto/em segundo plano (listener) e app
// fechado, aberto pelo toque (resposta guardada pelo sistema, lida uma vez e
// depois limpa para não navegar de novo a cada remontagem).
//
// Precisa ser usado dentro de um navigator já montado (ex: o layout das
// abas), senão a navegação acontece antes do Root Layout existir.
function handleResponse(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

  const eventId = response.notification.request.content.data?.eventId;
  if (typeof eventId !== "string") return;

  Notifications.clearLastNotificationResponse();
  router.navigate("/calendar");
}

export function useNotificationNavigation() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    handleResponse(Notifications.getLastNotificationResponse());

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, []);
}
