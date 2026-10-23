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
  CYCLES_BEFORE_LONG_BREAK,
  FOCUS_DURATION_MS,
  LONG_BREAK_DURATION_MS,
  SHORT_BREAK_DURATION_MS,
  getTodayKey,
} from "@/constants/pomodoro-options";
import { PomodoroDailyProgress, PomodoroPhase } from "@/types/pomodoro";

const STORAGE_KEY = "acadex:pomodoro-progress";

type PomodoroContextValue = {
  phase: PomodoroPhase;
  isRunning: boolean;
  remainingMs: number;
  completedToday: number;
  toggle: () => void;
  cancel: () => void;
};

const PomodoroContext = createContext<PomodoroContextValue | undefined>(undefined);

function durationForPhase(phase: PomodoroPhase): number {
  switch (phase) {
    case "focus":
      return FOCUS_DURATION_MS;
    case "shortBreak":
      return SHORT_BREAK_DURATION_MS;
    case "longBreak":
      return LONG_BREAK_DURATION_MS;
    default:
      return 0;
  }
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);

  // Ciclo de foco atual (0..CYCLES_BEFORE_LONG_BREAK-1); só em memória —
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
          return;
        }
      }
      setCompletedToday(0);
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ completedToday: 0, lastActiveDate: today })
      );
    });
  }, []);

  const persistCompletedToday = useCallback((value: number) => {
    setCompletedToday(value);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completedToday: value, lastActiveDate: getTodayKey() })
    );
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
      persistCompletedToday(completedToday + 1);

      const nextCycle = cycleCountRef.current + 1;
      const isLongBreak = nextCycle >= CYCLES_BEFORE_LONG_BREAK;
      cycleCountRef.current = isLongBreak ? 0 : nextCycle;

      const nextPhase: PomodoroPhase = isLongBreak ? "longBreak" : "shortBreak";
      const duration = durationForPhase(nextPhase);
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

  const recomputeRef = useRef(recompute);
  recomputeRef.current = recompute;

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
      const duration = FOCUS_DURATION_MS;
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
  }, [phase, isRunning, remainingMs]);

  // Toque longo: cancela a sessão atual sem contar como completada — não
  // altera completedToday nem o ciclo.
  const cancel = useCallback(() => {
    phaseEndAtRef.current = null;
    setPhase("idle");
    setRemainingMs(0);
    setIsRunning(false);
  }, []);

  const value = useMemo(
    () => ({ phase, isRunning, remainingMs, completedToday, toggle, cancel }),
    [phase, isRunning, remainingMs, completedToday, toggle, cancel]
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
