import TaskList from "@/components/tasks/TasksList";
import Header from "@/components/ui/Header";
import { Colors } from "@/constants/colors";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Tasks() {

  const tasks = [1, 2, 3, 4, 5, 6]

  const navigation = useNavigation();

  return (
      <View style={styles.container}>
    <SafeAreaView style={styles.safe}>
          <Header title="Tarefas"/>

          <View style={styles.taskList}>

            <FlatList
              data={tasks}
              keyExtractor={(item) => item.toString()}
              renderItem={() => <TaskList />}
            />
          </View>

          <Pressable style={styles.addButton} onPress={() => navigation.navigate('pomodoro' as never)}>
            <Ionicons name="add-outline" style={styles.addIcon} />
          </Pressable>

    </SafeAreaView>
      </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040F17"
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
    color: "white",
    fontSize: 29,
  }
})