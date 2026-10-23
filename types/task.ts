export type TaskPriority = "baixa" | "media" | "urgente";

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  subjectId: string | null;
  done: boolean;
  createdAt: number;
}
