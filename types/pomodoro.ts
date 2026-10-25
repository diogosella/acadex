export type PomodoroPhase = "idle" | "focus" | "shortBreak" | "longBreak";

export interface PomodoroDailyProgress {
  completedToday: number;
  lastActiveDate: string; // "YYYY-MM-DD"
  // Tempo de foco (ms) somado na rodada atual de bolinhas. Opcional porque
  // versões antigas do app não salvavam.
  roundFocusMs?: number;
}

// Rodada de bolinhas completada (ex: 5 focos): dados para a parabenização.
export interface PomodoroRoundCelebration {
  sessions: number;
  focusMs: number;
}

// Classe "Configuração Pomodoro" do diagrama: durações (em minutos) e
// quantos ciclos de foco até a pausa longa. Persistida no aparelho.
export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

// Classe "Sessão Pomodoro" do diagrama: um foco feito pelo usuário,
// registrado no histórico. Pausas (curta/longa) não viram sessão.
export interface PomodoroSession {
  id: string;
  startedAt: number; // epoch ms: quando o foco começou
  endedAt: number; // epoch ms: quando terminou (ou foi cancelado)
  durationMs: number; // tempo de foco efetivo (sem os momentos pausado)
  completed: boolean; // false = cancelada antes do fim
}
