import * as Notifications from "@/lib/notifications-api";
import { Alert } from "react-native";

// Diagnóstico de notificações, só para desenvolvimento (o botão que chama
// isto só aparece em __DEV__). Ajuda a separar os três pontos que podem
// falhar no Expo Go:
//   1. permissão  → o status completo devolvido pelo sistema;
//   2. exibição   → uma notificação imediata (sem alarme envolvido);
//   3. agendamento → uma notificação para daqui a alguns segundos, que passa
//      pelo AlarmManager do Android, igual aos avisos de evento.
// No fim, lista o que está agendado no aparelho (inclui os avisos de evento,
// com identificador "event:<id>").

const DELAYED_TEST_SECONDS = 15;

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function runNotificationDiagnostics(): Promise<void> {
  const lines: string[] = [];

  try {
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    lines.push(
      `Permissão: ${permission.status} (granted=${permission.granted}, canAskAgain=${permission.canAskAgain})`
    );
  } catch (error) {
    lines.push(`Permissão: ERRO — ${describeError(error)}`);
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Teste ACADEX (imediato)", body: "A exibição de notificações funciona." },
      trigger: null,
    });
    lines.push("Imediata: enviada");
  } catch (error) {
    lines.push(`Imediata: ERRO — ${describeError(error)}`);
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: "debug:delayed",
      content: {
        title: `Teste ACADEX (${DELAYED_TEST_SECONDS}s)`,
        body: "O agendamento de notificações funciona.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: DELAYED_TEST_SECONDS,
      },
    });
    lines.push(`Agendada para ${DELAYED_TEST_SECONDS}s: ok`);
  } catch (error) {
    lines.push(`Agendada: ERRO — ${describeError(error)}`);
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ids = scheduled.map((request) => request.identifier);
    lines.push(`Agendadas no aparelho: ${ids.length}`);
    if (ids.length > 0) lines.push(ids.join("\n"));
  } catch (error) {
    lines.push(`Listar agendadas: ERRO — ${describeError(error)}`);
  }

  const report = lines.join("\n");
  console.log(`[notificações] diagnóstico\n${report}`);
  Alert.alert(
    "Diagnóstico de notificações",
    `${report}\n\nToque em OK e vá para a tela inicial do celular para ver a de ${DELAYED_TEST_SECONDS}s chegar com o app em segundo plano.`
  );
}
