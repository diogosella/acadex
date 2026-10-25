import { Colors, Fonts } from "@/constants/colors";
import { CalendarEvent } from "@/types/event";
import Ionicons from "@expo/vector-icons/Ionicons";
import { hapticSelection } from "@/lib/haptics";
import { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import EventItem from "./EventItem";

type DayRowProps = {
  day: number;
  weekday: string; // "SEG", "TER"...
  dateKey: string; // "YYYY-MM-DD"
  events: CalendarEvent[];
  isToday: boolean;
  onAddEvent: (dateKey: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
};

// Uma linha do Calendário: data à esquerda, eventos no meio e o botão de
// adicionar à direita.
//
// A linha inteira é a área de toque para criar um evento naquele dia (alvo
// grande, fácil de acertar com o dedo). O botão "+" é o indicador visual
// dessa ação e reage ao toque junto com a linha. Os chips de evento são
// Pressables próprios e, por estarem dentro, têm prioridade: tocar num
// evento abre a edição dele, não o formulário de criação.
function DayRow({
  day,
  weekday,
  dateKey,
  events,
  isToday,
  onAddEvent,
  onEditEvent,
}: DayRowProps) {
  const handlePress = () => {
    hapticSelection();
    onAddEvent(dateKey);
  };

  return (
    <Pressable
      onPress={handlePress}
      // Pequeno atraso no destaque: quem só está rolando a lista não vê a
      // linha "piscar". Um toque rápido continua abrindo o formulário.
      unstable_pressDelay={70}
      android_ripple={{ color: "#FFFFFF14" }}
      accessibilityRole="button"
      accessibilityLabel={`Adicionar evento no dia ${day}`}
      style={({ pressed }) => [
        styles.row,
        // No Android o ripple já dá o retorno visual; no iOS/web, escurece.
        pressed && Platform.OS !== "android" && styles.rowPressed,
      ]}
    >
      {({ pressed }) => (
        <>
          <View style={styles.dateColumn}>
            <Text style={[styles.dayNumber, isToday && styles.todayText]}>{day}</Text>
            <Text style={[styles.weekday, isToday && styles.todayText]}>{weekday}</Text>
          </View>

          <View style={styles.eventsColumn}>
            {events.map((event) => (
              <EventItem key={event.id} event={event} onPress={onEditEvent} />
            ))}
          </View>

          <View style={[styles.addButton, pressed && styles.addButtonPressed]}>
            <Ionicons name="add" size={22} color={Colors.text} />
          </View>
        </>
      )}
    </Pressable>
  );
}

export default memo(DayRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingVertical: 10,
    paddingLeft: 25,
    paddingRight: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowPressed: {
    backgroundColor: "#FFFFFF0D",
  },
  dateColumn: {
    width: 44,
    alignItems: "flex-start",
  },
  dayNumber: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 18,
  },
  weekday: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  todayText: {
    color: Colors.primary,
  },
  eventsColumn: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF0F",
    borderWidth: 1,
    borderColor: `${Colors.primary}66`,
  },
  addButtonPressed: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    transform: [{ scale: 0.92 }],
  },
});
