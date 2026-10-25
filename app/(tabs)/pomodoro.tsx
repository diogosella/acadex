import FocusStreak from "@/components/pomodoro/FocusStreak";
import RoundCelebration from "@/components/pomodoro/RoundCelebration";
import TimerCircle from "@/components/pomodoro/TimerCircle";
import Header from "@/components/ui/Header";
import { Colors, Fonts } from "@/constants/colors";
import { STREAK_DOT_COUNT } from "@/constants/pomodoro-options";
import { usePomodoro } from "@/contexts/pomodoro-context";
import { useProfile } from "@/contexts/profile-context";
import { hapticSuccess } from "@/lib/haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CELEBRATION_DELAY_MS = 900;

export default function HomeScreen() {
  const { roundCompleted, celebration, dismissCelebration } = usePomodoro();

  // Ao completar a rodada, a 5ª bolinha "estoura" primeiro; a parabenização
  // aparece logo depois (CELEBRATION_DELAY_MS). Enquanto isso, e com o popup
  // aberto, as bolinhas continuam todas cheias; ao fechar, zeram.
  const [celebrationReady, setCelebrationReady] = useState(false);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => {
      setCelebrationReady(true);
      hapticSuccess();
    }, CELEBRATION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [celebration]);

  const handleCloseCelebration = () => {
    setCelebrationReady(false);
    dismissCelebration();
  };

  const filledDots = celebration ? STREAK_DOT_COUNT : roundCompleted;
  const { profile } = useProfile();
  const firstName = profile.name.trim().split(/\s+/)[0];

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
            {/* Histórico de sessões (à esquerda, espelhando a engrenagem). */}
            <Pressable
              onPress={() => router.push("/history")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Histórico"
              style={({ pressed }) => [
                styles.settingsButton,
                styles.historyButton,
                pressed && styles.settingsPressed,
              ]}
            >
              <Ionicons name="stats-chart" size={19} color={Colors.text} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Configurações"
              style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
            >
              <Image
                source={require("../../assets/images/settings.png")}
                style={styles.settingsIcon}
              />
            </Pressable>
          </View>

          {firstName ? <Text style={styles.greeting}>Bons estudos, {firstName}!</Text> : null}

          <View style={styles.mainButton}>
            <TimerCircle />
          </View>

          {/* Tocar nos marcadores também abre o histórico. */}
          <Pressable
            onPress={() => router.push("/history")}
            accessibilityRole="button"
            accessibilityLabel={`${filledDots} de ${STREAK_DOT_COUNT} sessões nesta rodada. Abrir histórico`}
            style={styles.streakBar}
          >
            {Array.from({ length: STREAK_DOT_COUNT }, (_, index) => (
              <FocusStreak key={index} completed={index < filledDots} />
            ))}
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <RoundCelebration
        celebration={celebrationReady ? celebration : null}
        onClose={handleCloseCelebration}
      />
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
  settingsButton: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  historyButton: {
    right: undefined,
    left: 12,
  },
  settingsPressed: {
    backgroundColor: "#FFFFFF14",
  },
  settingsIcon: {
    width: 20,
    height: 20,
  },
  greeting: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 13,
    textAlign: "center",
  },
});
