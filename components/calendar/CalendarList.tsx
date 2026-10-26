import { getDaysInMonth, getWeekdayShort, toDateKey } from "@/constants/event-options";
import { CalendarEvent } from "@/types/event";
import { useMemo, useRef } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from "react-native";
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

  // O mês aparece inteiro (doc 3.3.3: "os dias do mês"). No mês atual, os
  // dias que já passaram ficam esmaecidos e sem o "+", e a lista já abre
  // rolada até hoje.
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const scrollRef = useRef<ScrollView>(null);
  const didScrollToToday = useRef(false);
  const handleTodayLayout = (event: LayoutChangeEvent) => {
    if (didScrollToToday.current) return;
    didScrollToToday.current = true;
    // Um pedaço do dia anterior fica visível, indicando que há dias acima.
    const y = Math.max(0, event.nativeEvent.layout.y - TODAY_SCROLL_PEEK);
    scrollRef.current?.scrollTo({ y, animated: false });
  };

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
      ref={scrollRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {days.map((day) => {
        const dateKey = toDateKey(year, month, day);
        const isToday = isCurrentMonth && day === today;
        const row = (
          <DayRow
            key={dateKey}
            day={day}
            weekday={getWeekdayShort(year, month, day)}
            dateKey={dateKey}
            events={eventsByDate.get(dateKey) ?? NO_EVENTS}
            isToday={isToday}
            isPast={isCurrentMonth && day < today}
            onAddEvent={onAddEvent}
            onEditEvent={onEditEvent}
          />
        );
        // Só a linha de hoje é medida (para a rolagem inicial).
        return isToday ? (
          <View key={dateKey} onLayout={handleTodayLayout}>
            {row}
          </View>
        ) : (
          row
        );
      })}
    </ScrollView>
  );
}

// Quanto do dia anterior aparece acima de hoje ao abrir o mês atual.
const TODAY_SCROLL_PEEK = 28;

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
