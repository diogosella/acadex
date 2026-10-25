import { Colors, Fonts } from "@/constants/colors";
import { formatFocusDuration } from "@/constants/pomodoro-options";
import { PomodoroRoundCelebration } from "@/types/pomodoro";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

type RoundCelebrationProps = {
  // null = fechado.
  celebration: PomodoroRoundCelebration | null;
  onClose: () => void;
};

// Parabenização ao completar uma rodada de focos (todas as bolinhas): mostra
// quantas sessões foram feitas e o tempo total de foco da rodada. Depois de
// fechar, as bolinhas recomeçam do zero.
export default function RoundCelebration({ celebration, onClose }: RoundCelebrationProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={celebration !== null}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {celebration && (
          <Pressable style={styles.card}>
            <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.badge}>
              <Ionicons name="checkmark" size={44} color={Colors.text} />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(150).duration(300)} style={styles.content}>
              <Text style={styles.title}>Parabéns!</Text>
              <Text style={styles.message}>
                Você completou {celebration.sessions} sessões de foco, somando{" "}
                <Text style={styles.highlight}>{formatFocusDuration(celebration.focusMs)}</Text>{" "}
                de estudo.
              </Text>
              <Text style={styles.note}>Seus marcadores de progresso recomeçam para uma nova rodada.</Text>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              >
                <Text style={styles.buttonText}>Continuar</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000C0",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: `${Colors.primary}66`,
    borderRadius: 20,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 36,
  },
  badge: {
    position: "absolute",
    top: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: Colors.background,
  },
  content: {
    alignItems: "center",
    alignSelf: "stretch",
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 24,
  },
  message: {
    color: "#FFFFFFCC",
    fontFamily: Fonts.book,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },
  highlight: {
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  note: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
  button: {
    alignSelf: "stretch",
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
});
