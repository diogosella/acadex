import { StyleSheet, Text, View } from "react-native";

type HeaderProps = {
    title: string
}

export default function Header({title}: HeaderProps) {
    return(
        <View style={styles.header}>
            <Text style={styles.headerText}>{title}</Text>
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