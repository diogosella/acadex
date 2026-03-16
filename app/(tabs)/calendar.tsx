import CalendarList from "@/components/calendar/CalendarList";
import Header from "@/components/ui/Header";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Calendar() {

  const months = [
  { name: "Janeiro", days: 31 },
  { name: "Fevereiro", days: 28 },
  { name: "Março", days: 31 },
  { name: "Abril", days: 30 },
  { name: "Maio", days: 31 },
  { name: "Junho", days: 30 },
  { name: "Julho", days: 31 },
  { name: "Agosto", days: 30 },
  { name: "Setembro", days: 31 },
  { name: "Outubro", days: 30 },
  { name: "Novembro", days: 31 },
  { name: "Dezembro", days: 30 },
]

  return (
      <View style={styles.container}>
    <SafeAreaView style={styles.safe}>
      <Header title="Calendário" />
          <Text style={styles.monthName}>{months[0].name}</Text>
          <CalendarList/>
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
    monthName: {
      marginLeft: 25,
      marginTop: 35,
      marginBottom: 35,
      fontSize: 32,
      fontFamily: "gotham-bold",
      color: "white",
    }
})