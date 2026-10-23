import FocusStreak from "@/components/pomodoro/FocusStreak";
import TimerCircle from "@/components/pomodoro/TimerCircle";
import Header from "@/components/ui/Header";
import { Colors } from "@/constants/colors";
import { STREAK_DOT_COUNT } from "@/constants/pomodoro-options";
import { usePomodoro } from "@/contexts/pomodoro-context";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { completedToday } = usePomodoro();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* ScrollView como rede de segurança: em telas muito baixas
            (celular pequeno, paisagem, zoom de acessibilidade maior) o
            conteúdo pode rolar em vez de ficar cortado/invisível. Em telas
            normais, flexGrow:1 + justifyContent:"center" centraliza tudo
            verticalmente, sem precisar de margens fixas em pixels. */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Header title="Pomodoro" />
            <Image
              source={require("../../assets/images/settings.png")}
              style={styles.settings}
            />
          </View>

          <View style={styles.mainButton}>
            <TimerCircle />
          </View>

          <View style={styles.streakBar}>
            {Array.from({ length: STREAK_DOT_COUNT }, (_, index) => (
              <FocusStreak key={index} completed={index < completedToday} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    position: "relative",
  },
  mainButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  streakBar: {
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 32,
    flexDirection: "row",
    gap: 12,
    rowGap: 12,
  },
  settings: {
    width: 20,
    height: 20,
    position: "absolute",
    right: 20,
    top: 22,
  },
});
