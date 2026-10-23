import { Platform } from "react-native";

// ATENÇÃO: este módulo isola toda a integração com `expo-notifications`.
//
// O pacote `expo-notifications` ainda não está instalado no projeto
// (precisa rodar `npx expo install expo-notifications`). Enquanto isso não
// acontecer, as funções abaixo ficam como "no-op" (não fazem nada, só
// devolvem `null`), para que o resto do app continue funcionando
// normalmente sem quebrar o bundler por causa de um import de um pacote
// que não existe em node_modules.
//
// Depois que o pacote estiver instalado, troque o conteúdo deste arquivo
// pela implementação real comentada no final do arquivo (ou peça para o
// Claude fazer essa troca).

type ScheduleInput = {
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  notifyBeforeMinutes: number | null;
};

const NOTIFICATIONS_AVAILABLE = false;

export async function ensureNotificationPermissions(): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE || Platform.OS === "web") return;
  // Sem implementação ainda — ver bloco comentado no final do arquivo.
}

export async function scheduleEventNotification(
  input: ScheduleInput
): Promise<string | null> {
  if (!NOTIFICATIONS_AVAILABLE || Platform.OS === "web") return null;
  // Sem implementação ainda — ver bloco comentado no final do arquivo.
  return null;
}

export async function cancelEventNotification(
  notificationId: string | null
): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE || Platform.OS === "web" || !notificationId) return;
  // Sem implementação ainda — ver bloco comentado no final do arquivo.
}

/*
IMPLEMENTAÇÃO REAL (ativar depois de `npx expo install expo-notifications`):

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermissions(): Promise<void> {
  if (Platform.OS === "web") return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

export async function scheduleEventNotification(input: ScheduleInput): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (input.notifyBeforeMinutes === null) return null;

  const [year, month, day] = input.date.split("-").map(Number);
  const [hour, minute] = input.time.split(":").map(Number);
  const eventDate = new Date(year, month - 1, day, hour, minute);
  const triggerDate = new Date(eventDate.getTime() - input.notifyBeforeMinutes * 60 * 1000);

  if (triggerDate.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Acadex",
      body: input.title,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function cancelEventNotification(notificationId: string | null): Promise<void> {
  if (Platform.OS === "web" || !notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
*/
