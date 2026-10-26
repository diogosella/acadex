import { Colors, Fonts } from "@/constants/colors";
import {
  daysUntil,
  formatDueDate,
  formatDueDateRelative,
  getPriorityOption,
} from "@/constants/task-options";
import { useSubjects } from "@/contexts/subjects-context";
import { Task } from "@/types/task";
import { hapticSelection } from "@/lib/haptics";
import { hasPendingReminder, isTaskOverdue } from "@/lib/task-notifications";
import Ionicons from "@expo/vector-icons/Ionicons";
import Checkbox from "expo-checkbox";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type TaskCardProps = {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

// Card da tarefa. Tocar no card abre a edição; a caixinha marca/desmarca
// (área de toque própria, maior que a caixinha) e a lixeira, que aparece
// nas concluídas, remove.
export default function TaskCard({ task, onToggle, onDelete, onEdit }: TaskCardProps) {
  const priorityOption = getPriorityOption(task.priority);
  const { getSubject } = useSubjects();
  const subject = task.subjectId ? getSubject(task.subjectId) : undefined;

  // Entrega: atrasada em vermelho, hoje em amarelo, o resto discreto.
  const due = task.dueDate ?? null;
  const overdue = isTaskOverdue(task);
  const dueToday = !task.done && due !== null && daysUntil(due) === 0;
  const dueColor = overdue ? "#FF3B30" : dueToday ? "#FFD60A" : "#FFFFFFB3";
  const dueLabel = due
    ? overdue
      ? `Atrasada · ${formatDueDate(due)}`
      : formatDueDateRelative(due)
    : null;
  const hasActiveReminder = hasPendingReminder(task);

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onEdit();
      }}
      // Na web, role "button" vira <button>, e a caixinha e a lixeira
      // ficariam aninhadas dentro dele (inválido no HTML). Lá o card fica
      // sem o papel de botão; no celular, nada muda.
      accessibilityRole={Platform.OS === "web" ? undefined : "button"}
      accessibilityLabel={`Editar tarefa ${task.title}`}
      style={({ pressed }) => [styles.taskComponent, pressed && styles.taskPressed]}
    >
      <View style={styles.taskContent}>
        <View style={styles.taskMain}>
          <Pressable
            onPress={onToggle}
            hitSlop={10}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.done }}
            accessibilityLabel={task.done ? "Desmarcar tarefa" : "Concluir tarefa"}
            style={styles.checkboxTouch}
          >
            {/* A caixinha só desenha; o toque é do Pressable em volta. */}
            <View pointerEvents="none">
              <Checkbox value={task.done} color={task.done ? Colors.primary : undefined} />
            </View>
          </Pressable>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.title}
          </Text>

          {/* Lixeira (só nas concluídas): botão redondo de 36 px na própria
              linha do título, com folga de toque e retorno visual. Antes era
              um ícone de 24 px solto no canto, difícil de acertar. */}
          {task.done && (
            <Pressable
              onPress={() => {
                hapticSelection();
                onDelete();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Excluir tarefa ${task.title}`}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
            >
              <Ionicons name="trash-outline" size={17} color={Colors.text} />
            </Pressable>
          )}
        </View>

        <View style={styles.taskSettings}>
          <Text style={[styles.taskType, { color: subject?.color }]}>
            {subject ? `• ${subject.name}` : ""}
          </Text>
          <View style={styles.badges}>
            {dueLabel && (
              <View
                style={styles.dueChip}
                accessibilityLabel={`Entrega: ${dueLabel}${hasActiveReminder ? ", com lembrete" : ""}`}
              >
                <Ionicons name="calendar-outline" size={9} color={dueColor} />
                <Text style={[styles.dueText, { color: dueColor }]}>{dueLabel}</Text>
                {hasActiveReminder && (
                  <Ionicons name="notifications" size={9} color={dueColor} />
                )}
              </View>
            )}
            <Text
              style={[
                styles.taskUrgency,
                { color: priorityOption.color, borderColor: priorityOption.color },
              ]}
            >
              {priorityOption.label}
            </Text>
          </View>
        </View>
      </View>

    </Pressable>
  );
}

const styles = StyleSheet.create({
    taskComponent: {
        width: 341,
        minHeight: 104,
        backgroundColor: Colors.tasksBg,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 10,
        justifyContent: "center",
        marginBottom: 16,
        paddingVertical: 12,
    },
    taskContent: {
        flexDirection: "column"
    },
    taskTitle: {
        flex: 1,
        color: Colors.text,
        fontSize: 12,
        fontFamily: Fonts.bold,
        marginLeft: 10
    },
    // Altura mínima da lixeira: a linha não muda de tamanho ao concluir.
    taskMain: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 36,
        paddingRight: 12,
    },
    taskPressed: {
        opacity: 0.85,
    },
    checkboxTouch: {
        marginLeft: 10,
    },
    taskSettings: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 16
    },
    taskType: {
        fontSize: 8,
        flexShrink: 1,
        marginRight: 8,
    },
    badges: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dueChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    dueText: {
        fontFamily: Fonts.book,
        fontSize: 9,
    },
    taskUrgency: {
        borderWidth: 0.5,
        borderRadius: 50,
        paddingHorizontal: 8,
        paddingVertical: 1,
        fontSize: 8
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginLeft: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `${Colors.primary}26`,
        borderWidth: 1,
        borderColor: `${Colors.primary}66`,
    },
    deleteButtonPressed: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        transform: [{ scale: 0.92 }],
    },
})