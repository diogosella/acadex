import SubjectFormModal from "@/components/tasks/SubjectFormModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FloatingMenu from "@/components/ui/FloatingMenu";
import { Colors, Fonts } from "@/constants/colors";
import {
  addDaysToKey,
  computeRemindAt,
  DEFAULT_REMIND_DAYS_BEFORE,
  DUE_DATE_RANGE_DAYS,
  formatDueDate,
  formatDueDateRelative,
  getReminderOption,
  PRIORITY_OPTIONS,
  REMINDER_OPTIONS,
  todayDateKey,
} from "@/constants/task-options";
import { useSubjects } from "@/contexts/subjects-context";
import { NewTaskInput } from "@/contexts/tasks-context";
import { useAnchoredMenu } from "@/hooks/use-anchored-menu";
import {
  getNotificationPermissionStatus,
  NotificationPermissionStatus,
} from "@/lib/event-notifications";
import { hapticSelection } from "@/lib/haptics";
import { isTaskReminderInPast } from "@/lib/task-notifications";
import { Subject } from "@/types/subject";
import { Task, TaskPriority } from "@/types/task";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const MENU_MAX_HEIGHT = 220;

type MenuKey = "priority" | "subject" | "due" | "reminder";

type TaskFormModalProps = {
  visible: boolean;
  // Presente = edição (formulário preenchido, "Salvar" e botão de excluir).
  task?: Task | null;
  onClose: () => void;
  onSubmit: (input: NewTaskInput) => void;
  onDelete?: (id: string) => void;
};

// Formulário de tarefa, para criar ou editar. Os assuntos podem ser criados
// (botão +) e editados ou excluídos (lápis ao lado de cada um na lista).
export default function TaskFormModal({
  visible,
  task,
  onClose,
  onSubmit,
  onDelete,
}: TaskFormModalProps) {
  const { subjects } = useSubjects();
  // Tarefa em edição, guardada ao abrir (o conteúdo não troca no fade-out).
  const [editing, setEditing] = useState<Task | null>(task ?? null);
  const isEditing = editing !== null;
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("baixa");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectFormVisible, setSubjectFormVisible] = useState(false);
  // Assunto aberto no formulário de assunto (null = criar um novo).
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [remindDaysBefore, setRemindDaysBefore] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("undetermined");

  // Dropdowns de Prioridade e Assunto flutuantes, desenhados no fundo do
  // modal (ver hooks/use-anchored-menu.ts: dentro do card eles não rolavam
  // nem respondiam ao toque no Android).
  const {
    containerRef,
    anchorRef,
    openMenu,
    position: menuPosition,
    toggle: toggleMenu,
    close: closeMenu,
    onContainerLayout,
    onContentLayout,
  } = useAnchoredMenu<MenuKey>({ maxHeight: MENU_MAX_HEIGHT });
  const priorityMenuOpen = openMenu === "priority";
  const subjectMenuOpen = openMenu === "subject";
  const dueMenuOpen = openMenu === "due";
  const reminderMenuOpen = openMenu === "reminder";

  // Preenche o formulário toda vez que o modal é aberto (vazio ou com os
  // dados da tarefa). Feito no render ao perceber a abertura, padrão do
  // React para "ajustar estado quando uma prop muda".
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setEditing(task ?? null);
      setTitle(task?.title ?? "");
      setPriority(task?.priority ?? "baixa");
      setSelectedSubjectId(task?.subjectId ?? null);
      setDueDate(task?.dueDate ?? null);
      setRemindDaysBefore(task?.dueDate ? (task.remindDaysBefore ?? null) : null);
      setSubjectFormVisible(false);
      setConfirmDeleteVisible(false);
      closeMenu();
    }
  }

  // Consulta (sem pedir) a permissão de notificação ao abrir, para avisar
  // se o lembrete não vai chegar.
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

  const handleToggleMenu = (key: MenuKey) => {
    Keyboard.dismiss();
    toggleMenu(key);
  };

  const currentPriority =
    PRIORITY_OPTIONS.find((option) => option.value === priority) ??
    PRIORITY_OPTIONS[0];
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

  const canSubmit = title.trim().length > 0;

  // Opções de entrega: sem data + os próximos dias. Se a tarefa já tinha uma
  // data fora dessa faixa (ex: entrega que já passou), ela aparece também.
  const today = todayDateKey();
  const dueOptions: (string | null)[] = [
    null,
    ...Array.from({ length: DUE_DATE_RANGE_DAYS }, (_, index) => addDaysToKey(today, index)),
  ];
  if (dueDate && !dueOptions.includes(dueDate)) dueOptions.splice(1, 0, dueDate);

  const selectDueDate = (value: string | null) => {
    // Ao escolher a primeira data, o lembrete padrão já vem marcado (ou
    // "no dia", se o padrão já passou; ou nenhum, se os dois já passaram).
    if (value && !dueDate && remindDaysBefore === null) {
      const fallback = [DEFAULT_REMIND_DAYS_BEFORE, 0].find(
        (days) => !isTaskReminderInPast(computeRemindAt(value, days))
      );
      setRemindDaysBefore(fallback ?? null);
    }
    if (!value) setRemindDaysBefore(null);
    setDueDate(value);
  };

  const currentReminder = getReminderOption(remindDaysBefore);

  // Aviso curto abaixo de Entrega/Lembrete, só quando o lembrete não vai
  // chegar.
  let reminderHint: string | null = null;
  if (dueDate && remindDaysBefore !== null) {
    // Na edição sem mudar data/lembrete, vale o horário já salvo.
    const unchanged =
      editing &&
      (editing.dueDate ?? null) === dueDate &&
      (editing.remindDaysBefore ?? null) === remindDaysBefore;
    const remindAt = unchanged
      ? (editing.remindAt ?? null)
      : computeRemindAt(dueDate, remindDaysBefore);
    if (permissionStatus === "unsupported") {
      reminderHint = "Lembretes só funcionam no celular.";
    } else if (permissionStatus === "denied") {
      reminderHint = "Notificações desativadas nas configurações do aparelho.";
    } else if (isTaskReminderInPast(remindAt)) {
      reminderHint = "Esse horário de lembrete já passou. Escolha outro.";
    }
  }

  const handleBackdropPress = () => {
    if (openMenu) {
      closeMenu();
      return;
    }
    onClose();
  };

  // Fecha qualquer dropdown aberto ao tocar em outro lugar do card (web
  // propaga o clique até aqui mesmo quando o toque foi em um filho
  // interativo, como o input de título).
  const handleCardPress = () => {
    if (openMenu) closeMenu();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      priority,
      subjectId: selectedSubjectId,
      dueDate,
      remindDaysBefore: dueDate ? remindDaysBefore : null,
    });
    onClose();
  };

  const openSubjectForm = (subject: Subject | null) => {
    closeMenu();
    setSubjectToEdit(subject);
    setSubjectFormVisible(true);
  };

  // Assunto novo já fica selecionado; editado, a seleção não muda.
  const handleSubjectSaved = (subjectId: string) => {
    if (!subjectToEdit) setSelectedSubjectId(subjectId);
    setSubjectFormVisible(false);
  };

  const handleSubjectDeleted = (subjectId: string) => {
    if (selectedSubjectId === subjectId) setSelectedSubjectId(null);
    setSubjectFormVisible(false);
  };

  const handleConfirmDelete = () => {
    if (!editing) return;
    setConfirmDeleteVisible(false);
    onDelete?.(editing.id);
    onClose();
  };

  return (
    <>
      <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
        <View ref={containerRef} style={styles.backdrop} onLayout={onContainerLayout}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

          <Pressable style={styles.card} onPress={handleCardPress} onLayout={onContentLayout}>
            <Text style={styles.heading}>{isEditing ? "Editar tarefa" : "Criar tarefa"}</Text>

            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              onFocus={closeMenu}
              placeholderTextColor="#FFFFFF80"
            />

            <View style={styles.row}>
              <View style={styles.priorityColumn}>
                <Text style={styles.label}>Prioridade</Text>

                <View>
                  <Pressable
                    ref={anchorRef("priority")}
                    style={styles.selectField}
                    onPress={() => handleToggleMenu("priority")}
                  >
                    <View style={[styles.dot, { backgroundColor: currentPriority.color }]} />
                    <Text style={styles.selectText} numberOfLines={1}>{currentPriority.label}</Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.text} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.subjectColumn}>
                <Text style={styles.label}>Assunto</Text>

                <View style={styles.subjectRow}>
                  <View style={styles.subjectSelectWrapper}>
                    <Pressable
                      ref={anchorRef("subject")}
                      style={styles.selectField}
                      onPress={() => handleToggleMenu("subject")}
                    >
                      {selectedSubject ? (
                        <>
                          <View style={[styles.dot, { backgroundColor: selectedSubject.color }]} />
                          <Text
                            style={[styles.selectText, { color: selectedSubject.color }]}
                            numberOfLines={1}
                          >
                            {selectedSubject.name}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.placeholderText} numberOfLines={1}>
                          Selecionar assunto
                        </Text>
                      )}
                      <Ionicons name="chevron-down" size={14} color={Colors.text} />
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.addSubjectButton}
                    onPress={() => openSubjectForm(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Criar assunto"
                  >
                    <Ionicons name="add" size={18} color={Colors.text} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Data de entrega e lembrete (opcionais). */}
            <View style={styles.row}>
              <View style={styles.dueColumn}>
                <Text style={styles.label}>Entrega</Text>
                <Pressable
                  ref={anchorRef("due")}
                  style={styles.selectField}
                  onPress={() => handleToggleMenu("due")}
                  accessibilityRole="button"
                  accessibilityLabel="Data de entrega"
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={dueDate ? Colors.text : "#FFFFFF80"}
                  />
                  <Text
                    style={dueDate ? styles.selectText : styles.placeholderText}
                    numberOfLines={1}
                  >
                    {dueDate ? formatDueDateRelative(dueDate) : "Sem data"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.text} />
                </Pressable>
              </View>

              <View style={styles.reminderColumn}>
                <Text style={[styles.label, !dueDate && styles.labelDisabled]}>Lembrete</Text>
                <Pressable
                  ref={anchorRef("reminder")}
                  style={[styles.selectField, !dueDate && styles.fieldDisabled]}
                  onPress={() => handleToggleMenu("reminder")}
                  disabled={!dueDate}
                  accessibilityRole="button"
                  accessibilityLabel="Lembrete"
                  accessibilityState={{ disabled: !dueDate }}
                >
                  <Ionicons
                    name={dueDate && remindDaysBefore !== null ? "notifications" : "notifications-off-outline"}
                    size={14}
                    color={dueDate && remindDaysBefore !== null ? Colors.text : "#FFFFFF80"}
                  />
                  <Text
                    style={
                      dueDate && remindDaysBefore !== null
                        ? styles.selectText
                        : styles.placeholderText
                    }
                    numberOfLines={1}
                  >
                    {dueDate ? currentReminder.short : "Defina a entrega"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.text} />
                </Pressable>
              </View>
            </View>
            {reminderHint && <Text style={styles.reminderHint}>{reminderHint}</Text>}

            <View style={styles.actions}>
              {isEditing && onDelete && (
                <Pressable
                  onPress={() => {
                    closeMenu();
                    setConfirmDeleteVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Excluir tarefa"
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.deleteButtonPressed,
                  ]}
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

          {/* Dropdowns: últimos filhos do fundo, por cima do card. */}
          <FloatingMenu
            position={priorityMenuOpen ? menuPosition : null}
            maxHeight={MENU_MAX_HEIGHT}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.optionRow, option.value === priority && styles.optionRowSelected]}
                onPress={() => {
                  setPriority(option.value);
                  closeMenu();
                }}
              >
                <View style={[styles.dot, { backgroundColor: option.color }]} />
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            ))}
          </FloatingMenu>

          <FloatingMenu position={dueMenuOpen ? menuPosition : null} maxHeight={MENU_MAX_HEIGHT}>
            {dueOptions.map((option) => (
              <Pressable
                key={option ?? "none"}
                style={[styles.optionRow, option === dueDate && styles.optionRowSelected]}
                onPress={() => {
                  selectDueDate(option);
                  closeMenu();
                }}
              >
                <Text style={styles.optionText}>
                  {option === null
                    ? "Sem data"
                    : option === today || option === addDaysToKey(today, 1)
                      ? `${formatDueDateRelative(option)} · ${formatDueDate(option)}`
                      : formatDueDate(option)}
                </Text>
              </Pressable>
            ))}
          </FloatingMenu>

          <FloatingMenu
            position={reminderMenuOpen ? menuPosition : null}
            maxHeight={MENU_MAX_HEIGHT}
          >
            {REMINDER_OPTIONS.map((option) => {
              // Opções cujo horário já passou (ex: "2 dias antes" de uma
              // entrega amanhã) aparecem apagadas e não podem ser escolhidas.
              const past =
                option.daysBefore !== null &&
                isTaskReminderInPast(computeRemindAt(dueDate, option.daysBefore));
              return (
                <Pressable
                  key={option.label}
                  disabled={past}
                  style={[
                    styles.optionRow,
                    option.daysBefore === remindDaysBefore && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setRemindDaysBefore(option.daysBefore);
                    closeMenu();
                  }}
                >
                  <Text style={[styles.optionText, past && styles.optionTextPast]}>
                    {option.label}
                    {past ? " · já passou" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </FloatingMenu>

          <FloatingMenu
            position={subjectMenuOpen ? menuPosition : null}
            maxHeight={MENU_MAX_HEIGHT}
          >
            {subjects.length === 0 ? (
              <View style={styles.optionRow}>
                <Text style={styles.emptyOptionText}>Nenhum assunto criado</Text>
              </View>
            ) : (
              subjects.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionRow,
                    option.id === selectedSubjectId && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedSubjectId(option.id);
                    closeMenu();
                  }}
                >
                  <View style={[styles.dot, { backgroundColor: option.color }]} />
                  <Text style={[styles.optionText, styles.subjectOptionText]} numberOfLines={1}>
                    {option.name}
                  </Text>
                  {/* Lápis: edita (ou exclui) o assunto. */}
                  <Pressable
                    onPress={() => {
                      hapticSelection();
                      openSubjectForm(option);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar assunto ${option.name}`}
                    style={({ pressed }) => [styles.editSubjectButton, pressed && styles.editSubjectPressed]}
                  >
                    <Ionicons name="pencil" size={13} color="#FFFFFFB3" />
                  </Pressable>
                </Pressable>
              ))
            )}
          </FloatingMenu>
        </View>
      </Modal>

      <SubjectFormModal
        visible={subjectFormVisible}
        subject={subjectToEdit}
        onClose={() => setSubjectFormVisible(false)}
        onSaved={handleSubjectSaved}
        onDeleted={handleSubjectDeleted}
      />

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title={`Excluir "${editing?.title ?? ""}"?`}
        message="A tarefa será removida da lista."
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Sem padding no fundo (o card usa margem): os dropdowns são posicionados
  // em relação a ele (ver hooks/use-anchored-menu.ts).
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
  },
  priorityColumn: {
    marginRight: 20,
  },
  dueColumn: {
    marginRight: 20,
  },
  reminderColumn: {
    flex: 1,
    minWidth: 0,
  },
  labelDisabled: {
    opacity: 0.4,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  optionTextPast: {
    opacity: 0.45,
  },
  reminderHint: {
    color: "#FFD60A",
    fontFamily: Fonts.book,
    fontSize: 12,
    marginTop: 8,
  },
  subjectColumn: {
    flex: 1,
    minWidth: 0,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  subjectSelectWrapper: {
    flex: 1,
    minWidth: 0,
  },
  addSubjectButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#0A1420",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    backgroundColor: "#0A1420",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  selectText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 13,
    marginRight: 4,
    flexShrink: 1,
  },
  placeholderText: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 13,
    marginRight: 4,
    flexShrink: 1,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  optionRowSelected: {
    backgroundColor: "#00000033",
  },
  optionText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 13,
  },
  emptyOptionText: {
    color: "#FFFFFF80",
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
  subjectOptionText: {
    flex: 1,
  },
  editSubjectButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -6,
  },
  editSubjectPressed: {
    backgroundColor: "#FFFFFF1A",
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
