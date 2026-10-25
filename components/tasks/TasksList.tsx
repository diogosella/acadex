import { Colors, Fonts } from "@/constants/colors";
import { getPriorityOption } from "@/constants/task-options";
import { useSubjects } from "@/contexts/subjects-context";
import { Task } from "@/types/task";
import { hapticSelection } from "@/lib/haptics";
import Checkbox from "expo-checkbox";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onEdit();
      }}
      accessibilityRole="button"
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
        </View>

        <View style={styles.taskSettings}>
          <Text style={[styles.taskType, { color: subject?.color }]}>
            {subject ? `• ${subject.name}` : ""}
          </Text>
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

      {task.done && (
        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Image
            source={require("../../assets/images/icons/trash-icon.png")}
            style={styles.deleteIcon}
          />
        </Pressable>
      )}
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
        width: 260,
        color: Colors.text,
        fontSize: 12,
        fontFamily: Fonts.bold,
        marginLeft: 10
    },
    taskMain: {
        flexDirection: "row",
        alignItems: "center",
    },
    taskPressed: {
        opacity: 0.85,
    },
    checkboxTouch: {
        marginLeft: 10,
    },
    taskSettings: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 16
    },
    taskType: {
        fontSize: 8
    },
    taskUrgency: {
        borderWidth: 0.5,
        borderRadius: 50,
        paddingHorizontal: 8,
        paddingVertical: 1,
        fontSize: 8
    },
    deleteButton: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteIcon: {
        width: 16,
        height: 16,
        resizeMode: "contain",
    },
})