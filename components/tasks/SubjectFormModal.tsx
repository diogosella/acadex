import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FloatingMenu from "@/components/ui/FloatingMenu";
import { Colors, Fonts } from "@/constants/colors";
import { SUBJECT_COLOR_OPTIONS } from "@/constants/task-options";
import { useSubjects } from "@/contexts/subjects-context";
import { useAnchoredMenu } from "@/hooks/use-anchored-menu";
import { Subject } from "@/types/subject";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const MENU_MAX_HEIGHT = 220;

type SubjectFormModalProps = {
  visible: boolean;
  // Presente = edição (preenchido, "Salvar" e botão de excluir).
  subject?: Subject | null;
  onClose: () => void;
  onSaved: (subjectId: string) => void;
  onDeleted?: (subjectId: string) => void;
};

// Formulário de assunto, para criar ou editar (aberto pelo formulário de
// tarefa).
export default function SubjectFormModal({
  visible,
  subject,
  onClose,
  onSaved,
  onDeleted,
}: SubjectFormModalProps) {
  const { addSubject, updateSubject, deleteSubject } = useSubjects();
  // Assunto em edição, guardado ao abrir (o conteúdo não troca no fade-out).
  const [editing, setEditing] = useState<Subject | null>(subject ?? null);
  const isEditing = editing !== null;
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLOR_OPTIONS[0].color);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  // Dropdown de cor flutuante, desenhado no fundo do modal (ver
  // hooks/use-anchored-menu.ts: dentro do card ele não rolava no Android).
  const {
    containerRef,
    anchorRef,
    openMenu,
    position: menuPosition,
    toggle: toggleMenu,
    close: closeMenu,
    onContainerLayout,
    onContentLayout,
  } = useAnchoredMenu<"color">({ maxHeight: MENU_MAX_HEIGHT });
  const colorMenuOpen = openMenu === "color";

  // Preenche o formulário toda vez que o modal é aberto (padrão do React
  // para "ajustar estado quando uma prop muda", sem useEffect).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setEditing(subject ?? null);
      setName(subject?.name ?? "");
      setColor(subject?.color ?? SUBJECT_COLOR_OPTIONS[0].color);
      setConfirmDeleteVisible(false);
      closeMenu();
    }
  }

  const currentColor =
    SUBJECT_COLOR_OPTIONS.find((option) => option.color === color) ??
    SUBJECT_COLOR_OPTIONS[0];

  const canSubmit = name.trim().length > 0;

  const handleBackdropPress = () => {
    if (colorMenuOpen) {
      closeMenu();
      return;
    }
    onClose();
  };

  // Fecha o dropdown de cor ao tocar em qualquer lugar do card que não seja
  // uma opção do próprio dropdown (web propaga o clique até aqui mesmo
  // quando o toque foi em um filho interativo, como o input de nome).
  const handleCardPress = () => {
    if (colorMenuOpen) {
      closeMenu();
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const input = { name: name.trim(), color };
    if (editing) {
      updateSubject(editing.id, input);
      onSaved(editing.id);
    } else {
      onSaved(addSubject(input));
    }
  };

  const handleConfirmDelete = () => {
    if (!editing) return;
    setConfirmDeleteVisible(false);
    deleteSubject(editing.id);
    if (onDeleted) onDeleted(editing.id);
    else onClose();
  };

  return (
    <>
      <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
        <View
          ref={containerRef}
          style={styles.backdrop}
          onLayout={onContainerLayout}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

          <Pressable style={styles.card} onPress={handleCardPress} onLayout={onContentLayout}>
            <Text style={styles.heading}>{isEditing ? "Editar assunto" : "Criar assunto"}</Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              onFocus={closeMenu}
              placeholderTextColor="#FFFFFF80"
            />

            <View style={styles.colorSection}>
              <Text style={styles.label}>Cor</Text>

              <Pressable
                ref={anchorRef("color")}
                style={styles.selectField}
                onPress={() => toggleMenu("color")}
              >
                <View style={[styles.dot, { backgroundColor: currentColor.color }]} />
                <Text style={[styles.selectText, { color: currentColor.color }]} numberOfLines={1}>
                  {currentColor.label}
                </Text>
                <Ionicons name="chevron-down" size={14} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.actions}>
              {isEditing && (
                <Pressable
                  onPress={() => {
                    closeMenu();
                    setConfirmDeleteVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Excluir assunto"
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

          {/* Último filho do fundo: fica por cima do card. */}
          <FloatingMenu position={colorMenuOpen ? menuPosition : null} maxHeight={MENU_MAX_HEIGHT}>
            {SUBJECT_COLOR_OPTIONS.map((option) => (
              <Pressable
                key={option.color}
                style={[styles.optionRow, option.color === color && styles.optionRowSelected]}
                onPress={() => {
                  setColor(option.color);
                  closeMenu();
                }}
              >
                <View style={[styles.dot, { backgroundColor: option.color }]} />
                {/* Texto branco: a cor do assunto aparece na bolinha (texto
                    colorido sobre o fundo vermelho do menu ficava ilegível). */}
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            ))}
          </FloatingMenu>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title={`Excluir "${editing?.name ?? ""}"?`}
        message="As tarefas com esse assunto continuam na lista, só ficam sem assunto."
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Sem padding no fundo (o card usa margem): o dropdown é posicionado em
  // relação a ele (ver hooks/use-anchored-menu.ts).
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
  colorSection: {
    marginTop: 16,
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
