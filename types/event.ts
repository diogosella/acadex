export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  notifyBeforeMinutes: number | null; // null = não notificar
  notificationId: string | null; // id retornado pelo expo-notifications, para poder cancelar
  createdAt: number;
}
