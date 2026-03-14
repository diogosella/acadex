import { Colors } from "@/constants/colors";
import { useFonts } from "expo-font";
import { Image, StyleSheet, Text, View } from "react-native";

export default function TimerCircle() {

        const [fontsLoaded] = useFonts({
            "gotham": require("../../assets/fonts/GothamBook.otf"),
            "gotham-regular": require("../../assets/fonts/GothamRegular.otf"),
            "gotham-bold": require("../../assets/fonts/GothamBold.otf"),
        })
    
        if (!fontsLoaded) {
        return undefined;
    }

    return(
            <View style={styles.timerCircleButton}>
                <View style={styles.buttonText}>
                    <Text style={styles.textTitle}>ACADEX</Text>
                    <Text style={styles.textSubitle}>Tap to focus.</Text>
                    </View>
                    <Image source={require("../../assets/images/fatec-logo.png")} style={styles.logo}/>
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
        marginTop: 76,
    },
    textTitle: {
        color: Colors.background,
        fontSize: 48,
        fontFamily: "gotham-bold",
        includeFontPadding: false,
    },
    textSubitle: {
        color: Colors.background,
        fontSize: 20,
        includeFontPadding: false,
        fontFamily: "gotham",
    },
    logo: {
        width: 72,
        height: 31.9,
        marginTop: 40,
    }
})
