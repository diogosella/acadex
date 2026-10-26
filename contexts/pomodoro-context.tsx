import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import {
  durationForPhase,
  getTodayKey,
  STREAK_DOT_COUNT,
} from "@/constants/pomodoro-options";
import { usePomodoroHistory } from "@/contexts/pomodoro-history-context";
import {
  cancelPomodoroNotifications,
  schedulePomodoroNotifications,
} from "@/lib/pomodoro-notifications";
import { usePomodoroSettings } from "@/contexts/pomodoro-settings-context";
import {
  PomodoroDailyProgress,
  PomodoroPhase,
  PomodoroRoundCelebration,
  PomodoroSessionType,
} from "@/types/pomodoro";

const STORAGE_KEY = "acadex:pomodoro-progress";

type PomodoroContextValue = {
  phase: PomodoroPhase;
  isRunning: boolean;
  remainingMs: number;
  completedToday: number;
  // Bolinhas preenchidas na rodada atual (0..STREAK_DOT_COUNT-1). Ao
  // completar a rodada, volta para 0 e `celebration` é preenchido.
  roundCompleted: number;
  celebration: PomodoroRoundCelebration | null;
  dismissCelebration: () => void;
  toggle: () => void;
  cancel: () => void;
};

const PomodoroContext = createContext<PomodoroContextValue | undefined>(undefined);

// Fase em andamento salva no aparelho: se o sistema fechar o app no meio de
// um foco (comum no Android), ele volta de onde estava ao reabrir.
const RUNNING_KEY = "acadex:pomodoro-running";

type ActivePhase = Exclude<PomodoroPhase, "idle">;

type SavedRunningState = {
  phase: ActivePhase;
  isRunning: boolean;
  phaseEndAt: number | null; // rodando: quando a fase termina
  remainingMs: number; // pausado: quanto faltava
  durationMs: number;
  startedAt: number;
  cycleNumber: number;
  cycleCount: number;
};

function isSavedRunningState(value: unknown): value is SavedRunningState {
  const v = value as SavedRunningState;
  return (
    typeof v === "object" &&
    v !== null &&
    (v.phase === "focus" || v.phase === "shortBreak" || v.phase === "longBreak") &&
    typeof v.isRunning === "boolean" &&
    typeof v.remainingMs === "number" &&
    typeof v.durationMs === "number" &&
    typeof v.startedAt === "number" &&
    typeof v.cycleNumber === "number" &&
    typeof v.cycleCount === "number"
  );
}

// Proteção contra laço infinito ao avançar fases que terminaram com o app
// fechado (no máximo: foco → pausa → ocioso).
const MAX_PHASE_ADVANCES = 4;

export function PomodoroProvider({ children }: { children: ReactNode }) {
  // Durações e ciclos vêm da tela de configurações. Uma fase já em
  // andamento mantém o horário de término com que começou; as mudanças
  // valem a partir da próxima fase.
  const { settings, isLoaded: settingsLoaded } = usePomodoroSettings();
  // Cada foco ou pausa, completado ou cancelado, vira uma "Sessão Pomodoro"
  // no histórico (com o tipo e o número no ciclo).
  const { addSession } = usePomodoroHistory();
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [celebration, setCelebration] = useState<PomodoroRoundCelebration | null>(null);

  // O "motor" do timer trabalha com refs (sempre o valor mais novo, mesmo
  // dentro do interval e ao avançar várias fases de uma vez); os estados
  // acima são só o que a tela mostra.
  const phaseRef = useRef<PomodoroPhase>("idle");
  const completedTodayRef = useRef(0);
  // Tempo de foco somado na rodada atual de bolinhas.
  const roundFocusMsRef = useRef(0);
  // Duração planejada da fase em andamento (para o histórico e para somar o
  // tempo de foco da rodada).
  const phaseDurationRef = useRef(0);
  // Quando a fase em andamento começou (para o histórico).
  const phaseStartedAtRef = useRef(0);
  // Número no ciclo da fase em andamento (numeroNoCiclo): o foco leva a sua
  // posição no ciclo (1, 2, ...) e a pausa, a do foco que veio antes.
  const phaseCycleNumberRef = useRef(1);
  // Focos já feitos no ciclo atual (0..cyclesBeforeLongBreak-1).
  const cycleCountRef = useRef(0);
  // Timestamp (epoch ms) em que a fase atual termina. A contagem real é
  // sempre derivada dele (nunca de um decremento por tick), então o tempo
  // continua correndo com o app em segundo plano ou fechado.
  const phaseEndAtRef = useRef<number | null>(null);
  // A restauração da fase salva roda uma vez só.
  const restoredRef = useRef(false);
  // true logo depois de o usuário iniciar um foco: o próximo agendamento
  // dos avisos pode pedir a permissão de notificação.
  const askPermissionRef = useRef(false);

  const applyPhase = useCallback((next: PomodoroPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Salva (ou apaga, se ocioso) a fase em andamento no aparelho.
  const saveRunning = useCallback((running: boolean, remaining: number) => {
    const current = phaseRef.current;
    if (current === "idle") {
      AsyncStorage.removeItem(RUNNING_KEY);
      return;
    }
    const state: SavedRunningState = {
      phase: current,
      isRunning: running,
      phaseEndAt: running ? phaseEndAtRef.current : null,
      remainingMs: remaining,
      durationMs: phaseDurationRef.current,
      startedAt: phaseStartedAtRef.current,
      cycleNumber: phaseCycleNumberRef.current,
      cycleCount: cycleCountRef.current,
    };
    AsyncStorage.setItem(RUNNING_KEY, JSON.stringify(state));
  }, []);

  const persistProgress = useCallback((count: number, roundMs: number) => {
    completedTodayRef.current = count;
    roundFocusMsRef.current = roundMs;
    setCompletedToday(count);
    const progress: PomodoroDailyProgress = {
      completedToday: count,
      lastActiveDate: getTodayKey(),
      roundFocusMs: roundMs,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, []);

  // Inicia uma fase (foco ou pausa) em `startAt` — normalmente agora; ao
  // avançar fases que terminaram com o app fechado, no instante exato em
  // que a anterior acabou (a pausa começa quando o foco terminou, não
  // quando o usuário voltou ao app).
  const startPhase = useCallback(
    (nextPhase: ActivePhase, cycleNumber: number, startAt: number = Date.now()) => {
      const duration = durationForPhase(nextPhase, settings);
      phaseDurationRef.current = duration;
      phaseStartedAtRef.current = startAt;
      phaseCycleNumberRef.current = cycleNumber;
      phaseEndAtRef.current = startAt + duration;
      applyPhase(nextPhase);
      setRemainingMs(Math.max(0, startAt + duration - Date.now()));
      setIsRunning(true);
      saveRunning(true, duration);
    },
    [settings, applyPhase, saveRunning]
  );

  const goIdle = useCallback(() => {
    phaseEndAtRef.current = null;
    applyPhase("idle");
    setRemainingMs(0);
    setIsRunning(false);
    saveRunning(false, 0);
  }, [applyPhase, saveRunning]);

  // Registra a fase atual no histórico. `effectiveMs`: tempo realmente
  // cumprido (a duração planejada se completou; menos, se cancelou).
  const recordPhase = useCallback(
    (type: PomodoroSessionType, endedAt: number, effectiveMs: number, completed: boolean) => {
      addSession({
        type,
        cycleNumber: phaseCycleNumberRef.current,
        startedAt: phaseStartedAtRef.current || endedAt - effectiveMs,
        endedAt,
        durationMs: effectiveMs,
        completed,
      });
    },
    [addSession]
  );

  // Recalcula o estado a partir do relógio real (phaseEndAtRef). Chamada a
  // cada segundo, quando o app volta ao primeiro plano e ao restaurar uma
  // fase salva. Se uma ou mais fases já terminaram (app em segundo plano ou
  // fechado), avança por todas elas, cada uma começando no fim da anterior.
  const recompute = useCallback(() => {
    for (let step = 0; step < MAX_PHASE_ADVANCES; step++) {
      const end = phaseEndAtRef.current;
      if (end === null) return;

      const remaining = end - Date.now();
      if (remaining > 0) {
        setRemainingMs(remaining);
        return;
      }

      const current = phaseRef.current;
      if (current === "focus") {
        // Foco completado: conta a bolinha e soma o tempo na rodada. Ao
        // completar a rodada (ex: 5 focos), dispara a parabenização com o
        // tempo total e começa uma rodada nova (bolinhas zeram).
        const count = completedTodayRef.current + 1;
        const sessionMs = phaseDurationRef.current || durationForPhase("focus", settings);
        const roundMs = roundFocusMsRef.current + sessionMs;
        recordPhase("focus", end, sessionMs, true);

        if (count % STREAK_DOT_COUNT === 0) {
          // Rodada completa: SEM pausa. O timer para e fica no estado de
          // "concluído" (check grande no círculo + parabéns) até o usuário
          // tocar em "Continuar" (dismissCelebration), que volta ao início.
          setCelebration({ sessions: STREAK_DOT_COUNT, focusMs: roundMs });
          persistProgress(count, 0);
          cycleCountRef.current = 0;
          goIdle();
          return;
        }
        persistProgress(count, roundMs);

        const nextCycle = cycleCountRef.current + 1;
        const isLongBreak = nextCycle >= settings.cyclesBeforeLongBreak;
        cycleCountRef.current = isLongBreak ? 0 : nextCycle;

        // A pausa começa no instante em que o foco terminou e leva o número
        // do foco que acabou.
        startPhase(isLongBreak ? "longBreak" : "shortBreak", phaseCycleNumberRef.current, end);
        continue;
      }

      // Pausa (curta ou longa) terminou — registra e volta pro estado
      // ocioso, esperando o usuário tocar para iniciar o próximo foco.
      if (current !== "idle") {
        recordPhase(
          current,
          end,
          phaseDurationRef.current || durationForPhase(current, settings),
          true
        );
      }
      goIdle();
      return;
    }
  }, [settings, recordPhase, persistProgress, startPhase, goIdle]);

  // Ao abrir o app: carrega o progresso do dia e, depois, a fase que estava
  // em andamento (se houver), avançando o que tiver terminado enquanto o
  // app estava fechado. Espera as configurações carregarem, porque as
  // durações das próximas fases vêm delas.
  useEffect(() => {
    if (!settingsLoaded || restoredRef.current) return;
    restoredRef.current = true;

    (async () => {
      const today = getTodayKey();
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const saved = raw ? (JSON.parse(raw) as PomodoroDailyProgress) : null;
        if (saved && saved.lastActiveDate === today) {
          completedTodayRef.current = saved.completedToday;
          roundFocusMsRef.current = saved.roundFocusMs ?? 0;
          setCompletedToday(saved.completedToday);
        } else {
          persistProgress(0, 0);
        }
      } catch (error) {
        console.warn("[pomodoro] falha ao ler o progresso do dia", error);
      }

      try {
        const raw = await AsyncStorage.getItem(RUNNING_KEY);
        const saved: unknown = raw ? JSON.parse(raw) : null;
        // Se o usuário já iniciou algo enquanto a leitura acontecia, vale o
        // que ele fez.
        if (!isSavedRunningState(saved) || phaseRef.current !== "idle") return;

        phaseDurationRef.current = saved.durationMs;
        phaseStartedAtRef.current = saved.startedAt;
        phaseCycleNumberRef.current = saved.cycleNumber;
        cycleCountRef.current = saved.cycleCount;
        applyPhase(saved.phase);
        if (saved.isRunning && saved.phaseEndAt !== null) {
          phaseEndAtRef.current = saved.phaseEndAt;
          setIsRunning(true);
          recompute();
        } else {
          phaseEndAtRef.current = null;
          setRemainingMs(saved.remainingMs);
          setIsRunning(false);
        }
      } catch (error) {
        console.warn("[pomodoro] falha ao restaurar a fase em andamento", error);
      }
    })();
  }, [settingsLoaded, persistProgress, applyPhase, recompute]);

  // Avisos do Pomodoro: reagendados sempre que a fase começa, pausa,
  // retoma ou termina. Rodando, agenda o fim da fase (e, no foco, o fim da
  // pausa seguinte); pausado ou parado, cancela. As refs já estão
  // atualizadas quando este efeito roda (são escritas antes dos setState).
  useEffect(() => {
    const end = phaseEndAtRef.current;
    if (phase === "idle" || !isRunning || end === null) {
      cancelPomodoroNotifications();
      return;
    }

    const requestPermission = askPermissionRef.current;
    askPermissionRef.current = false;

    if (phase !== "focus") {
      schedulePomodoroNotifications(
        {
          phase,
          phaseEndAt: end,
          nextBreak: null,
          round: null,
          soundEnabled: settings.soundEnabled,
        },
        { requestPermission }
      );
      return;
    }

    const focusMs = phaseDurationRef.current;
    const completesRound = (completedTodayRef.current + 1) % STREAK_DOT_COUNT === 0;
    const nextCycle = cycleCountRef.current + 1;
    const nextBreakPhase =
      nextCycle >= settings.cyclesBeforeLongBreak ? "longBreak" : "shortBreak";
    schedulePomodoroNotifications(
      {
        phase,
        phaseEndAt: end,
        nextBreak: completesRound
          ? null
          : { phase: nextBreakPhase, durationMs: durationForPhase(nextBreakPhase, settings) },
        round: completesRound
          ? { sessions: STREAK_DOT_COUNT, focusMs: roundFocusMsRef.current + focusMs }
          : null,
        soundEnabled: settings.soundEnabled,
      },
      { requestPermission }
    );
  }, [phase, isRunning, settings]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(recompute, 1000);
    return () => clearInterval(interval);
  }, [isRunning, recompute]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") recompute();
    });
    return () => subscription.remove();
  }, [recompute]);

  const toggle = useCallback(() => {
    if (phase === "idle") {
      // Posição deste foco no ciclo até a pausa longa (1, 2, ...). É aqui
      // que o app pede a permissão de notificação, se ainda não tiver.
      askPermissionRef.current = true;
      startPhase("focus", cycleCountRef.current + 1);
      return;
    }

    if (isRunning) {
      // Pausa: congela o tempo restante atual.
      const remaining =
        phaseEndAtRef.current !== null
          ? Math.max(0, phaseEndAtRef.current - Date.now())
          : remainingMs;
      setRemainingMs(remaining);
      phaseEndAtRef.current = null;
      setIsRunning(false);
      saveRunning(false, remaining);
      return;
    }

    // Retoma de onde parou.
    phaseEndAtRef.current = Date.now() + remainingMs;
    setIsRunning(true);
    saveRunning(true, remainingMs);
  }, [phase, isRunning, remainingMs, startPhase, saveRunning]);

  // Toque longo: cancela a sessão atual sem contar como completada — não
  // altera completedToday nem o ciclo.
  const cancel = useCallback(() => {
    // Foco ou pausa cancelados: entram no histórico como não completados,
    // com o tempo que chegou a ser feito (cancelamentos quase imediatos, não).
    if (phase !== "idle") {
      const remaining =
        isRunning && phaseEndAtRef.current !== null
          ? Math.max(0, phaseEndAtRef.current - Date.now())
          : remainingMs;
      const doneMs = phaseDurationRef.current - remaining;
      if (doneMs >= 1000) recordPhase(phase, Date.now(), doneMs, false);
    }
    goIdle();
  }, [phase, isRunning, remainingMs, recordPhase, goIdle]);

  const dismissCelebration = useCallback(() => setCelebration(null), []);

  const roundCompleted = completedToday % STREAK_DOT_COUNT;

  const value = useMemo(
    () => ({
      phase,
      isRunning,
      remainingMs,
      completedToday,
      roundCompleted,
      celebration,
      dismissCelebration,
      toggle,
      cancel,
    }),
    [
      phase,
      isRunning,
      remainingMs,
      completedToday,
      roundCompleted,
      celebration,
      dismissCelebration,
      toggle,
      cancel,
    ]
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error("usePomodoro precisa ser usado dentro de um PomodoroProvider");
  }
  return context;
}
