export type PomodoroPhase = "idle" | "focus" | "shortBreak" | "longBreak";

export interface PomodoroDailyProgress {
  completedToday: number;
  lastActiveDate: string; // "YYYY-MM-DD"
}
