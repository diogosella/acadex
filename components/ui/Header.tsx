import { StyleSheet, Text, View } from "react-native";

export default function Header() {
    return(
        <View style={styles.header}>
            <Text style={styles.headerText}>Pomodoro</Text>
        </View>
    ) 
}

const styles = StyleSheet.create({
    header: {
        width: "100%",
        height: 64,
        alignItems: "center",
        justifyContent: "center",
    },
    headerText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#ffffff"
    }
})