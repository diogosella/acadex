import { cancelAppNotification, scheduleAppNotification } from "@/lib/notification-registry";
import * as Notifications from "@/lib/notifications-api";
import { Platform } from "react-native";

import { CalendarEvent } from "@/types/event";

// Toda a integração com `expo-notifications` para os eventos do Calendário
// fica isolada aqui.
//
// Cada notificação é agendada com um identificador determinístico
// ("event:<id do evento>"). Assim, cancelar ou reagendar depende só do id do
// evento — não é preciso guardar nenhum id de notificação junto do evento, e
// a reconciliação (syncEventNotifications) consegue saber exatamente quais
// notificações agendadas pertencem a quais eventos.
//
// No navegador (`expo start --web`) notificações locais não existem: todas as
// funções viram no-op.

const IS_SUPPORTED = Platform.OS !== "web";
const EVENT_ID_PREFIX = "event:";
const ANDROID_CHANNEL_ID = "events";

// O iOS mantém no máximo 64 notificações locais agendadas por app; a
// reconciliação agenda só as mais próximas, com folga.
// Os lembretes de tarefa (lib/task-notifications.ts) usam outra parte desse
// limite.
const MAX_SCHEDULED_NOTIFICATIONS = 40;

type EventNotificationInput = Pick<
  CalendarEvent,
  "id" | "title" | "date" | "time" | "notifyBeforeMinutes"
>;

type EventTimingInput = Pick<CalendarEvent, "date" | "time" | "notifyBeforeMinutes">;

export type NotificationPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unsupported";

export type ScheduleEventNotificationResult =
  | { scheduled: true }
  | {
      scheduled: false;
      reason: "disabled" | "past" | "denied" | "unsupported" | "error";
    };

// Faz a notificação aparecer também quando o app está aberto em primeiro
// plano (por padrão, ela só apareceria com o app em segundo plano/fechado).
if (IS_SUPPORTED) {
  Notifications.setNotificationHandler({
    // Avisos marcados como silenciosos (Pomodoro com o som desligado) não
    // tocam som nem com o app aberto.
    handleNotification: async (notification) => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: notification.request.content.data?.silent !== true,
      shouldSetBadge: false,
    }),
  });
}

function notificationIdFor(eventId: string): string {
  return `${EVENT_ID_PREFIX}${eventId}`;
}

// Data/hora em que o evento acontece, em horário local.
export function getEventDate(event: Pick<CalendarEvent, "date" | "time">): Date {
  const [year, month, day] = event.date.split("-").map(Number);
  const [hour, minute] = event.time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

// Data/hora em que o aviso deve disparar, ou null se o evento não tem aviso.
export function getEventTriggerDate(event: EventTimingInput): Date | null {
  if (event.notifyBeforeMinutes === null) return null;
  return new Date(getEventDate(event).getTime() - event.notifyBeforeMinutes * 60 * 1000);
}

// true quando o evento tem aviso, mas o horário do aviso já passou.
export function isEventTriggerInPast(event: EventTimingInput): boolean {
  const trigger = getEventTriggerDate(event);
  return trigger !== null && trigger.getTime() <= Date.now();
}

function plural(value: number, singular: string, pluralForm: string): string {
  return `${value} ${value === 1 ? singular : pluralForm}`;
}

function describeLeadTime(minutes: number): string {
  if (minutes % 1440 === 0) return plural(minutes / 1440, "dia", "dias");
  if (minutes % 60 === 0) return plural(minutes / 60, "hora", "horas");
  return plural(minutes, "minuto", "minutos");
}

function buildBody(event: EventNotificationInput): string {
  const minutes = event.notifyBeforeMinutes ?? 0;
  if (minutes === 0) return `Começa agora · ${event.time}`;
  if (minutes === 1440) return `Amanhã às ${event.time}`;
  return `Começa em ${describeLeadTime(minutes)} · ${event.time}`;
}

// No Android 8+ toda notificação precisa de um canal; no Android 13+ o canal
// precisa existir antes do pedido de permissão para o diálogo aparecer.
//
// Criar o canal é "melhor esforço": se falhar, não pode impedir o pedido de
// permissão nem o agendamento. Sem o canal "events", o expo-notifications
// usa automaticamente o canal padrão dele (fallback), e o aviso chega mesmo
// assim, só sem o nome/importância personalizados.
export async function ensureAndroidChannel(
  channelId: string = ANDROID_CHANNEL_ID,
  name: string = "Eventos do calendário",
  options: { silent?: boolean } = {}
): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(channelId, {
      name,
      importance: Notifications.AndroidImportance.HIGH,
      // No Android o som é do canal (não do aviso): canal silencioso para
      // quando o som estiver desligado.
      ...(options.silent ? { sound: null } : {}),
    });
  } catch (error) {
    console.warn(`[notificações] falha ao criar o canal Android "${channelId}"`, error);
  }
}

// Consulta o status da permissão sem pedir nada ao usuário.
//
// "denied" aqui significa bloqueada de vez: o sistema não deixa mais o app
// perguntar (canAskAgain false), e só dá para ativar nas configurações. No
// Android, o status pode vir como "denied" mesmo quando ainda dá para
// perguntar (por exemplo, depois de uma única recusa, ou no Expo Go). Nesses
// casos o diálogo do sistema ainda aparece ao criar o evento, então tratamos
// como "undetermined".
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!IS_SUPPORTED) return "unsupported";
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted) return "granted";
    return permission.status === "denied" && !permission.canAskAgain
      ? "denied"
      : "undetermined";
  } catch {
    return "undetermined";
  }
}

// Pede a permissão se ainda for possível; devolve se ela está concedida.
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!IS_SUPPORTED) return false;
  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.warn("[notificações] falha ao pedir permissão", error);
    return false;
  }
}

type ScheduleOptions = {
  // true: pede a permissão se ainda não foi concedida (usado quando o
  // usuário acabou de criar um evento com aviso). false: só agenda se a
  // permissão já existir (usado na reconciliação ao abrir o app).
  requestPermission?: boolean;
};

export async function scheduleEventNotification(
  event: EventNotificationInput,
  options: ScheduleOptions = {}
): Promise<ScheduleEventNotificationResult> {
  if (!IS_SUPPORTED) return { scheduled: false, reason: "unsupported" };

  const trigger = getEventTriggerDate(event);
  if (trigger === null) return { scheduled: false, reason: "disabled" };
  if (trigger.getTime() <= Date.now()) return { scheduled: false, reason: "past" };

  const allowed = options.requestPermission
    ? await ensureNotificationPermissions()
    : (await getNotificationPermissionStatus()) === "granted";
  if (!allowed) return { scheduled: false, reason: "denied" };

  try {
    await ensureAndroidChannel();
    // Substitui o aviso anterior do mesmo evento (ex: edição).
    await scheduleAppNotification({
      id: notificationIdFor(event.id),
      type: "EVENTO",
      title: event.title,
      message: buildBody(event),
      triggerAt: trigger.getTime(),
      channelId: ANDROID_CHANNEL_ID,
      data: { eventId: event.id, date: event.date },
    });
    return { scheduled: true };
  } catch (error) {
    console.warn("[notificações] falha ao agendar aviso do evento", error);
    return { scheduled: false, reason: "error" };
  }
}

export async function cancelEventNotification(eventId: string): Promise<void> {
  if (!IS_SUPPORTED) return;
  try {
    await cancelAppNotification(notificationIdFor(eventId));
  } catch (error) {
    console.warn("[notificações] falha ao cancelar aviso do evento", error);
  }
}

// Reconciliação entre os eventos salvos e o que está agendado no aparelho:
// - cancela avisos de eventos que não existem mais (ou cujo aviso foi tirado);
// - agenda avisos que faltam (eventos criados antes das notificações
//   existirem, dados restaurados, reinstalação do app etc.).
// Nunca pede permissão — se ela ainda não foi concedida, só limpa.
export async function syncEventNotifications(
  events: EventNotificationInput[]
): Promise<void> {
  if (!IS_SUPPORTED) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(
      scheduled
        .map((request) => request.identifier)
        .filter((identifier) => identifier.startsWith(EVENT_ID_PREFIX))
    );

    const upcoming = events
      .map((event) => ({ event, trigger: getEventTriggerDate(event) }))
      .filter(
        (item): item is { event: EventNotificationInput; trigger: Date } =>
          item.trigger !== null && item.trigger.getTime() > Date.now()
      )
      .sort((a, b) => a.trigger.getTime() - b.trigger.getTime())
      .slice(0, MAX_SCHEDULED_NOTIFICATIONS);

    const wanted = new Map(
      upcoming.map(({ event }) => [notificationIdFor(event.id), event])
    );

    for (const identifier of scheduledIds) {
      if (!wanted.has(identifier)) {
        await cancelAppNotification(identifier);
      }
    }

    const missing = [...wanted].filter(([identifier]) => !scheduledIds.has(identifier));
    if (missing.length === 0) return;
    if ((await getNotificationPermissionStatus()) !== "granted") return;

    for (const [, event] of missing) {
      await scheduleEventNotification(event);
    }
  } catch (error) {
    console.warn("[notificações] falha ao sincronizar avisos dos eventos", error);
  }
}
