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
  // Data de entrega ("YYYY-MM-DD"); null/ausente = sem data.
  dueDate?: string | null;
  // Lembrete: quantos dias antes da entrega avisar (0 = no dia), às
  // TASK_REMINDER_HOUR. null/ausente = sem lembrete. -1 só existe em
  // desenvolvimento ("em 1 minuto", para testar).
  remindDaysBefore?: number | null;
  // Momento do lembrete (timestamp), calculado ao salvar a partir dos dois
  // campos acima. É o que a notificação agendada usa.
  remindAt?: number | null;
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
