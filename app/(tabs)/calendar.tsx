import CalendarList from "@/components/calendar/CalendarList";
import EventFormModal from "@/components/calendar/EventFormModal";
import Header from "@/components/ui/Header";
import { Colors, Fonts } from "@/constants/colors";
import { formatMonthLabel } from "@/constants/event-options";
import { useEvents } from "@/contexts/events-context";
import { CalendarEvent } from "@/types/event";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Quantos pixels de arrasto horizontal já contam como "troquei de mês" ao
// soltar o dedo (senão, volta pra posição original).
const SWIPE_COMMIT_RATIO = 0.25;
const SWIPE_ANIMATION_MS = 220;
const SNAP_BACK_ANIMATION_MS = 200;

function monthFromOffset(offset: number) {
  const now = new Date();
  const base = now.getFullYear() * 12 + now.getMonth() + offset;
  return {
    year: Math.floor(base / 12),
    month: ((base % 12) + 12) % 12,
  };
}

type MonthPaneProps = {
  offset: number;
  events: CalendarEvent[];
  width: number;
  onAddEvent: (dateKey: string) => void;
};

function MonthPane({ offset, events, width, onAddEvent }: MonthPaneProps) {
  const { year, month } = monthFromOffset(offset);
  const isCurrentMonth = offset === 0;

  const monthEvents = useMemo(() => {
    const prefix = `${year}-${(month + 1).toString().padStart(2, "0")}`;
    return events.filter((event) => event.date.startsWith(prefix));
  }, [events, year, month]);

  return (
    <View style={{ width, height: "100%" }}>
      <Text style={styles.monthName}>{formatMonthLabel(year, month)}</Text>
      <CalendarList
        year={year}
        month={month}
        events={monthEvents}
        isCurrentMonth={isCurrentMonth}
        onAddEvent={onAddEvent}
      />
    </View>
  );
}

export default function Calendar() {
  const { events } = useEvents();
  const { width } = useWindowDimensions();
  const [monthOffset, setMonthOffset] = useState(0);
  const [addEventDate, setAddEventDate] = useState<string | null>(null);

  const translateX = useSharedValue(0);

  const handleAddEvent = (dateKey: string) => setAddEventDate(dateKey);

  // Arrasto horizontal real: o mês atual acompanha o dedo, e o mês
  // vizinho (anterior ou seguinte, já renderizado do lado) vai aparecendo
  // conforme o arrasto avança — exatamente como um app de calendário
  // nativo. Ao soltar: se passou do limiar, completa a troca de mês; caso
  // contrário, volta suavemente pra posição original.
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      let tx = e.translationX;
      // Resistência (rubber band) ao tentar arrastar pra revelar um mês
      // anterior ao atual, que não existe.
      if (monthOffset === 0 && tx > 0) {
        tx = tx * 0.25;
      }
      translateX.value = tx;
    })
    .onEnd((e) => {
      const commitDistance = width * SWIPE_COMMIT_RATIO;
      const goNext = e.translationX < -commitDistance;
      const goPrev = e.translationX > commitDistance && monthOffset > 0;

      if (goNext) {
        const nextOffset = monthOffset + 1;
        translateX.value = withTiming(-width, { duration: SWIPE_ANIMATION_MS }, () => {
          translateX.value = 0;
          runOnJS(setMonthOffset)(nextOffset);
        });
      } else if (goPrev) {
        const nextOffset = monthOffset - 1;
        translateX.value = withTiming(width, { duration: SWIPE_ANIMATION_MS }, () => {
          translateX.value = 0;
          runOnJS(setMonthOffset)(nextOffset);
        });
      } else {
        translateX.value = withTiming(0, { duration: SNAP_BACK_ANIMATION_MS });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width + translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <Header title="Calendário" />

        {/* Indica ao usuário que a troca de mês é feita deslizando a tela
            (não há botões de seta funcionais — navegação é só por swipe). */}
        <View style={styles.swipeHint}>
          <Ionicons
            name="chevron-back"
            size={14}
            color="#FFFFFF60"
            style={monthOffset === 0 ? styles.swipeHintIconDisabled : undefined}
          />
          <Text style={styles.swipeHintText}>Deslize para mudar o mês</Text>
          <Ionicons name="chevron-forward" size={14} color="#FFFFFF60" />
        </View>

        <GestureDetector gesture={panGesture}>
          <View style={styles.swipeArea}>
            <Animated.View style={[styles.track, { width: width * 3 }, animatedStyle]}>
              {monthOffset > 0 ? (
                <MonthPane
                  offset={monthOffset - 1}
                  events={events}
                  width={width}
                  onAddEvent={handleAddEvent}
                />
              ) : (
                <View style={{ width }} />
              )}

              <MonthPane
                offset={monthOffset}
                events={events}
                width={width}
                onAddEvent={handleAddEvent}
              />

              <MonthPane
                offset={monthOffset + 1}
                events={events}
                width={width}
                onAddEvent={handleAddEvent}
              />
            </Animated.View>
          </View>
        </GestureDetector>
      </SafeAreaView>

      <EventFormModal
        visible={addEventDate !== null}
        date={addEventDate}
        onClose={() => setAddEventDate(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  swipeHintText: {
    color: "#FFFFFF60",
    fontFamily: Fonts.book,
    fontSize: 11,
  },
  swipeHintIconDisabled: {
    opacity: 0.35,
  },
  swipeArea: {
    flex: 1,
    overflow: "hidden",
  },
  track: {
    flex: 1,
    flexDirection: "row",
  },
  monthName: {
    marginLeft: 25,
    marginTop: 35,
    marginBottom: 35,
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
});
