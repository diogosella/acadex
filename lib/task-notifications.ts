import { cancelAppNotification, scheduleAppNotification } from "@/lib/notification-registry";
import * as Notifications from "@/lib/notifications-api";
import { Platform } from "react-native";

import {
  daysUntil,
  formatDueDate,
  parseDateKey,
} from "@/constants/task-options";
import {
  ensureAndroidChannel,
  ensureNotificationPermissions,
  getNotificationPermissionStatus,
  ScheduleEventNotificationResult,
} from "@/lib/event-notifications";
import { Task } from "@/types/task";

// Lembretes de tarefa (data de entrega). Mesmo esquema dos eventos
// (lib/event-notifications.ts, que também configura como a notificação
// aparece com o app aberto): identificador determinístico "task:<id da
// tarefa>", então cancelar/reagendar depende só do id da tarefa.
//
// Uma tarefa tem lembrete agendado quando: tem `remindAt` no futuro e ainda
// não foi concluída. Concluir cancela; desmarcar reagenda (se ainda der).

const IS_SUPPORTED = Platform.OS !== "web";
const TASK_ID_PREFIX = "task:";
const ANDROID_CHANNEL_ID = "tasks";
const ANDROID_CHANNEL_NAME = "Lembretes de tarefas";

// Parte do limite de 64 notificações agendadas do iOS (os eventos usam 40).
const MAX_SCHEDULED_TASK_REMINDERS = 20;

export type TaskReminderInput = Pick<Task, "id" | "title" | "done" | "dueDate" | "remindAt">;

function notificationIdFor(taskId: string): string {
  return `${TASK_ID_PREFIX}${taskId}`;
}

function wantsReminder(task: TaskReminderInput): task is TaskReminderInput & {
  remindAt: number;
  dueDate: string;
} {
  return (
    !task.done &&
    typeof task.dueDate === "string" &&
    typeof task.remindAt === "number" &&
    task.remindAt > Date.now()
  );
}

// Texto do aviso, relativo ao momento em que ele dispara.
function buildBody(dueDate: string, remindAt: number): string {
  const remindDay = new Date(remindAt);
  remindDay.setHours(0, 0, 0, 0);
  const days = Math.round(
    (parseDateKey(dueDate).getTime() - remindDay.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (days <= 0) return "Entrega hoje";
  if (days === 1) return `Entrega amanhã · ${formatDueDate(dueDate)}`;
  return `Entrega em ${days} dias · ${formatDueDate(dueDate)}`;
}

// true quando a tarefa tem data e lembrete, mas o horário do lembrete já
// passou (usado para avisar no formulário).
export function isTaskReminderInPast(remindAt: number | null): boolean {
  return remindAt !== null && remindAt <= Date.now();
}

// true quando a tarefa tem um lembrete que ainda vai disparar.
export function hasPendingReminder(task: Pick<Task, "done" | "remindAt">): boolean {
  return !task.done && typeof task.remindAt === "number" && task.remindAt > Date.now();
}

// true quando a entrega já passou e a tarefa não foi concluída.
export function isTaskOverdue(task: Pick<Task, "done" | "dueDate">): boolean {
  return !task.done && typeof task.dueDate === "string" && daysUntil(task.dueDate) < 0;
}

export async function scheduleTaskReminder(
  task: TaskReminderInput,
  options: { requestPermission?: boolean } = {}
): Promise<ScheduleEventNotificationResult> {
  if (!IS_SUPPORTED) return { scheduled: false, reason: "unsupported" };
  if (task.done || !task.dueDate || task.remindAt == null) {
    await cancelTaskReminder(task.id);
    return { scheduled: false, reason: "disabled" };
  }
  if (!wantsReminder(task)) {
    await cancelTaskReminder(task.id);
    return { scheduled: false, reason: "past" };
  }

  const allowed = options.requestPermission
    ? await ensureNotificationPermissions()
    : (await getNotificationPermissionStatus()) === "granted";
  if (!allowed) return { scheduled: false, reason: "denied" };

  try {
    await ensureAndroidChannel(ANDROID_CHANNEL_ID, ANDROID_CHANNEL_NAME);
    await scheduleAppNotification({
      id: notificationIdFor(task.id),
      type: "TAREFA",
      title: task.title,
      message: buildBody(task.dueDate, task.remindAt),
      triggerAt: task.remindAt,
      channelId: ANDROID_CHANNEL_ID,
      data: { taskId: task.id },
    });
    return { scheduled: true };
  } catch (error) {
    console.warn("[notificações] falha ao agendar lembrete da tarefa", error);
    return { scheduled: false, reason: "error" };
  }
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (!IS_SUPPORTED) return;
  try {
    await cancelAppNotification(notificationIdFor(taskId));
  } catch (error) {
    console.warn("[notificações] falha ao cancelar lembrete da tarefa", error);
  }
}

// Reconciliação ao abrir o app (igual à dos eventos): cancela lembretes de
// tarefas apagadas/concluídas e agenda os que faltam. Nunca pede permissão.
export async function syncTaskReminders(tasks: TaskReminderInput[]): Promise<void> {
  if (!IS_SUPPORTED) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(
      scheduled
        .map((request) => request.identifier)
        .filter((identifier) => identifier.startsWith(TASK_ID_PREFIX))
    );

    const upcoming = tasks
      .filter(wantsReminder)
      .sort((a, b) => a.remindAt - b.remindAt)
      .slice(0, MAX_SCHEDULED_TASK_REMINDERS);
    const wanted = new Map(upcoming.map((task) => [notificationIdFor(task.id), task]));

    for (const identifier of scheduledIds) {
      if (!wanted.has(identifier)) {
        await cancelAppNotification(identifier);
      }
    }

    const missing = [...wanted].filter(([identifier]) => !scheduledIds.has(identifier));
    if (missing.length === 0) return;
    if ((await getNotificationPermissionStatus()) !== "granted") return;

    for (const [, task] of missing) {
      await scheduleTaskReminder(task);
    }
  } catch (error) {
    console.warn("[notificações] falha ao sincronizar lembretes das tarefas", error);
  }
}
