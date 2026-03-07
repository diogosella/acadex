import { Colors } from "@/constants/colors";
import { Text, View, StyleSheet, Image } from "react-native";

export default function TimerCircle() {
    return(
            <View style={styles.timerCircleButton}>
                <View style={styles.buttonText}>
                    <Text style={styles.textTitle}>ACADEX</Text>
                    <Text style={styles.textSubitle}>Tap to focus.</Text>
                    </View>
                    <Image source={require("../assets/images/fatec-logo.png")} style={styles.logo}/>
            </View>
    )
}

const styles = StyleSheet.create({
    timerCircleButton: {
        width: 278,
        height: 278,
        borderRadius: 139,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    buttonText: {
        alignItems: "center",
        marginTop: 68,
    },
    textTitle: {
        color: Colors.background,
        fontSize: 48,
        fontWeight: "bold",
        includeFontPadding: false
    },
    textSubitle: {
        color: Colors.background,
        fontSize: 20,
        includeFontPadding: false
    },
    logo: {
        width: 72,
        height: 31.9,
        marginTop: 40,
    }
})
