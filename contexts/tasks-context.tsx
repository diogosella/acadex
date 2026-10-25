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

import { PRIORITY_RANK } from "@/constants/task-options";
import { Task, TaskCompletion, TaskPriority } from "@/types/task";

const STORAGE_KEY = "acadex:tasks";
const COMPLETIONS_KEY = "acadex:task-completions";

// Mesmo prazo do histórico do Pomodoro.
const KEEP_COMPLETIONS_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

function isCompletion(value: unknown): value is TaskCompletion {
  const c = value as TaskCompletion;
  return (
    typeof c === "object" &&
    c !== null &&
    typeof c.id === "string" &&
    typeof c.taskId === "string" &&
    typeof c.title === "string" &&
    typeof c.completedAt === "number"
  );
}

export type NewTaskInput = {
  title: string;
  priority: TaskPriority;
  subjectId: string | null;
};

type TasksContextValue = {
  tasks: Task[];
  // Tarefas concluídas, mais recentes primeiro (para o histórico).
  completions: TaskCompletion[];
  addTask: (input: NewTaskInput) => void;
  updateTask: (id: string, input: NewTaskInput) => void;
  toggleTaskDone: (id: string) => void;
  deleteTask: (id: string) => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [completionsLoaded, setCompletionsLoaded] = useState(false);

  // Carrega as tarefas salvas uma única vez ao iniciar o app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setRawTasks(JSON.parse(raw));
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // Persiste toda vez que a lista de tarefas mudar (depois do load inicial).
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rawTasks));
  }, [rawTasks, isLoaded]);

  useEffect(() => {
    AsyncStorage.getItem(COMPLETIONS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const cutoff = Date.now() - KEEP_COMPLETIONS_DAYS * DAY_MS;
        setCompletions(parsed.filter(isCompletion).filter((c) => c.completedAt >= cutoff));
      })
      .catch((error) => console.warn("[tarefas] falha ao ler as conclusões", error))
      .finally(() => setCompletionsLoaded(true));
  }, []);

  useEffect(() => {
    if (!completionsLoaded) return;
    AsyncStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
  }, [completions, completionsLoaded]);

  const addTask = useCallback((input: NewTaskInput) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: input.title,
      priority: input.priority,
      subjectId: input.subjectId,
      done: false,
      createdAt: Date.now(),
    };
    setRawTasks((prev) => [...prev, newTask]);
  }, []);

  // Edição: título, prioridade e assunto. Se a tarefa já está no histórico
  // (concluída), o registro acompanha a mudança.
  const updateTask = useCallback((id: string, input: NewTaskInput) => {
    setRawTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, title: input.title, priority: input.priority, subjectId: input.subjectId }
          : task
      )
    );
    setCompletions((prev) =>
      prev.map((completion) =>
        completion.taskId === id
          ? { ...completion, title: input.title, subjectId: input.subjectId }
          : completion
      )
    );
  }, []);

  // Marcar: guarda a data de conclusão e registra no histórico.
  // Desmarcar: tira a data e o registro (foi engano ou a tarefa voltou).
  // Os updaters são idempotentes (podem rodar duas vezes em modo estrito).
  const toggleTaskDone = useCallback(
    (id: string) => {
      const task = rawTasks.find((item) => item.id === id);
      if (!task) return;

      if (task.done) {
        setRawTasks((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, done: false, completedAt: undefined } : item
          )
        );
        setCompletions((prev) => prev.filter((completion) => completion.taskId !== id));
        return;
      }

      const completedAt = Date.now();
      setRawTasks((prev) =>
        prev.map((item) => (item.id === id ? { ...item, done: true, completedAt } : item))
      );
      setCompletions((prev) =>
        prev.some((completion) => completion.taskId === id)
          ? prev
          : [
              {
                id: `${id}-${completedAt}`,
                taskId: id,
                title: task.title,
                subjectId: task.subjectId,
                completedAt,
              },
              ...prev,
            ]
      );
    },
    [rawTasks]
  );

  const deleteTask = useCallback((id: string) => {
    setRawTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  // Lista derivada, ordenada por prioridade (urgente primeiro) e depois por
  // data de criação, sem afetar a ordem bruta que fica salva.
  const tasks = useMemo(() => {
    return [...rawTasks].sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      return a.createdAt - b.createdAt;
    });
  }, [rawTasks]);

  const value = useMemo(
    () => ({ tasks, completions, addTask, updateTask, toggleTaskDone, deleteTask }),
    [tasks, completions, addTask, updateTask, toggleTaskDone, deleteTask]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasks precisa ser usado dentro de um TasksProvider");
  }
  return context;
}
