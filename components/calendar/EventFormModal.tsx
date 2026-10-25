import { Colors, Fonts } from "@/constants/colors";
import {
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  NOTIFY_BEFORE_OPTIONS,
  formatWeekdayAndDay,
  toDateKey,
} from "@/constants/event-options";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FloatingMenu from "@/components/ui/FloatingMenu";
import { useEvents } from "@/contexts/events-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useAnchoredMenu } from "@/hooks/use-anchored-menu";
import {
  getNotificationPermissionStatus,
  isEventTriggerInPast,
  NotificationPermissionStatus,
} from "@/lib/event-notifications";
import { hapticSelection } from "@/lib/haptics";
import { CalendarEvent } from "@/types/event";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type EventFormModalProps = {
  visible: boolean;
  // Criação: dia tocado no Calendário. Edição: o evento (o dia vem dele).
  date: string | null; // "YYYY-MM-DD"
  event?: CalendarEvent | null;
  onClose: () => void;
};

type MenuKey = "hour" | "minute" | "notify";

type MenuOption = {
  key: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
};

const MENU_MAX_HEIGHT = 220;

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shiftDateKey(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayKey(): string {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

// Formulário de evento, para criar (a partir do dia tocado) ou editar (a
// partir do evento tocado; com o botão de excluir).
export default function EventFormModal({ visible, date, event, onClose }: EventFormModalProps) {
  const { addEvent, updateEvent, deleteEvent } = useEvents();
  // Evento em edição, guardado ao abrir: quando a tela fecha o formulário o
  // prop volta a null, mas o conteúdo não pode trocar durante o fade-out.
  const [editing, setEditing] = useState<CalendarEvent | null>(event ?? null);
  const isEditing = editing !== null;
  // Aviso que já vem selecionado: escolhido em Configurações > Notificações.
  const { preferences } = usePreferences();
  const defaultNotify = preferences.defaultNotifyBeforeMinutes;
  const [formDate, setFormDate] = useState(event?.date ?? date ?? "");
  const [title, setTitle] = useState("");
  const [hour, setHour] = useState(HOUR_OPTIONS[8]);
  const [minute, setMinute] = useState(MINUTE_OPTIONS[0]);
  const [notifyBeforeMinutes, setNotifyBeforeMinutes] = useState<number | null>(
    defaultNotify
  );
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("undetermined");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  // Dropdowns de Hora/Minuto/Notificar flutuantes, desenhados no fundo do
  // modal e posicionados embaixo do campo (ver hooks/use-anchored-menu.ts:
  // dentro do card eles não rolavam no Android).
  const {
    containerRef,
    anchorRef,
    openMenu,
    position: menuPosition,
    toggle: toggleMenuBase,
    close: closeMenu,
    onContainerLayout,
    onContentLayout,
  } = useAnchoredMenu<MenuKey>({ maxHeight: MENU_MAX_HEIGHT, minWidth: 140 });

  // Preenche o formulário toda vez que o modal é aberto (vazio para criar,
  // com os dados do evento para editar). Feito durante o render, ao perceber
  // a abertura (padrão do React para "ajustar estado quando uma prop muda"),
  // em vez de num useEffect: assim o primeiro quadro já sai preenchido.
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setEditing(event ?? null);
      if (event) {
        const [eventHour, eventMinute] = event.time.split(":");
        setFormDate(event.date);
        setTitle(event.title);
        setHour(eventHour);
        setMinute(eventMinute);
        setNotifyBeforeMinutes(event.notifyBeforeMinutes);
      } else {
        setFormDate(date ?? "");
        setTitle("");
        setHour(HOUR_OPTIONS[8]);
        setMinute(MINUTE_OPTIONS[0]);
        setNotifyBeforeMinutes(defaultNotify);
      }
      setConfirmDeleteVisible(false);
      closeMenu();
    }
  }

  // Consulta (sem pedir) o status da permissão de notificação ao abrir, para
  // poder avisar o usuário caso ela esteja negada.
  useEffect(() => {
    if (!visible) return;
    let active = true;
    getNotificationPermissionStatus().then((status) => {
      if (active) setPermissionStatus(status);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  if (!formDate) return null;

  const [year, month, day] = formDate.split("-").map(Number);
  const dateLabel = formatWeekdayAndDay(year, month - 1, day);
  // O Calendário só mostra de hoje em diante, então o dia não volta antes
  // de hoje.
  const canGoBack = formDate > todayKey();

  const changeDate = (days: number) => {
    hapticSelection();
    closeMenu();
    setFormDate((current) => shiftDateKey(current, days));
  };

  const currentNotify =
    NOTIFY_BEFORE_OPTIONS.find((option) => option.minutes === notifyBeforeMinutes) ??
    NOTIFY_BEFORE_OPTIONS[0];

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  // Mensagem curta abaixo do seletor "Notificar", só quando o aviso
  // escolhido não vai disparar.
  let notifyHint: string | null = null;
  if (notifyBeforeMinutes !== null) {
    if (permissionStatus === "unsupported") {
      notifyHint = "Notificações só funcionam no celular.";
    } else if (permissionStatus === "denied") {
      notifyHint = "Notificações desativadas nas configurações do aparelho.";
    } else if (
      isEventTriggerInPast({ date: formDate, time: `${hour}:${minute}`, notifyBeforeMinutes })
    ) {
      notifyHint = "Esse horário de aviso já passou. Escolha outro.";
    }
  }

  const toggleMenu = (menu: MenuKey) => {
    // Fecha o teclado (se o título estiver em foco) para ele não cobrir a
    // lista. Se o card se mover com isso, o onLayout reposiciona a lista.
    Keyboard.dismiss();
    toggleMenuBase(menu);
  };

  const handleBackdropPress = () => {
    if (openMenu) {
      closeMenu();
      return;
    }
    onClose();
  };

  // Fecha o dropdown aberto ao tocar em outro lugar do card (web propaga o
  // clique até aqui mesmo quando o toque foi em um filho interativo, como o
  // input de título).
  const handleCardPress = () => {
    if (openMenu) closeMenu();
  };

  const menuOptions = (menu: MenuKey): MenuOption[] => {
    if (menu === "hour") {
      return HOUR_OPTIONS.map((option) => ({
        key: option,
        label: option,
        selected: option === hour,
        onSelect: () => setHour(option),
      }));
    }
    if (menu === "minute") {
      return MINUTE_OPTIONS.map((option) => ({
        key: option,
        label: option,
        selected: option === minute,
        onSelect: () => setMinute(option),
      }));
    }
    return NOTIFY_BEFORE_OPTIONS.map((option) => ({
      key: option.label,
      label: option.label,
      selected: option.minutes === notifyBeforeMinutes,
      onSelect: () => setNotifyBeforeMinutes(option.minutes),
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    // Espera o agendamento (que pode abrir o diálogo de permissão do
    // sistema) antes de fechar o modal.
    const input = {
      title: title.trim(),
      date: formDate,
      time: `${hour}:${minute}`,
      notifyBeforeMinutes,
    };
    if (editing) await updateEvent(editing.id, input);
    else await addEvent(input);
    setIsSubmitting(false);
    onClose();
  };

  const handleConfirmDelete = () => {
    if (!editing) return;
    setConfirmDeleteVisible(false);
    deleteEvent(editing.id);
    onClose();
  };

  return (
    <>
      <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
        <View ref={containerRef} style={styles.backdrop} onLayout={onContainerLayout}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

          <Pressable style={styles.card} onPress={handleCardPress} onLayout={onContentLayout}>
            <Text style={styles.heading}>{isEditing ? "Editar evento" : "Criar evento"}</Text>

            {/* Dia do evento, com setas para trocar (ex: reagendar ao editar). */}
            <View style={styles.dateRow}>
              <Pressable
                onPress={() => changeDate(-1)}
                disabled={!canGoBack}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Dia anterior"
                style={({ pressed }) => [
                  styles.dateArrow,
                  pressed && styles.dateArrowPressed,
                  !canGoBack && styles.dateArrowDisabled,
                ]}
              >
                <Ionicons name="chevron-back" size={16} color={Colors.text} />
              </Pressable>
              <Text style={styles.dateLabel}>{dateLabel}</Text>
              <Pressable
                onPress={() => changeDate(1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Próximo dia"
                style={({ pressed }) => [styles.dateArrow, pressed && styles.dateArrowPressed]}
              >
                <Ionicons name="chevron-forward" size={16} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              onFocus={closeMenu}
              placeholderTextColor="#FFFFFF80"
            />

            <View style={styles.row}>
              <View style={styles.hourColumn}>
                <Text style={styles.label}>Hora</Text>

                <Pressable
                  ref={anchorRef("hour")}
                  style={styles.selectField}
                  onPress={() => toggleMenu("hour")}
                >
                  <Text style={styles.selectText}>{hour}</Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.text} />
                </Pressable>
              </View>

              <View>
                <Text style={styles.label}>Minuto</Text>

                <Pressable
                  ref={anchorRef("minute")}
                  style={styles.selectField}
                  onPress={() => toggleMenu("minute")}
                >
                  <Text style={styles.selectText}>{minute}</Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.notifySection}>
              <Text style={styles.label}>Notificar</Text>

              <Pressable
                ref={anchorRef("notify")}
                style={styles.selectField}
                onPress={() => toggleMenu("notify")}
              >
                <Text style={styles.selectText} numberOfLines={1}>
                  {currentNotify.label}
                </Text>
                <Ionicons name="chevron-down" size={14} color={Colors.text} />
              </Pressable>

              {notifyHint && <Text style={styles.notifyHint}>{notifyHint}</Text>}
            </View>

            <View style={styles.actions}>
              {isEditing && (
                <Pressable
                  onPress={() => {
                    closeMenu();
                    setConfirmDeleteVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Excluir evento"
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.text} />
                </Pressable>
              )}
              <View style={styles.actionsSpacer} />

              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.submitText}>{isEditing ? "Salvar" : "Criar"}</Text>
              </Pressable>
            </View>
          </Pressable>

          {/* Último filho do fundo, então fica por cima do card. Só aparece
              depois de medido, para não surgir num lugar e pular para outro. */}
          <FloatingMenu position={openMenu ? menuPosition : null} maxHeight={MENU_MAX_HEIGHT}>
            {openMenu &&
              menuOptions(openMenu).map((option) => (
                <Pressable
                  key={option.key}
                  style={[styles.optionRow, option.selected && styles.optionRowSelected]}
                  onPress={() => {
                    option.onSelect();
                    closeMenu();
                  }}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                </Pressable>
              ))}
          </FloatingMenu>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title={`Excluir "${editing?.title ?? ""}"?`}
        message="O evento e o aviso agendado serão removidos."
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Sem padding no fundo: o card usa margem. Assim o measureLayout e o
  // posicionamento absoluto do dropdown usam a mesma origem (0,0 da tela).
  backdrop: {
    flex: 1,
    backgroundColor: "#000000B0",
    justifyContent: "center",
  },
  card: {
    marginHorizontal: 20,
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    marginLeft: -6,
  },
  dateArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dateArrowPressed: {
    backgroundColor: "#FFFFFF1A",
  },
  dateArrowDisabled: {
    opacity: 0.25,
  },
  dateLabel: {
    color: "#FFFFFFB3",
    fontFamily: Fonts.book,
    fontSize: 13,
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
  },
  hourColumn: {
    marginRight: 20,
  },
  notifySection: {
    marginTop: 16,
  },
  notifyHint: {
    color: "#FFD60A",
    fontFamily: Fonts.book,
    fontSize: 12,
    marginTop: 8,
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
  optionRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  optionRowSelected: {
    backgroundColor: "#FFFFFF26",
  },
  optionText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },
  actionsSpacer: {
    flex: 1,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.primary}33`,
  },
  deleteButtonPressed: {
    backgroundColor: `${Colors.primary}66`,
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
