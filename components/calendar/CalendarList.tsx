import { Colors, Fonts } from "@/constants/colors";
import { getDaysInMonth, toDateKey } from "@/constants/event-options";
import { CalendarEvent } from "@/types/event";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import EventItem from "./EventItem";

type CalendarListProps = {
  year: number;
  month: number; // 0-indexado
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  onAddEvent: (dateKey: string) => void;
};

export default function CalendarList({
  year,
  month,
  events,
  isCurrentMonth,
  onAddEvent,
}: CalendarListProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const today = new Date().getDate();

  // No mês atual, dias já passados nem aparecem na lista — só a partir de
  // hoje em diante. Meses futuros mostram todos os dias normalmente.
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
    (day) => !isCurrentMonth || day >= today
  );

  return (
    <ScrollView style={styles.calendarComponent}>
      {days.map((day) => {
        const dateKey = toDateKey(year, month, day);
        const dayEvents = events.filter((event) => event.date === dateKey);

        return (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.calendarDay}>{day}</Text>

            {dayEvents.length > 0 && (
              <View style={styles.eventsList}>
                {dayEvents.map((event) => (
                  <EventItem key={event.id} event={event} />
                ))}
              </View>
            )}

            <Text style={styles.addButton} onPress={() => onAddEvent(dateKey)}>
              +
            </Text>

            <View style={styles.hrLine} />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  calendarComponent: {
    flex: 1,
    overflowY: "auto",
  },
  dayContainer: {
    flexDirection: "column",
    marginTop: 20,
  },
  calendarDay: {
    color: Colors.text,
    marginLeft: 25,
    fontFamily: Fonts.bold,
  },
  eventsList: {
    marginLeft: 25,
    marginTop: 4,
    marginRight: 35,
  },
  hrLine: {
    width: "85%",
    alignSelf: "center",
    borderTopWidth: 0.2,
    borderTopColor: Colors.border,
  },
  addButton: {
    color: Colors.text,
    alignSelf: "flex-end",
    fontSize: 18,
    marginRight: 35,
    marginTop: 8,
    marginBottom: 12,
  },
});
