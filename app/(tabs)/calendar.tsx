import CalendarList from "@/components/calendar/CalendarList";
import EventFormModal from "@/components/calendar/EventFormModal";
import Header from "@/components/ui/Header";
import { Colors, Fonts } from "@/constants/colors";
import { formatMonthLabel } from "@/constants/event-options";
import { useEvents } from "@/contexts/events-context";
import { CalendarEvent } from "@/types/event";
import Ionicons from "@expo/vector-icons/Ionicons";
import { hapticSelection } from "@/lib/haptics";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

// Arrasto mínimo (fração da largura) para trocar de mês ao soltar devagar.
const SWIPE_COMMIT_RATIO = 0.25;
// Velocidade (px/s) a partir da qual um "peteleco" curto já troca de mês.
const SWIPE_VELOCITY_THRESHOLD = 600;
// Resistência ao arrastar para antes do mês atual, que não existe.
const RUBBER_BAND = 0.25;
const PAGE_ANIMATION = { duration: 260, easing: Easing.out(Easing.cubic) };

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
  onEditEvent: (event: CalendarEvent) => void;
};

function MonthPane({ offset, events, width, onAddEvent, onEditEvent }: MonthPaneProps) {
  const { year, month } = monthFromOffset(offset);
  const isCurrentMonth = offset === 0;

  const monthEvents = useMemo(() => {
    const prefix = `${year}-${(month + 1).toString().padStart(2, "0")}`;
    return events.filter((event) => event.date.startsWith(prefix));
  }, [events, year, month]);

  return (
    // Cada mês fica numa posição fixa da "faixa": offset × largura. Como a
    // posição não depende de qual mês está selecionado, trocar o mês no
    // estado do React não move nada na tela (ver comentário no Calendar).
    <View style={[styles.pane, { width, left: offset * width }]}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthName}>{formatMonthLabel(year, month)}</Text>
        {/* Placeholder discreto: o mês vazio continua mostrando os dias
            (é neles que se cria o evento), só com uma dica de como usar. */}
        {monthEvents.length === 0 && (
          <Text style={styles.emptyMonthHint}>
            Nenhum evento · toque em um dia para adicionar
          </Text>
        )}
      </View>
      <CalendarList
        year={year}
        month={month}
        events={monthEvents}
        isCurrentMonth={isCurrentMonth}
        onAddEvent={onAddEvent}
        onEditEvent={onEditEvent}
      />
    </View>
  );
}

export default function Calendar() {
  const { events } = useEvents();
  const { width } = useWindowDimensions();
  const [monthOffset, setMonthOffset] = useState(0);
  const [addEventDate, setAddEventDate] = useState<string | null>(null);
  // Na primeira renderização monta só o mês visível; os vizinhos (usados
  // no swipe) entram no quadro seguinte. Deixa a montagem da tela mais
  // leve sem mudar nada do que aparece.
  const [neighborsReady, setNeighborsReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setNeighborsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Posição da faixa de meses, em "páginas" (0 = mês atual, 1 = próximo...).
  // Fica toda no thread de UI: o arrasto e a animação mexem só nela.
  //
  // Por que o nome do mês piscava antes: a faixa tinha sempre 3 meses
  // (anterior, atual, próximo) em posições relativas ao mês selecionado. No
  // fim da animação, a posição voltava para 0 na hora (thread de UI), mas a
  // troca de mês no React só chegava alguns quadros depois (thread de JS).
  // Nesse intervalo a tela mostrava de novo o mês antigo — o "flash".
  //
  // Agora cada mês tem posição absoluta na faixa, e a animação termina
  // exatamente sobre o mês novo. O estado do React só decide quais meses
  // vizinhos montar; o mês visível nunca é remontado nem reposicionado.
  const position = useSharedValue(0);
  const dragStart = useSharedValue(0);

  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const handleAddEvent = (dateKey: string) => setAddEventDate(dateKey);
  const handleEditEvent = (event: CalendarEvent) => setEditingEvent(event);
  const closeEventForm = () => {
    setAddEventDate(null);
    setEditingEvent(null);
  };

  const commitMonth = (offset: number) => {
    if (offset === monthOffset) return;
    hapticSelection();
    setMonthOffset(offset);
  };

  // Usado pelas setas: anima até o mês e atualiza o estado.
  const goToMonth = (offset: number) => {
    const target = Math.max(0, offset);
    // .set() em vez de .value: forma recomendada pelo Reanimated fora de
    // worklets quando o React Compiler está ativo (experiments.reactCompiler).
    position.set(withTiming(target, PAGE_ANIMATION));
    commitMonth(target);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onStart(() => {
      // Se uma animação ainda estiver rodando, o dedo "pega" a faixa onde
      // ela está, sem pulo.
      cancelAnimation(position);
      dragStart.value = position.value;
    })
    .onUpdate((e) => {
      let next = dragStart.value - e.translationX / width;
      if (next < 0) next *= RUBBER_BAND;
      position.value = next;
    })
    .onEnd((e) => {
      const base = Math.round(dragStart.value);
      const moved = dragStart.value - position.value; // > 0: arrastou p/ direita
      let target = base;

      if (e.velocityX < -SWIPE_VELOCITY_THRESHOLD || moved < -SWIPE_COMMIT_RATIO) {
        target = base + 1;
      } else if (e.velocityX > SWIPE_VELOCITY_THRESHOLD || moved > SWIPE_COMMIT_RATIO) {
        target = base - 1;
      }
      target = Math.max(0, target);

      position.value = withTiming(target, PAGE_ANIMATION);
      // Troca o estado já no início da animação: o vizinho seguinte é
      // montado enquanto a faixa desliza, e o mês visível não muda de lugar.
      scheduleOnRN(commitMonth, target);
    });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -position.value * width }],
  }));

  // Monta só o mês selecionado e os vizinhos (não existe mês antes do atual).
  const visibleOffsets = (
    neighborsReady ? [monthOffset - 1, monthOffset, monthOffset + 1] : [monthOffset]
  ).filter((offset) => offset >= 0);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <Header title="Calendário" />

        {/* Setas tocáveis + dica de swipe: dá para trocar de mês dos dois
            jeitos, e as setas deixam claro que existe navegação. */}
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => goToMonth(monthOffset - 1)}
            disabled={monthOffset === 0}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            style={({ pressed }) => [
              styles.navButton,
              pressed && styles.navButtonPressed,
              monthOffset === 0 && styles.navButtonDisabled,
            ]}
          >
            <Ionicons name="chevron-back" size={16} color={Colors.text} />
          </Pressable>

          <Text style={styles.swipeHintText}>Deslize para mudar o mês</Text>

          <Pressable
            onPress={() => goToMonth(monthOffset + 1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
          >
            <Ionicons name="chevron-forward" size={16} color={Colors.text} />
          </Pressable>
        </View>

        <GestureDetector gesture={panGesture}>
          <View style={styles.swipeArea}>
            {/* A faixa é larga o bastante para conter todos os meses
                montados: no Android, um filho fora dos limites do pai não
                recebe toques. */}
            <Animated.View
              style={[styles.track, { width: (monthOffset + 2) * width }, trackStyle]}
            >
              {visibleOffsets.map((offset) => (
                <MonthPane
                  key={offset}
                  offset={offset}
                  events={events}
                  width={width}
                  onAddEvent={handleAddEvent}
                  onEditEvent={handleEditEvent}
                />
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
      </SafeAreaView>

      <EventFormModal
        visible={addEventDate !== null || editingEvent !== null}
        date={addEventDate}
        event={editingEvent}
        onClose={closeEventForm}
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
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 4,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF0F",
  },
  navButtonPressed: {
    backgroundColor: `${Colors.primary}80`,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  swipeHintText: {
    color: "#FFFFFF60",
    fontFamily: Fonts.book,
    fontSize: 11,
  },
  swipeArea: {
    flex: 1,
    overflow: "hidden",
  },
  track: {
    flex: 1,
  },
  pane: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  monthHeader: {
    marginLeft: 25,
    marginRight: 20,
    marginTop: 35,
    marginBottom: 35,
  },
  monthName: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  emptyMonthHint: {
    marginTop: 8,
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 12,
  },
});
