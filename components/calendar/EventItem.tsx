import { Colors, Fonts } from "@/constants/colors";
import { hapticSelection } from "@/lib/haptics";
import { CalendarEvent } from "@/types/event";
import { Pressable, StyleSheet, Text } from "react-native";

type EventItemProps = {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
};

// Chip de evento na linha do dia. Tocar abre o formulário de edição (onde
// também dá para excluir).
export default function EventItem({ event, onPress }: EventItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      onPress={() => {
        hapticSelection();
        onPress(event);
      }}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`Editar evento ${event.title} às ${event.time}`}
    >
      <Text style={styles.chipTime}>{event.time}</Text>
      <Text style={styles.chipTitle} numberOfLines={1}>
        {event.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 30,
    backgroundColor: `${Colors.primary}37`,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  chipPressed: {
    backgroundColor: `${Colors.primary}66`,
  },
  chipTime: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  chipTitle: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 12,
    flexShrink: 1,
  },
});
