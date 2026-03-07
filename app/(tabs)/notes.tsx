import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Notes() {
  return (
      <View style={styles.container}>
    <SafeAreaView style={styles.safe}>
          <Text style={styles.phText}>ACADEX NOTAS</Text>
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
