import { PomodoroPhase } from "@/types/pomodoro";

export const FOCUS_DURATION_MS = 25 * 60 * 1000;
export const SHORT_BREAK_DURATION_MS = 5 * 60 * 1000;
export const LONG_BREAK_DURATION_MS = 15 * 60 * 1000;

// Quantos ciclos de foco até a próxima pausa virar "longa".
export const CYCLES_BEFORE_LONG_BREAK = 4;

// Quantidade de bolinhas de progresso mostradas na tela (FocusStreak).
export const STREAK_DOT_COUNT = 5;

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
