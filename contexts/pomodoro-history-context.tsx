import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { PomodoroSession } from "@/types/pomodoro";

const STORAGE_KEY = "acadex:pomodoro-sessions";

// Histórico guardado: o mapa mostra 90 dias; um ano dá folga para o resumo
// sem deixar o armazenamento crescer para sempre.
const KEEP_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

type NewSessionInput = Omit<PomodoroSession, "id">;

type PomodoroHistoryContextValue = {
  sessions: PomodoroSession[]; // mais recentes primeiro
  addSession: (input: NewSessionInput) => void;
};

const PomodoroHistoryContext = createContext<PomodoroHistoryContextValue | undefined>(
  undefined
);

function isSession(value: unknown): value is PomodoroSession {
  const s = value as PomodoroSession;
  return (
    typeof s === "object" &&
    s !== null &&
    typeof s.id === "string" &&
    typeof s.startedAt === "number" &&
    typeof s.endedAt === "number" &&
    typeof s.durationMs === "number" &&
    typeof s.completed === "boolean"
  );
}

function prune(sessions: PomodoroSession[]): PomodoroSession[] {
  const cutoff = Date.now() - KEEP_DAYS * DAY_MS;
  return sessions.filter((session) => session.endedAt >= cutoff);
}

// Histórico de sessões Pomodoro (classe "Sessão Pomodoro"). O
// PomodoroProvider registra aqui cada foco completado ou cancelado; a tela
// de histórico (app/history.tsx) lê e resume.
export function PomodoroHistoryProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setSessions(prune(parsed.filter(isSession)));
      })
      .catch((error) => console.warn("[histórico] falha ao ler as sessões", error))
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions, isLoaded]);

  const addSession = useCallback((input: NewSessionInput) => {
    const session: PomodoroSession = { id: `${input.endedAt}-${input.startedAt}`, ...input };
    setSessions((prev) => [session, ...prev]);
  }, []);

  const value = useMemo(() => ({ sessions, addSession }), [sessions, addSession]);

  return (
    <PomodoroHistoryContext.Provider value={value}>{children}</PomodoroHistoryContext.Provider>
  );
}

export function usePomodoroHistory() {
  const context = useContext(PomodoroHistoryContext);
  if (!context) {
    throw new Error("usePomodoroHistory precisa ser usado dentro de um PomodoroHistoryProvider");
  }
  return context;
}
