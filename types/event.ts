export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  notifyBeforeMinutes: number | null; // null = não notificar
  createdAt: number;
}
