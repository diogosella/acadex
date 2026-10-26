import { Colors, Fonts } from "@/constants/colors";
import { formatFocusDuration } from "@/constants/pomodoro-options";
import { usePomodoroHistory } from "@/contexts/pomodoro-history-context";
import { useSubjects } from "@/contexts/subjects-context";
import { useTasks } from "@/contexts/tasks-context";
import { PomodoroSession } from "@/types/pomodoro";
import { TaskCompletion } from "@/types/task";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Histórico do Pomodoro (classe "Sessão Pomodoro"; "acompanhar seu
// desempenho ao longo do tempo"): resumo, mapa de atividade dos últimos 90
// dias (semanas em colunas, dias da semana em linhas, cor mais forte = mais
// sessões) e a atividade recente: focos e tarefas concluídas, por data.
// O resumo e o mapa contam só os focos; as tarefas aparecem apenas na lista.

const WEEKS = 13; // ~90 dias
const CELL_GAP = 4;
const MAX_CELL = 22;
const DAY_LABEL_WIDTH = 30;
const RECENT_LIMIT = 15;

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

type DayStats = { count: number; focusMs: number };

type RecentItem =
  | { kind: "session"; at: number; session: PomodoroSession }
  | { kind: "task"; at: number; completion: TaskCompletion };

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Segunda-feira da semana de `date` (semanas começam na segunda).
function mondayOf(date: Date): Date {
  const weekday = (date.getDay() + 6) % 7; // 0 = segunda ... 6 = domingo
  return addDays(startOfDay(date), -weekday);
}

// Cor do quadrado conforme a quantidade de sessões no dia.
function levelColor(count: number): string {
  if (count <= 0) return "#FFFFFF12";
  if (count === 1) return `${Colors.primary}59`;
  if (count === 2) return `${Colors.primary}8C`;
  if (count <= 4) return `${Colors.primary}BF`;
  return Colors.primary;
}

function formatDayLong(date: Date): string {
  return `${date.getDate()} de ${MONTHS_LONG[date.getMonth()]}`;
}

function formatWhen(timestamp: number): string {
  const date = new Date(timestamp);
  const day = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()].toLowerCase()}`;
  return `${day} · ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function sessionsLabel(count: number): string {
  return `${count} ${count === 1 ? "sessão" : "sessões"}`;
}

export default function HistoryScreen() {
  const { sessions: allSessions } = usePomodoroHistory();
  // As telas mostram só os focos; as pausas ficam salvas no histórico, mas
  // não entram no resumo, no mapa nem na lista.
  const sessions = useMemo(
    () => allSessions.filter((session) => session.type === "focus"),
    [allSessions]
  );
  const { tasks, completions } = useTasks();
  const { getSubject } = useSubjects();
  const { width } = useWindowDimensions();
  const today = startOfDay(new Date());
  const [selectedKey, setSelectedKey] = useState(dayKeyOf(today));

  // Sessões completadas agrupadas por dia (o mapa e o resumo contam só as
  // completadas; as canceladas aparecem apenas na lista).
  const statsByDay = useMemo(() => {
    const map = new Map<string, DayStats>();
    for (const session of sessions) {
      if (!session.completed) continue;
      const key = dayKeyOf(new Date(session.endedAt));
      const current = map.get(key) ?? { count: 0, focusMs: 0 };
      map.set(key, { count: current.count + 1, focusMs: current.focusMs + session.durationMs });
    }
    return map;
  }, [sessions]);

  const completed = sessions.filter((session) => session.completed);
  const totalFocusMs = completed.reduce((sum, session) => sum + session.durationMs, 0);

  // Dias seguidos com pelo menos uma sessão, terminando hoje (ou ontem, se
  // hoje ainda não teve sessão).
  let streak = 0;
  let cursor = statsByDay.has(dayKeyOf(today)) ? today : addDays(today, -1);
  while (statsByDay.has(dayKeyOf(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  // Grade: 13 colunas (semanas), da mais antiga à atual.
  const firstMonday = addDays(mondayOf(today), -(WEEKS - 1) * 7);
  const weeks = Array.from({ length: WEEKS }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => addDays(firstMonday, weekIndex * 7 + dayIndex))
  );

  // Tamanho dos quadrados a partir da largura da tela (cabe sem rolar).
  const available = width - 40 - 32 - DAY_LABEL_WIDTH;
  const cell = Math.min(MAX_CELL, Math.floor((available - CELL_GAP * (WEEKS - 1)) / WEEKS));

  const selectedDate = (() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const selectedStats = statsByDay.get(selectedKey);

  // Focos e tarefas concluídas numa lista só, mais recentes primeiro.
  const recent = useMemo<RecentItem[]>(() => {
    const items: RecentItem[] = [
      ...sessions.map((session) => ({ kind: "session" as const, at: session.endedAt, session })),
      ...completions.map((completion) => ({
        kind: "task" as const,
        at: completion.completedAt,
        completion,
      })),
    ];
    return items.sort((a, b) => b.at - a.at).slice(0, RECENT_LIMIT);
  }, [sessions, completions]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Histórico</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Resumo */}
          <View style={styles.summaryRow}>
            <SummaryCard icon="checkmark-circle" value={`${completed.length}`} label="Sessões" />
            <SummaryCard
              icon="time"
              value={completed.length ? formatFocusDuration(totalFocusMs) : "0 min"}
              label="Tempo de foco"
            />
            <SummaryCard icon="flame" value={`${streak}`} label={streak === 1 ? "Dia seguido" : "Dias seguidos"} />
          </View>

          {/* Mapa de atividade */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Atividade</Text>
            <Text style={styles.sectionHint}>Últimos 90 dias</Text>
          </View>
          <View style={styles.card}>
            {/* Meses (aparecem na semana em que o mês começa) */}
            <View style={[styles.monthsRow, { marginLeft: DAY_LABEL_WIDTH }]}>
              {weeks.map((week, index) => {
                const firstOfMonth = week.find((day) => day.getDate() === 1);
                // A 1ª coluna mostra o mês corrente, a menos que um mês novo
                // comece logo em seguida (os rótulos ficariam sobrepostos).
                const monthStartsSoon = weeks
                  .slice(1, 3)
                  .some((w) => w.some((day) => day.getDate() === 1));
                const showMonth =
                  index === 0 ? (firstOfMonth ?? (monthStartsSoon ? undefined : week[0])) : firstOfMonth;
                return (
                  <View key={index} style={{ width: cell, marginRight: CELL_GAP }}>
                    {showMonth && (
                      <Text style={styles.monthLabel}>
                        {MONTHS_SHORT[showMonth.getMonth()]}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.gridRow}>
              <View style={{ width: DAY_LABEL_WIDTH }}>
                {WEEKDAYS.map((label) => (
                  <Text
                    key={label}
                    style={[styles.dayLabel, { height: cell, marginBottom: CELL_GAP, lineHeight: cell }]}
                  >
                    {label}
                  </Text>
                ))}
              </View>

              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={{ marginRight: CELL_GAP }}>
                  {week.map((day) => {
                    const key = dayKeyOf(day);
                    const isFuture = day.getTime() > today.getTime();
                    const count = statsByDay.get(key)?.count ?? 0;
                    const isSelected = key === selectedKey;
                    return (
                      <Pressable
                        key={key}
                        disabled={isFuture}
                        onPress={() => setSelectedKey(key)}
                        accessibilityLabel={`${formatDayLong(day)}: ${sessionsLabel(count)}`}
                        style={[
                          styles.cell,
                          {
                            width: cell,
                            height: cell,
                            marginBottom: CELL_GAP,
                            backgroundColor: isFuture ? "transparent" : levelColor(count),
                          },
                          isSelected && styles.cellSelected,
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.selectedText}>
                {formatDayLong(selectedDate)}:{" "}
                <Text style={styles.selectedStrong}>{sessionsLabel(selectedStats?.count ?? 0)}</Text>
                {selectedStats ? ` · ${formatFocusDuration(selectedStats.focusMs)}` : ""}
              </Text>
              <View style={styles.legend}>
                <Text style={styles.legendText}>Menos</Text>
                {[0, 1, 2, 3, 5].map((level) => (
                  <View key={level} style={[styles.legendCell, { backgroundColor: levelColor(level) }]} />
                ))}
                <Text style={styles.legendText}>Mais</Text>
              </View>
            </View>
          </View>

          {/* Últimas sessões */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Atividade recente</Text>
          </View>
          <View style={styles.card}>
            {recent.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhuma atividade ainda. Complete um foco no Pomodoro ou conclua uma tarefa para
                começar seu histórico.
              </Text>
            ) : (
              recent.map((item, index) => {
                const rowStyle = [styles.sessionRow, index < recent.length - 1 && styles.divider];

                if (item.kind === "session") {
                  const { session } = item;
                  return (
                    <View key={`s-${session.id}`} style={rowStyle}>
                      <Ionicons
                        name={session.completed ? "checkmark-circle" : "close-circle-outline"}
                        size={20}
                        color={session.completed ? Colors.primary : "#FFFFFF59"}
                      />
                      <View style={styles.sessionText}>
                        <Text style={styles.sessionTitle}>
                          {session.completed ? "Foco concluído" : "Foco cancelado"}
                        </Text>
                        <Text style={styles.sessionWhen}>{formatWhen(session.endedAt)}</Text>
                      </View>
                      <Text style={styles.sessionDuration}>
                        {formatFocusDuration(session.durationMs)}
                      </Text>
                    </View>
                  );
                }

                const { completion } = item;
                // Título atual se a tarefa ainda existe; senão, a cópia salva.
                const title =
                  tasks.find((task) => task.id === completion.taskId)?.title ?? completion.title;
                const subject = completion.subjectId ? getSubject(completion.subjectId) : undefined;
                return (
                  <View key={`t-${completion.id}`} style={rowStyle}>
                    <Ionicons name="checkbox" size={20} color={subject?.color ?? "#FFFFFFCC"} />
                    <View style={styles.sessionText}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.sessionWhen} numberOfLines={1}>
                        {formatWhen(completion.completedAt)}
                        {subject && (
                          <Text style={{ color: subject.color }}> · {subject.name}</Text>
                        )}
                      </Text>
                    </View>
                    <Text style={styles.sessionDuration}>Tarefa</Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type SummaryCardProps = {
  icon: "checkmark-circle" | "time" | "flame";
  value: string;
  label: string;
};

function SummaryCard({ icon, value, label }: SummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
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
  headerRow: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backPressed: {
    backgroundColor: "#FFFFFF14",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 22,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 18,
  },
  summaryLabel: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  sectionTitle: {
    color: "#FFFFFF80",
    fontFamily: Fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionHint: {
    color: "#FFFFFF59",
    fontFamily: Fonts.book,
    fontSize: 11,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  monthsRow: {
    flexDirection: "row",
    height: 14,
    marginBottom: 6,
  },
  // Absoluto: o rótulo pode passar da largura de uma coluna sem ser cortado.
  monthLabel: {
    position: "absolute",
    left: 0,
    width: 40,
    color: "#FFFFFF99",
    fontFamily: Fonts.book,
    fontSize: 10,
  },
  gridRow: {
    flexDirection: "row",
  },
  dayLabel: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 10,
  },
  cell: {
    borderRadius: 4,
  },
  cellSelected: {
    borderWidth: 1.5,
    borderColor: Colors.text,
  },
  legendRow: {
    marginTop: 8,
    gap: 10,
  },
  selectedText: {
    color: "#FFFFFFB3",
    fontFamily: Fonts.book,
    fontSize: 12,
  },
  selectedStrong: {
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    color: "#FFFFFF66",
    fontFamily: Fonts.book,
    fontSize: 10,
    marginHorizontal: 2,
  },
  emptyText: {
    color: "#FFFFFF99",
    fontFamily: Fonts.book,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sessionText: {
    flex: 1,
  },
  sessionTitle: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  sessionWhen: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 11,
    marginTop: 2,
  },
  sessionDuration: {
    color: "#FFFFFFCC",
    fontFamily: Fonts.book,
    fontSize: 12,
  },
});
