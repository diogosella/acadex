import { TaskPriority } from "@/types/task";

import { toDateKey } from "./event-options";

export type PriorityOption = {
  value: TaskPriority;
  label: string;
  color: string;
};

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: "baixa", label: "Baixa", color: "#34C759" },
  { value: "media", label: "Média", color: "#FFD60A" },
  { value: "urgente", label: "Urgente", color: "#FF3B30" },
];

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgente: 0,
  media: 1,
  baixa: 2,
};

export function getPriorityOption(priority: TaskPriority): PriorityOption {
  return (
    PRIORITY_OPTIONS.find((option) => option.value === priority) ??
    PRIORITY_OPTIONS[0]
  );
}

export type SubjectColorOption = {
  label: string;
  color: string;
};

export const SUBJECT_COLOR_OPTIONS: SubjectColorOption[] = [
  { label: "Azul", color: "#458FFF" },
  { label: "Verde", color: "#34C759" },
  { label: "Vermelho", color: "#FF3B30" },
  { label: "Laranja", color: "#FF9500" },
  { label: "Branco", color: "#FFFFFF" },
  { label: "Roxo", color: "#AF52DE" },
  { label: "Rosa", color: "#FF375F" },
  { label: "Amarelo", color: "#FFD60A" },
  { label: "Cinza", color: "#8E8E93" },
];

// --- Data de entrega e lembrete -------------------------------------------

// Horário em que o lembrete de tarefa dispara (no dia escolhido).
export const TASK_REMINDER_HOUR = 9;

// Valor especial (só em desenvolvimento): lembrete 1 minuto depois de salvar.
export const DEV_REMINDER_SOON = -1;

// Quantos dias aparecem na lista de "Entrega" (a partir de hoje).
export const DUE_DATE_RANGE_DAYS = 90;

export type ReminderOption = {
  label: string; // na lista
  short: string; // no campo (estreito)
  daysBefore: number | null;
};

export const REMINDER_OPTIONS: ReminderOption[] = [
  { label: "Não lembrar", short: "Não lembrar", daysBefore: null },
  { label: "No dia, às 9h", short: "No dia", daysBefore: 0 },
  { label: "1 dia antes, às 9h", short: "1 dia antes", daysBefore: 1 },
  { label: "2 dias antes, às 9h", short: "2 dias antes", daysBefore: 2 },
  { label: "1 semana antes, às 9h", short: "1 semana antes", daysBefore: 7 },
  ...(__DEV__
    ? [{ label: "Em 1 minuto (dev)", short: "1 min (dev)", daysBefore: DEV_REMINDER_SOON }]
    : []),
];

// Lembrete que já vem marcado ao escolher uma data de entrega.
export const DEFAULT_REMIND_DAYS_BEFORE = 1;

export function getReminderOption(daysBefore: number | null): ReminderOption {
  return (
    REMINDER_OPTIONS.find((option) => option.daysBefore === daysBefore) ?? REMINDER_OPTIONS[0]
  );
}

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function todayDateKey(): string {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDaysToKey(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

// Dias de hoje até a data (negativo = já passou).
export function daysUntil(key: string): number {
  const today = parseDateKey(todayDateKey());
  return Math.round((parseDateKey(key).getTime() - today.getTime()) / DAY_MS);
}

// "Seg, 27 out"
export function formatDueDate(key: string): string {
  const date = parseDateKey(key);
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

// "Hoje", "Amanhã" ou "Seg, 27 out".
export function formatDueDateRelative(key: string): string {
  const days = daysUntil(key);
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return formatDueDate(key);
}

// Momento do lembrete, ou null se não há data/lembrete.
export function computeRemindAt(
  dueDate: string | null,
  daysBefore: number | null,
  now: number = Date.now()
): number | null {
  if (!dueDate || daysBefore === null) return null;
  if (daysBefore === DEV_REMINDER_SOON) return now + 60 * 1000;
  const date = parseDateKey(dueDate);
  date.setDate(date.getDate() - daysBefore);
  date.setHours(TASK_REMINDER_HOUR, 0, 0, 0);
  return date.getTime();
}
