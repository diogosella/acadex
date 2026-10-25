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
import { usePomodoroSettings } from "@/contexts/pomodoro-settings-context";
import {
  PomodoroDailyProgress,
  PomodoroPhase,
  PomodoroRoundCelebration,
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

export function PomodoroProvider({ children }: { children: ReactNode }) {
  // Durações e ciclos vêm da tela de configurações. Uma fase já em
  // andamento mantém o horário de término com que começou; as mudanças
  // valem a partir da próxima fase.
  const { settings } = usePomodoroSettings();
  // Cada foco completado ou cancelado vira uma "Sessão Pomodoro" no histórico.
  const { addSession } = usePomodoroHistory();
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [roundFocusMs, setRoundFocusMs] = useState(0);
  const [celebration, setCelebration] = useState<PomodoroRoundCelebration | null>(null);
  // Duração planejada do foco em andamento (para somar o tempo da rodada).
  const focusDurationRef = useRef(0);
  // Quando o foco em andamento começou (para o histórico).
  const focusStartedAtRef = useRef(0);

  // Ciclo de foco atual (0..cyclesBeforeLongBreak-1); só em memória —
  // não precisa persistir (ver decisão de escopo no plano).
  const cycleCountRef = useRef(0);
  // Timestamp (epoch ms) em que a fase atual termina. A contagem real é
  // sempre derivada dele (nunca de um decremento ingênuo por tick), pra
  // não desviar quando o timer "atrasa" — aba em segundo plano no
  // navegador, app em background no celular, etc.
  const phaseEndAtRef = useRef<number | null>(null);

  // Carrega o progresso do dia salvo uma única vez ao iniciar o app; se a
  // data salva não é mais hoje, já zera e persiste.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const today = getTodayKey();
      if (raw) {
        const saved = JSON.parse(raw) as PomodoroDailyProgress;
        if (saved.lastActiveDate === today) {
          setCompletedToday(saved.completedToday);
          setRoundFocusMs(saved.roundFocusMs ?? 0);
          return;
        }
      }
      setCompletedToday(0);
      setRoundFocusMs(0);
      const fresh: PomodoroDailyProgress = {
        completedToday: 0,
        lastActiveDate: today,
        roundFocusMs: 0,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    });
  }, []);

  const persistProgress = useCallback((count: number, roundMs: number) => {
    setCompletedToday(count);
    setRoundFocusMs(roundMs);
    const progress: PomodoroDailyProgress = {
      completedToday: count,
      lastActiveDate: getTodayKey(),
      roundFocusMs: roundMs,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, []);

  // Recalcula o estado a partir do relógio real (phaseEndAtRef), avançando
  // de fase automaticamente quando o tempo já esgotou. Chamada a cada tick
  // do interval e também quando o app volta ao foreground (AppState).
  // Não é memoizada com useCallback de propósito: é redefinida a cada
  // render (sempre vendo `phase`/`completedToday` atuais) e guardada numa
  // ref logo abaixo, que é o que o interval de fato chama.
  function recompute() {
    if (phaseEndAtRef.current === null) return;

    const remaining = phaseEndAtRef.current - Date.now();
    if (remaining > 0) {
      setRemainingMs(remaining);
      return;
    }

    if (phase === "focus") {
      // Foco completado: conta a bolinha e soma o tempo na rodada. Ao
      // completar a rodada (ex: 5 focos), dispara a parabenização com o
      // tempo total e começa uma rodada nova (bolinhas zeram).
      const count = completedToday + 1;
      const sessionMs = focusDurationRef.current || durationForPhase("focus", settings);
      const roundMs = roundFocusMs + sessionMs;
      const endedAt = phaseEndAtRef.current;
      addSession({
        startedAt: focusStartedAtRef.current || endedAt - sessionMs,
        endedAt,
        durationMs: sessionMs,
        completed: true,
      });
      if (count % STREAK_DOT_COUNT === 0) {
        // Rodada completa: SEM pausa. O timer para e fica no estado de
        // "concluído" (check grande no círculo + parabéns) até o usuário
        // tocar em "Continuar" (dismissCelebration), que volta ao início.
        setCelebration({ sessions: STREAK_DOT_COUNT, focusMs: roundMs });
        persistProgress(count, 0);
        cycleCountRef.current = 0;
        phaseEndAtRef.current = null;
        setPhase("idle");
        setRemainingMs(0);
        setIsRunning(false);
        return;
      }
      persistProgress(count, roundMs);

      const nextCycle = cycleCountRef.current + 1;
      const isLongBreak = nextCycle >= settings.cyclesBeforeLongBreak;
      cycleCountRef.current = isLongBreak ? 0 : nextCycle;

      const nextPhase: PomodoroPhase = isLongBreak ? "longBreak" : "shortBreak";
      const duration = durationForPhase(nextPhase, settings);
      phaseEndAtRef.current = Date.now() + duration;
      setPhase(nextPhase);
      setRemainingMs(duration);
      setIsRunning(true);
      return;
    }

    // Pausa (curta ou longa) terminou — volta pro estado ocioso, esperando
    // o usuário tocar para iniciar o próximo foco.
    phaseEndAtRef.current = null;
    setPhase("idle");
    setRemainingMs(0);
    setIsRunning(false);
  }

  // Atualizada depois de cada render (e não durante o render, que o React
  // não permite), para o interval sempre chamar a versão mais nova.
  const recomputeRef = useRef(recompute);
  useEffect(() => {
    recomputeRef.current = recompute;
  });

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => recomputeRef.current(), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") recomputeRef.current();
    });
    return () => subscription.remove();
  }, []);

  const toggle = useCallback(() => {
    if (phase === "idle") {
      const duration = durationForPhase("focus", settings);
      focusDurationRef.current = duration;
      focusStartedAtRef.current = Date.now();
      phaseEndAtRef.current = Date.now() + duration;
      setPhase("focus");
      setRemainingMs(duration);
      setIsRunning(true);
      return;
    }

    if (isRunning) {
      // Pausa: congela o tempo restante atual.
      if (phaseEndAtRef.current !== null) {
        setRemainingMs(Math.max(0, phaseEndAtRef.current - Date.now()));
      }
      phaseEndAtRef.current = null;
      setIsRunning(false);
      return;
    }

    // Retoma de onde parou.
    phaseEndAtRef.current = Date.now() + remainingMs;
    setIsRunning(true);
  }, [phase, isRunning, remainingMs, settings]);

  // Toque longo: cancela a sessão atual sem contar como completada — não
  // altera completedToday nem o ciclo.
  const cancel = useCallback(() => {
    // Foco cancelado: entra no histórico como não completado, com o tempo
    // de foco que chegou a ser feito (cancelamentos quase imediatos, não).
    if (phase === "focus") {
      const remaining =
        isRunning && phaseEndAtRef.current !== null
          ? Math.max(0, phaseEndAtRef.current - Date.now())
          : remainingMs;
      const focusedMs = focusDurationRef.current - remaining;
      if (focusedMs >= 1000) {
        addSession({
          startedAt: focusStartedAtRef.current,
          endedAt: Date.now(),
          durationMs: focusedMs,
          completed: false,
        });
      }
    }
    phaseEndAtRef.current = null;
    setPhase("idle");
    setRemainingMs(0);
    setIsRunning(false);
  }, [phase, isRunning, remainingMs, addSession]);

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
