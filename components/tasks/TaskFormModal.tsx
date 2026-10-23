import SubjectFormModal from "@/components/tasks/SubjectFormModal";
import { Colors, Fonts } from "@/constants/colors";
import { PRIORITY_OPTIONS } from "@/constants/task-options";
import { useSubjects } from "@/contexts/subjects-context";
import { TaskPriority } from "@/types/task";
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

type NewTaskInput = {
  title: string;
  priority: TaskPriority;
  subjectId: string | null;
};

type TaskFormModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: NewTaskInput) => void;
};

export default function TaskFormModal({
  visible,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const { subjects } = useSubjects();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("baixa");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [subjectFormVisible, setSubjectFormVisible] = useState(false);

  // Reseta o formulário toda vez que o modal é aberto.
  useEffect(() => {
    if (visible) {
      setTitle("");
      setPriority("baixa");
      setSelectedSubjectId(null);
      setPriorityMenuOpen(false);
      setSubjectMenuOpen(false);
      setSubjectFormVisible(false);
    }
  }, [visible]);

  const currentPriority =
    PRIORITY_OPTIONS.find((option) => option.value === priority) ??
    PRIORITY_OPTIONS[0];
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

  const canSubmit = title.trim().length > 0;

  const handleBackdropPress = () => {
    if (priorityMenuOpen || subjectMenuOpen) {
      setPriorityMenuOpen(false);
      setSubjectMenuOpen(false);
      return;
    }
    onClose();
  };

  // Fecha qualquer dropdown aberto ao tocar em outro lugar do card (web
  // propaga o clique até aqui mesmo quando o toque foi em um filho
  // interativo, como o input de título).
  const handleCardPress = () => {
    if (priorityMenuOpen || subjectMenuOpen) {
      setPriorityMenuOpen(false);
      setSubjectMenuOpen(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      priority,
      subjectId: selectedSubjectId,
    });
    onClose();
  };

  const handleSubjectCreated = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSubjectFormVisible(false);
  };

  return (
    <>
      <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

          <Pressable style={styles.card} onPress={handleCardPress}>
            <Text style={styles.heading}>Criar tarefa</Text>

            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#FFFFFF80"
            />

            <View style={styles.row}>
              <View style={styles.priorityColumn}>
                <Text style={styles.label}>Prioridade</Text>

                <View>
                  <Pressable
                    style={styles.selectField}
                    onPress={() => {
                      setSubjectMenuOpen(false);
                      setPriorityMenuOpen((prev) => !prev);
                    }}
                  >
                    <View style={[styles.dot, { backgroundColor: currentPriority.color }]} />
                    <Text style={styles.selectText} numberOfLines={1}>{currentPriority.label}</Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.text} />
                  </Pressable>

                  {priorityMenuOpen && (
                    <ScrollView style={styles.optionsList}>
                      {PRIORITY_OPTIONS.map((option) => (
                        <Pressable
                          key={option.value}
                          style={styles.optionRow}
                          onPress={() => {
                            setPriority(option.value);
                            setPriorityMenuOpen(false);
                          }}
                        >
                          <View style={[styles.dot, { backgroundColor: option.color }]} />
                          <Text style={styles.optionText}>{option.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              <View style={styles.subjectColumn}>
                <Text style={styles.label}>Assunto</Text>

                <View style={styles.subjectRow}>
                  <View style={styles.subjectSelectWrapper}>
                    <Pressable
                      style={styles.selectField}
                      onPress={() => {
                        setPriorityMenuOpen(false);
                        setSubjectMenuOpen((prev) => !prev);
                      }}
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

                    {subjectMenuOpen && (
                      <ScrollView style={styles.optionsList}>
                        {subjects.length === 0 ? (
                          <View style={styles.optionRow}>
                            <Text style={styles.emptyOptionText}>Nenhum assunto criado</Text>
                          </View>
                        ) : (
                          subjects.map((option) => (
                            <Pressable
                              key={option.id}
                              style={styles.optionRow}
                              onPress={() => {
                                setSelectedSubjectId(option.id);
                                setSubjectMenuOpen(false);
                              }}
                            >
                              <View style={[styles.dot, { backgroundColor: option.color }]} />
                              <Text style={[styles.optionText, { color: option.color }]} numberOfLines={1}>
                                {option.name}
                              </Text>
                            </Pressable>
                          ))
                        )}
                      </ScrollView>
                    )}
                  </View>

                  <Pressable
                    style={styles.addSubjectButton}
                    onPress={() => {
                      setPriorityMenuOpen(false);
                      setSubjectMenuOpen(false);
                      setSubjectFormVisible(true);
                    }}
                  >
                    <Ionicons name="add" size={18} color={Colors.text} />
                  </Pressable>
                </View>
              </View>
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

      <SubjectFormModal
        visible={subjectFormVisible}
        onClose={() => setSubjectFormVisible(false)}
        onCreated={handleSubjectCreated}
      />
    </>
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
  row: {
    flexDirection: "row",
    marginTop: 16,
    zIndex: 5,
  },
  priorityColumn: {
    marginRight: 20,
    position: "relative",
    zIndex: 50,
    elevation: 10,
  },
  subjectColumn: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    zIndex: 1,
    elevation: 1,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  subjectSelectWrapper: {
    flex: 1,
    minWidth: 0,
    position: "relative",
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
  placeholderText: {
    color: "#FFFFFF80",
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
  emptyOptionText: {
    color: "#FFFFFF80",
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
