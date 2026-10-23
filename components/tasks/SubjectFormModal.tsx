import { Colors, Fonts } from "@/constants/colors";
import { SUBJECT_COLOR_OPTIONS } from "@/constants/task-options";
import { useSubjects } from "@/contexts/subjects-context";
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

type SubjectFormModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (subjectId: string) => void;
};

export default function SubjectFormModal({
  visible,
  onClose,
  onCreated,
}: SubjectFormModalProps) {
  const { addSubject } = useSubjects();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLOR_OPTIONS[0].color);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  // Reseta o formulário toda vez que o modal é aberto.
  useEffect(() => {
    if (visible) {
      setName("");
      setColor(SUBJECT_COLOR_OPTIONS[0].color);
      setColorMenuOpen(false);
    }
  }, [visible]);

  const currentColor =
    SUBJECT_COLOR_OPTIONS.find((option) => option.color === color) ??
    SUBJECT_COLOR_OPTIONS[0];

  const canSubmit = name.trim().length > 0;

  const handleBackdropPress = () => {
    if (colorMenuOpen) {
      setColorMenuOpen(false);
      return;
    }
    onClose();
  };

  // Fecha o dropdown de cor ao tocar em qualquer lugar do card que não seja
  // uma opção do próprio dropdown (web propaga o clique até aqui mesmo
  // quando o toque foi em um filho interativo, como o input de nome).
  const handleCardPress = () => {
    if (colorMenuOpen) {
      setColorMenuOpen(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const id = addSubject({ name: name.trim(), color });
    onCreated(id);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

        <Pressable style={styles.card} onPress={handleCardPress}>
          <Text style={styles.heading}>Criar assunto</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor="#FFFFFF80"
          />

          <View style={styles.colorSection}>
            <Text style={styles.label}>Cor</Text>

            <Pressable
              style={styles.selectField}
              onPress={() => setColorMenuOpen((prev) => !prev)}
            >
              <View style={[styles.dot, { backgroundColor: currentColor.color }]} />
              <Text style={[styles.selectText, { color: currentColor.color }]} numberOfLines={1}>
                {currentColor.label}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.text} />
            </Pressable>

            {colorMenuOpen && (
              <ScrollView style={styles.optionsList}>
                {SUBJECT_COLOR_OPTIONS.map((option) => (
                  <Pressable
                    key={option.color}
                    style={styles.optionRow}
                    onPress={() => {
                      setColor(option.color);
                      setColorMenuOpen(false);
                    }}
                  >
                    <View style={[styles.dot, { backgroundColor: option.color }]} />
                    <Text style={[styles.optionText, { color: option.color }]}>
                      {option.label}
                    </Text>
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
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
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
    minWidth: 150,
    maxHeight: 220,
    overflow: "scroll",
    backgroundColor: `${Colors.primary}CC`,
    borderRadius: 10,
    paddingVertical: 4,
    zIndex: 100,
    elevation: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
