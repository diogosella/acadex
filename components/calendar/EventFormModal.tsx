import { Colors, Fonts } from "@/constants/colors";
import {
  DEFAULT_NOTIFY_BEFORE_MINUTES,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  NOTIFY_BEFORE_OPTIONS,
  formatWeekdayAndDay,
} from "@/constants/event-options";
import { useEvents } from "@/contexts/events-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type EventFormModalProps = {
  visible: boolean;
  date: string | null; // "YYYY-MM-DD"
  onClose: () => void;
};

export default function EventFormModal({ visible, date, onClose }: EventFormModalProps) {
  const { addEvent } = useEvents();
  const [title, setTitle] = useState("");
  const [hour, setHour] = useState(HOUR_OPTIONS[8]);
  const [minute, setMinute] = useState(MINUTE_OPTIONS[0]);
  const [notifyBeforeMinutes, setNotifyBeforeMinutes] = useState<number | null>(
    DEFAULT_NOTIFY_BEFORE_MINUTES
  );
  const [hourMenuOpen, setHourMenuOpen] = useState(false);
  const [minuteMenuOpen, setMinuteMenuOpen] = useState(false);
  const [notifyMenuOpen, setNotifyMenuOpen] = useState(false);

  // Reseta o formulário toda vez que o modal é aberto.
  useEffect(() => {
    if (visible) {
      setTitle("");
      setHour(HOUR_OPTIONS[8]);
      setMinute(MINUTE_OPTIONS[0]);
      setNotifyBeforeMinutes(DEFAULT_NOTIFY_BEFORE_MINUTES);
      setHourMenuOpen(false);
      setMinuteMenuOpen(false);
      setNotifyMenuOpen(false);
    }
  }, [visible]);

  if (!date) return null;

  const [year, month, day] = date.split("-").map(Number);
  const dateLabel = formatWeekdayAndDay(year, month - 1, day);

  const currentNotify =
    NOTIFY_BEFORE_OPTIONS.find((option) => option.minutes === notifyBeforeMinutes) ??
    NOTIFY_BEFORE_OPTIONS[0];

  const canSubmit = title.trim().length > 0;

  const anyMenuOpen = hourMenuOpen || minuteMenuOpen || notifyMenuOpen;

  const closeAllMenus = () => {
    setHourMenuOpen(false);
    setMinuteMenuOpen(false);
    setNotifyMenuOpen(false);
  };

  const handleBackdropPress = () => {
    if (anyMenuOpen) {
      closeAllMenus();
      return;
    }
    onClose();
  };

  // Fecha qualquer dropdown aberto ao tocar em outro lugar do card (web
  // propaga o clique até aqui mesmo quando o toque foi em um filho
  // interativo, como o input de título).
  const handleCardPress = () => {
    if (anyMenuOpen) {
      closeAllMenus();
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    addEvent({
      title: title.trim(),
      date,
      time: `${hour}:${minute}`,
      notifyBeforeMinutes,
    });
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

        <Pressable style={styles.card} onPress={handleCardPress}>
          <Text style={styles.heading}>Criar evento</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>

          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#FFFFFF80"
          />

          <View style={styles.row}>
            <View style={styles.hourColumn}>
              <Text style={styles.label}>Hora</Text>

              <Pressable
                style={styles.selectField}
                onPress={() => {
                  setMinuteMenuOpen(false);
                  setNotifyMenuOpen(false);
                  setHourMenuOpen((prev) => !prev);
                }}
              >
                <Text style={styles.selectText}>{hour}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.text} />
              </Pressable>

              {hourMenuOpen && (
                <ScrollView style={styles.optionsList}>
                  {HOUR_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      style={styles.optionRow}
                      onPress={() => {
                        setHour(option);
                        setHourMenuOpen(false);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.minuteColumn}>
              <Text style={styles.label}>Minuto</Text>

              <Pressable
                style={styles.selectField}
                onPress={() => {
                  setHourMenuOpen(false);
                  setNotifyMenuOpen(false);
                  setMinuteMenuOpen((prev) => !prev);
                }}
              >
                <Text style={styles.selectText}>{minute}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.text} />
              </Pressable>

              {minuteMenuOpen && (
                <ScrollView style={styles.optionsList}>
                  {MINUTE_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      style={styles.optionRow}
                      onPress={() => {
                        setMinute(option);
                        setMinuteMenuOpen(false);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.notifySection}>
            <Text style={styles.label}>Notificar</Text>

            <Pressable
              style={styles.selectField}
              onPress={() => {
                setHourMenuOpen(false);
                setMinuteMenuOpen(false);
                setNotifyMenuOpen((prev) => !prev);
              }}
            >
              <Text style={styles.selectText} numberOfLines={1}>
                {currentNotify.label}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.text} />
            </Pressable>

            {notifyMenuOpen && (
              <ScrollView style={styles.optionsList}>
                {NOTIFY_BEFORE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.label}
                    style={styles.optionRow}
                    onPress={() => {
                      setNotifyBeforeMinutes(option.minutes);
                      setNotifyMenuOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.submitText}>Criar</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000B0",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: `${Colors.primary}4D`,
    borderRadius: 20,
    padding: 24,
  },
  heading: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 26,
    marginBottom: 4,
  },
  dateLabel: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 13,
    marginBottom: 20,
  },
  label: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0A1420",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    marginTop: 16,
    zIndex: 5,
  },
  hourColumn: {
    marginRight: 20,
    position: "relative",
    zIndex: 50,
    elevation: 10,
  },
  minuteColumn: {
    position: "relative",
    zIndex: 10,
    elevation: 5,
  },
  notifySection: {
    marginTop: 16,
    position: "relative",
    zIndex: 1,
    elevation: 1,
  },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    flexShrink: 0,
    backgroundColor: "#0A1420",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  selectText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 13,
    marginRight: 4,
    flexShrink: 1,
  },
  optionsList: {
    position: "absolute",
    top: 44,
    left: 0,
    minWidth: 140,
    maxHeight: 220,
    overflow: "scroll",
    backgroundColor: `${Colors.primary}CC`,
    borderRadius: 10,
    paddingVertical: 4,
    zIndex: 100,
    elevation: 20,
  },
  optionRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  optionText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 28,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
  },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
