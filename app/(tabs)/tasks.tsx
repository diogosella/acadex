import TaskCard from "@/components/tasks/TasksList";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import EmptyState from "@/components/ui/EmptyState";
import Header from "@/components/ui/Header";
import { Colors } from "@/constants/colors";
import { useTasks } from "@/contexts/tasks-context";
import { Task } from "@/types/task";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Tasks() {

  const { tasks, addTask, updateTask, toggleTaskDone, deleteTask } = useTasks();
  const [formVisible, setFormVisible] = useState(false);
  // Tarefa aberta para edição (null = formulário de criação).
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const closeForm = () => {
    setFormVisible(false);
    setEditingTask(null);
  };

  return (
      <View style={styles.container}>
    <SafeAreaView style={styles.safe}>
          <Header title="Tarefas"/>

          <View style={styles.taskList}>

            <FlatList
              contentContainerStyle={styles.taskListContent}
              data={tasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TaskCard
                  task={item}
                  onToggle={() => toggleTaskDone(item.id)}
                  onDelete={() => deleteTask(item.id)}
                  onEdit={() => setEditingTask(item)}
                />
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="checkbox-outline"
                  title="Nenhuma tarefa por aqui"
                  description="Adicione trabalhos, provas e entregas para acompanhar o que falta fazer."
                />
              }
            />
          </View>

          <Pressable style={styles.addButton} onPress={() => setFormVisible(true)}>
            <Ionicons name="add-outline" style={styles.addIcon} />
          </Pressable>

    </SafeAreaView>

      <TaskFormModal
        visible={formVisible || editingTask !== null}
        task={editingTask}
        onClose={closeForm}
        onSubmit={(input) =>
          editingTask ? updateTask(editingTask.id, input) : addTask(input)
        }
        onDelete={deleteTask}
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
  // A lista ocupa a tela toda (para o placeholder de vazia ficar
  // centralizado) e os cards continuam centralizados horizontalmente.
  taskList: {
    flex: 1,
    marginTop: 24
  },
  taskListContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 96,
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