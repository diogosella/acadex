import TaskCard from "@/components/tasks/TasksList";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import Header from "@/components/ui/Header";
import { Colors } from "@/constants/colors";
import { useTasks } from "@/contexts/tasks-context";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Tasks() {

  const { tasks, addTask, toggleTaskDone, deleteTask } = useTasks();
  const [formVisible, setFormVisible] = useState(false);

  return (
      <View style={styles.container}>
    <SafeAreaView style={styles.safe}>
          <Header title="Tarefas"/>

          <View style={styles.taskList}>

            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TaskCard
                  task={item}
                  onToggle={() => toggleTaskDone(item.id)}
                  onDelete={() => deleteTask(item.id)}
                />
              )}
            />
          </View>

          <Pressable style={styles.addButton} onPress={() => setFormVisible(true)}>
            <Ionicons name="add-outline" style={styles.addIcon} />
          </Pressable>

    </SafeAreaView>

      <TaskFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={(input) => addTask(input)}
      />
      </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  safe: {
    flex: 1
  },
  taskList: {
    alignSelf: "center",
    marginTop: 24
  },
  addButton: {
    position: "absolute",
    width: 50,
    height: 50,
    backgroundColor: Colors.primary,
    bottom: 30,
    right: 30,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    color: Colors.text,
    fontSize: 29,
  }
})