import { Colors } from "@/constants/colors";
import { Image, StyleSheet, View } from "react-native";

export default function FocusStreak() {



    return (
        <View style={styles.streakdot}>
            <View style={styles.dot}>
                <Image source={require("../../assets/images/current-dot.png")}
                style={styles.dotIcon} />
            </View>
                <View
                // style={styles.dotBar}
                />
        </View>
    )
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
    streakdot: {
        flexDirection: "row",
        alignItems: "center",
    },
    dotIcon: {
        width: 10,
        height: 2,
    },

    // dotBar: {
    //     width: 20,
    //     height: 8,
    //     left: 18,
    //     position: "absolute",
    //     backgroundColor: Colors.primary,
    //     zIndex: -1,

    // 
})