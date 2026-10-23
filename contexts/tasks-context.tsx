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
import { Task, TaskPriority } from "@/types/task";

const STORAGE_KEY = "acadex:tasks";

type NewTaskInput = {
  title: string;
  priority: TaskPriority;
  subjectId: string | null;
};

type TasksContextValue = {
  tasks: Task[];
  addTask: (input: NewTaskInput) => void;
  toggleTaskDone: (id: string) => void;
  deleteTask: (id: string) => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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

  const toggleTaskDone = useCallback((id: string) => {
    setRawTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    );
  }, []);

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
    () => ({ tasks, addTask, toggleTaskDone, deleteTask }),
    [tasks, addTask, toggleTaskDone, deleteTask]
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
