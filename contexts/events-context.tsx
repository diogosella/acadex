import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  cancelEventNotification,
  scheduleEventNotification,
  ScheduleEventNotificationResult,
  syncEventNotifications,
} from "@/lib/event-notifications";
import { CalendarEvent } from "@/types/event";

const STORAGE_KEY = "acadex:events";

type NewEventInput = {
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  notifyBeforeMinutes: number | null;
};

type EventsContextValue = {
  events: CalendarEvent[];
  addEvent: (input: NewEventInput) => Promise<ScheduleEventNotificationResult>;
  deleteEvent: (id: string) => void;
  getEventsForDate: (dateKey: string) => CalendarEvent[];
};

const EventsContext = createContext<EventsContextValue | undefined>(undefined);

// Eventos salvos por versões anteriores tinham um campo `notificationId`
// (hoje o id da notificação é derivado do id do evento). Aqui só os campos
// atuais são mantidos, então o campo antigo é descartado no próximo save.
function normalizeStoredEvent(raw: CalendarEvent): CalendarEvent {
  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    time: raw.time,
    notifyBeforeMinutes: raw.notifyBeforeMinutes ?? null,
    createdAt: raw.createdAt,
  };
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cópia sempre atual da lista, para callbacks assíncronos (ex: depois que
  // o usuário responde o pedido de permissão) enxergarem o estado mais novo.
  const eventsRef = useRef<CalendarEvent[]>([]);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Carrega os eventos salvos uma única vez ao iniciar o app e reconcilia
  // as notificações agendadas no aparelho com eles (sem pedir permissão).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const loaded: CalendarEvent[] = raw
          ? (JSON.parse(raw) as CalendarEvent[]).map(normalizeStoredEvent)
          : [];
        setEvents(loaded);
        syncEventNotifications(loaded);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // Persiste toda vez que a lista de eventos mudar (depois do load inicial).
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events, isLoaded]);

  const addEvent = useCallback(async (input: NewEventInput) => {
    const now = Date.now();
    const newEvent: CalendarEvent = {
      id: now.toString(),
      title: input.title,
      date: input.date,
      time: input.time,
      notifyBeforeMinutes: input.notifyBeforeMinutes,
      createdAt: now,
    };
    setEvents((prev) => [...prev, newEvent]);

    // Pede a permissão aqui (e não ao abrir o app): é quando o usuário
    // acabou de pedir um aviso, então o diálogo do sistema faz sentido.
    const result = await scheduleEventNotification(newEvent, { requestPermission: true });

    // Se a permissão acabou de ser concedida, agenda também os avisos de
    // eventos antigos que ficaram sem notificação.
    if (result.scheduled) {
      const others = eventsRef.current.filter((event) => event.id !== newEvent.id);
      syncEventNotifications([...others, newEvent]);
    }

    return result;
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
    cancelEventNotification(id);
  }, []);

  const getEventsForDate = useCallback(
    (dateKey: string) => events.filter((event) => event.date === dateKey),
    [events]
  );

  const value = useMemo(
    () => ({ events, addEvent, deleteEvent, getEventsForDate }),
    [events, addEvent, deleteEvent, getEventsForDate]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents precisa ser usado dentro de um EventsProvider");
  }
  return context;
}
