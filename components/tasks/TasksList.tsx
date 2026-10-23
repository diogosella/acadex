import { Colors, Fonts } from "@/constants/colors";
import { getPriorityOption } from "@/constants/task-options";
import { useSubjects } from "@/contexts/subjects-context";
import { Task } from "@/types/task";
import Checkbox from "expo-checkbox";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type TaskCardProps = {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
};

export default function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const priorityOption = getPriorityOption(task.priority);
  const { getSubject } = useSubjects();
  const subject = task.subjectId ? getSubject(task.subjectId) : undefined;

  return (
    <View style={styles.taskComponent}>
      <View style={styles.taskContent}>
        <View style={styles.taskMain}>
          <Checkbox
            style={styles.checkbox}
            value={task.done}
            onValueChange={onToggle}
            color={task.done ? Colors.primary : undefined}
          />
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
    </View>
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
    checkbox: {
        marginLeft: 10
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