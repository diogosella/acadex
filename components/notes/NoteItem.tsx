import { useFonts } from "expo-font";
import { StyleSheet, Text, View } from "react-native";

export default function NoteItem() {

const [fontsLoaded] = useFonts({
    "gotham": require("../../assets/fonts/GothamBook.otf"),
    "gotham-regular": require("../../assets/fonts/GothamRegular.otf"),
    "gotham-bold": require("../../assets/fonts/GothamBold.otf"),
})

if (!fontsLoaded) {
    return undefined;
}

    return(
        <>
            <View style={styles.noteComponent}>
                <Text style={styles.NoteTitle}>Sem título</Text>
                <Text style={styles.NotePreview}>Este é um exemplo de um salvamento de texto no FATEC ACADE...</Text>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    noteComponent: {
       backgroundColor: "#AC191A",
       width: "100%",
       borderRadius: 10,
       padding: 14,
       marginBottom: 14
    },
    NoteTitle: {
        color: "white",
        fontFamily: "gotham-bold",
        fontSize: 22,
    },
    NotePreview: {
        color: "white",
        fontFamily: "gotham",
        fontSize: 10,
        lineHeight: 14,
        marginTop: 4
    }
})