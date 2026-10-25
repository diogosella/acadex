import { getDaysInMonth, getWeekdayShort, toDateKey } from "@/constants/event-options";
import { CalendarEvent } from "@/types/event";
import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import DayRow from "./DayRow";

type CalendarListProps = {
  year: number;
  month: number; // 0-indexado
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  onAddEvent: (dateKey: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
};

export default function CalendarList({
  year,
  month,
  events,
  isCurrentMonth,
  onAddEvent,
  onEditEvent,
}: CalendarListProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const today = new Date().getDate();

  // No mês atual, dias já passados nem aparecem na lista — só a partir de
  // hoje em diante. Meses futuros mostram todos os dias normalmente.
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
    (day) => !isCurrentMonth || day >= today
  );

  // Agrupa os eventos por dia uma vez só (em vez de filtrar a lista inteira
  // para cada dia) e ordena por horário dentro de cada dia.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date);
      if (list) list.push(event);
      else map.set(event.date, [event]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [events]);

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {days.map((day) => {
        const dateKey = toDateKey(year, month, day);
        return (
          <DayRow
            key={dateKey}
            day={day}
            weekday={getWeekdayShort(year, month, day)}
            dateKey={dateKey}
            events={eventsByDate.get(dateKey) ?? NO_EVENTS}
            isToday={isCurrentMonth && day === today}
            onAddEvent={onAddEvent}
            onEditEvent={onEditEvent}
          />
        );
      })}
    </ScrollView>
  );
}

// Referência estável para dias sem eventos, para o memo do DayRow funcionar.
const NO_EVENTS: CalendarEvent[] = [];

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
});
