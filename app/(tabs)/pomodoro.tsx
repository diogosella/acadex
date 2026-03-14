import FocusStreak from "@/components/pomodoro/FocusStreak";
import TimerCircle from "@/components/pomodoro/TimerCircle";
import Header from "@/components/ui/Header";
import { Colors } from "@/constants/colors";
import { Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>

        <View>
          <Header title="Pomodoro" />
          <Image source={require("../../assets/images/settings.png")} style={styles.settings} />
        </View>

        <View style={styles.mainButton}>
          <TimerCircle />
        </View>

        <View style={styles.streakBar}>
          
          <FocusStreak />
          <FocusStreak />
          <FocusStreak />
          <FocusStreak />
          <FocusStreak />

        </View>

      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  safe: {
    flex: 1,
  },
    mainButton: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 180
  },
  streakBar: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 52,
    flexDirection: "row",
    gap: 12
  },
  settings: {
    width: 20,
    height: 20,
    position: "absolute",
    left: "90%",
    top: 23

  }
})
