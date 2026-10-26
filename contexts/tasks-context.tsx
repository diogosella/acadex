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

import { computeRemindAt, PRIORITY_RANK } from "@/constants/task-options";
import {
  cancelTaskReminder,
  scheduleTaskReminder,
  syncTaskReminders,
} from "@/lib/task-notifications";
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
  dueDate: string | null; // "YYYY-MM-DD"
  remindDaysBefore: number | null;
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
          const loaded: Task[] = JSON.parse(raw);
          setRawTasks(loaded);
          // Reconcilia os lembretes agendados no aparelho com as tarefas.
          syncTaskReminders(loaded);
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
    const now = Date.now();
    const newTask: Task = {
      id: now.toString(),
      title: input.title,
      priority: input.priority,
      subjectId: input.subjectId,
      done: false,
      createdAt: now,
      dueDate: input.dueDate,
      remindDaysBefore: input.dueDate ? input.remindDaysBefore : null,
      remindAt: computeRemindAt(input.dueDate, input.remindDaysBefore, now),
    };
    setRawTasks((prev) => [...prev, newTask]);
    // Pede a permissão aqui: o usuário acabou de pedir um lembrete.
    if (newTask.remindAt !== null) scheduleTaskReminder(newTask, { requestPermission: true });
  }, []);

  // Edição: título, prioridade, assunto, entrega e lembrete. O momento do
  // lembrete só é recalculado se a data ou o lembrete mudaram. Se a tarefa
  // já está no histórico (concluída), o registro acompanha a mudança.
  const updateTask = useCallback(
    (id: string, input: NewTaskInput) => {
      const current = rawTasks.find((task) => task.id === id);
      if (!current) return;

      const remindDaysBefore = input.dueDate ? input.remindDaysBefore : null;
      const timingChanged =
        (current.dueDate ?? null) !== input.dueDate ||
        (current.remindDaysBefore ?? null) !== remindDaysBefore;
      const updated: Task = {
        ...current,
        title: input.title,
        priority: input.priority,
        subjectId: input.subjectId,
        dueDate: input.dueDate,
        remindDaysBefore,
        remindAt: timingChanged
          ? computeRemindAt(input.dueDate, remindDaysBefore)
          : (current.remindAt ?? null),
      };

      setRawTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
      // Reagenda (o título do aviso pode ter mudado) ou cancela.
      scheduleTaskReminder(updated, { requestPermission: updated.remindAt !== null });
      setCompletions((prev) =>
        prev.map((completion) =>
          completion.taskId === id
            ? { ...completion, title: input.title, subjectId: input.subjectId }
            : completion
        )
      );
    },
    [rawTasks]
  );

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
        // Voltou a ficar pendente: o lembrete volta, se ainda estiver no futuro.
        scheduleTaskReminder({ ...task, done: false });
        return;
      }

      cancelTaskReminder(id);

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
    cancelTaskReminder(id);
  }, []);

  // Lista derivada, sem afetar a ordem bruta que fica salva: prioridade
  // (urgente primeiro), depois entrega mais próxima (sem data por último) e
  // depois data de criação.
  const tasks = useMemo(() => {
    return [...rawTasks].sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      const dueA = a.dueDate ?? "9999-12-31";
      const dueB = b.dueDate ?? "9999-12-31";
      if (dueA !== dueB) return dueA < dueB ? -1 : 1;
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
