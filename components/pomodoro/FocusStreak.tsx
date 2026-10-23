import { Colors } from "@/constants/colors";
import { Image, StyleSheet, View } from "react-native";

type FocusStreakProps = {
  completed: boolean;
};

export default function FocusStreak({ completed }: FocusStreakProps) {
  return (
    <View style={styles.streakdot}>
      {completed ? (
        <View style={styles.dotFilled} />
      ) : (
        <View style={styles.dot}>
          <Image
            source={require("../../assets/images/current-dot.png")}
            style={styles.dotIcon}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    borderRadius: 50,
  },
  dotFilled: {
    width: 20,
    height: 20,
    borderRadius: 50,
    backgroundColor: Colors.primary,
  },
  streakdot: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotIcon: {
    width: 10,
    height: 2,
  },
});
