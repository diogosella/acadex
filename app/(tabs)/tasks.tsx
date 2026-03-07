import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Tasks() {
  return (
      <View style={styles.container}>
    <SafeAreaView style={styles.safe}>
          <Text style={styles.phText}>ACADEX TAREFAS</Text>
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
  phText: {
    color: "#ffffff",
  }
})