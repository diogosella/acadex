import { Colors } from "@/constants/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type FocusStreakProps = {
  completed: boolean;
};

const DOT_SIZE = 22;

// Uma bolinha da rodada de focos. Ao ser completada, a bolinha vermelha com
// um check "estoura" por cima da vazia (cresce passando um pouco do tamanho
// e volta, efeito de mola); ao recomeçar a rodada, some suavemente.
export default function FocusStreak({ completed }: FocusStreakProps) {
  const progress = useSharedValue(completed ? 1 : 0);
  const wasCompleted = useRef(completed);

  useEffect(() => {
    if (completed && !wasCompleted.current) {
      progress.set(
        withSequence(
          withTiming(0, { duration: 0 }),
          withSpring(1, { damping: 8, stiffness: 220, mass: 0.6 })
        )
      );
    } else {
      progress.set(withTiming(completed ? 1 : 0, { duration: 220 }));
    }
    wasCompleted.current = completed;
  }, [completed, progress]);

  const filledStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.5),
    transform: [{ scale: progress.value }],
  }));

  return (
    <View
      style={styles.wrapper}
      accessibilityLabel={completed ? "Sessão de foco completada" : "Sessão de foco pendente"}
    >
      <View style={styles.dot}>
        <Image source={require("../../assets/images/current-dot.png")} style={styles.dotIcon} />
      </View>

      <Animated.View style={[styles.filled, filledStyle]}>
        <Ionicons name="checkmark" size={14} color={Colors.text} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: DOT_SIZE,
    height: DOT_SIZE,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  dotIcon: {
    width: 10,
    height: 2,
  },
  filled: {
    position: "absolute",
    top: 0,
    left: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
