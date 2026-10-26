// Enum TipoNotificacao do diagrama de classes (+ TAREFA, para os lembretes
// de entrega das tarefas).
export type NotificationType = "EVENTO" | "TAREFA" | "POMODORO";

// Classe Notificacao do diagrama: um aviso agendado pelo app. O aviso em si
// é entregue pelo sistema do celular; este registro guarda os dados dele
// (lib/notification-registry.ts).
export interface AppNotification {
  // Identificador do aviso no sistema ("event:…", "task:…", "pomodoro:…").
  // Um pendente por id; os do Pomodoro se repetem entre sessões já enviadas.
  id: string;
  type: NotificationType; // tipo (TipoNotificacao)
  title: string; // titulo
  message: string; // mensagem
  triggerAt: number; // dataHoraDisparo (epoch ms)
  sent: boolean; // enviada: o horário de disparo já passou (ou o app viu o aviso chegar)
  scheduledAt: number; // quando foi agendado
}
