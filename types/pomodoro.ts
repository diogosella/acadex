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
  // somAtivo do diagrama: os avisos de fim de foco/pausa tocam som.
  soundEnabled: boolean;
}

// Ajustes numéricos (os que têm stepper na tela de configurações).
export type PomodoroNumericSetting = Exclude<keyof PomodoroSettings, "soundEnabled">;

// Enum TipoSessao do diagrama (FOCO / PAUSA_CURTA / PAUSA_LONGA).
export type PomodoroSessionType = "focus" | "shortBreak" | "longBreak";

// Classe "Sessão Pomodoro" do diagrama: um foco ou uma pausa feitos pelo
// usuário, registrados no histórico. As telas de histórico mostram só os
// focos; as pausas ficam salvas para completar o registro do ciclo.
export interface PomodoroSession {
  id: string;
  type: PomodoroSessionType; // tipo da sessão (TipoSessao)
  // Posição no ciclo até a pausa longa (numeroNoCiclo): o 1º, 2º... foco do
  // ciclo; a pausa leva o número do foco que veio antes dela. null nas
  // sessões salvas antes deste campo existir.
  cycleNumber: number | null;
  startedAt: number; // epoch ms: quando a sessão começou
  endedAt: number; // epoch ms: quando terminou (ou foi cancelada)
  durationMs: number; // tempo efetivo (sem os momentos pausado)
  completed: boolean; // false = cancelada antes do fim
}
