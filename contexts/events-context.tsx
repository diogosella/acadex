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

import {
  cancelEventNotification,
  ensureNotificationPermissions,
  scheduleEventNotification,
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
  addEvent: (input: NewEventInput) => Promise<void>;
  deleteEvent: (id: string) => void;
  getEventsForDate: (dateKey: string) => CalendarEvent[];
};

const EventsContext = createContext<EventsContextValue | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega os eventos salvos uma única vez ao iniciar o app, e já
  // aproveita para pedir permissão de notificação (nativo apenas).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setEvents(JSON.parse(raw));
        }
      })
      .finally(() => setIsLoaded(true));
    ensureNotificationPermissions();
  }, []);

  // Persiste toda vez que a lista de eventos mudar (depois do load inicial).
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events, isLoaded]);

  const addEvent = useCallback(async (input: NewEventInput) => {
    const notificationId = await scheduleEventNotification({
      title: input.title,
      date: input.date,
      time: input.time,
      notifyBeforeMinutes: input.notifyBeforeMinutes,
    });

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: input.title,
      date: input.date,
      time: input.time,
      notifyBeforeMinutes: input.notifyBeforeMinutes,
      notificationId,
      createdAt: Date.now(),
    };
    setEvents((prev) => [...prev, newEvent]);
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const target = prev.find((event) => event.id === id);
      if (target?.notificationId) {
        cancelEventNotification(target.notificationId);
      }
      return prev.filter((event) => event.id !== id);
    });
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
