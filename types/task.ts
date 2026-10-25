export type TaskPriority = "baixa" | "media" | "urgente";

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  subjectId: string | null;
  done: boolean;
  createdAt: number;
  // Quando foi marcada como concluída (ausente se pendente ou concluída
  // antes deste campo existir).
  completedAt?: number;
}

// Registro de uma tarefa concluída, mostrado no histórico. Fica salvo à
// parte da lista de tarefas, então continua no histórico mesmo depois de a
// tarefa ser apagada pela lixeira. O título é uma cópia do momento da
// conclusão (usada quando a tarefa já não existe mais).
export interface TaskCompletion {
  id: string;
  taskId: string;
  title: string;
  subjectId: string | null;
  completedAt: number;
}
