import { PomodoroPhase, PomodoroSettings } from "@/types/pomodoro";

// Valores padrão da técnica Pomodoro (usados até o usuário mudar e no
// "Restaurar padrão" da tela de configurações).
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
};

type SettingLimit = { min: number; max: number; step: number };

// Só em desenvolvimento: foco = 0 nas configurações significa um foco de
// poucos segundos, para testar o fim de sessão e as bolinhas de progresso
// sem esperar 5 minutos. No app final o mínimo continua 5 minutos (um 0
// salvo vira 5 ao carregar, pelo clampPomodoroSetting).
export const DEV_QUICK_FOCUS_SECONDS = 2;

// Limites e passo de cada ajuste na tela de configurações.
export const POMODORO_SETTING_LIMITS: Record<keyof PomodoroSettings, SettingLimit> = {
  focusMinutes: { min: __DEV__ ? 0 : 5, max: 90, step: 5 },
  shortBreakMinutes: { min: 1, max: 30, step: 1 },
  longBreakMinutes: { min: 5, max: 60, step: 5 },
  cyclesBeforeLongBreak: { min: 2, max: 8, step: 1 },
};

// Garante que um valor (ex: lido do armazenamento) está dentro dos limites
// e é um inteiro; se não for um número válido, usa o padrão.
export function clampPomodoroSetting(key: keyof PomodoroSettings, value: unknown): number {
  const { min, max } = POMODORO_SETTING_LIMITS[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_POMODORO_SETTINGS[key];
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Duração (ms) de uma fase com as configurações atuais.
export function durationForPhase(phase: PomodoroPhase, settings: PomodoroSettings): number {
  switch (phase) {
    case "focus":
      if (__DEV__ && settings.focusMinutes === 0) return DEV_QUICK_FOCUS_SECONDS * 1000;
      return settings.focusMinutes * 60 * 1000;
    case "shortBreak":
      return settings.shortBreakMinutes * 60 * 1000;
    case "longBreak":
      return settings.longBreakMinutes * 60 * 1000;
    default:
      return 0;
  }
}

// Quantidade de bolinhas de progresso mostradas na tela (FocusStreak). Ao
// completar todas, o app parabeniza e começa uma nova rodada.
export const STREAK_DOT_COUNT = 5;

// Tempo de foco por extenso, para a parabenização (ex: "2 h 5 min").
export function formatFocusDuration(ms: number): string {
  if (ms < 60 * 1000) {
    const seconds = Math.max(1, Math.round(ms / 1000));
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export const PHASE_LABELS: Record<Exclude<PomodoroPhase, "idle">, string> = {
  focus: "Foco",
  shortBreak: "Pausa curta",
  longBreak: "Pausa longa",
};

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

// Formata milissegundos restantes como "mm:ss" (nunca negativo).
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

// Data de hoje no formato "YYYY-MM-DD", em horário local — usada para
// saber se o contador de pomodoros do dia precisa zerar.
export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}
