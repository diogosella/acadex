import { Colors } from "@/constants/colors";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import CheckBox from "react-native-check-box";

export default function TaskList() {

        const [isChecked, setIsChecked] = useState(false);

    return (
        <>
                <View style={styles.taskComponent}>

                    <View style={styles.taskContent}>

                        <View style={styles.taskMain}>
                            <CheckBox style={styles.checkbox}
                            checkBoxColor={"white"}
                            isChecked={isChecked}
                            onClick={() => setIsChecked(!isChecked)} />
                            <Text style={styles.taskTitle}>Estudar para prova de Engenharia de Software</Text>
                        </View>


                        <View style={styles.taskSettings}>
                            <Text style={styles.taskType}>• Engenharia de Software</Text>
                            <Text style={styles.taskUrgency}>Urgente</Text>
                        </View>

                    </View>

                </View>
        </>
    ) 
}

const styles = StyleSheet.create({
    taskComponent: {
        width: 341,
        height: 104,
        backgroundColor: Colors.tasksBg,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 10,
        justifyContent: "center",
        marginBottom: 16
    },
    taskContent: {
        flexDirection: "column"
    },
    taskTitle: {
        width: 284,
        color: "white",
        fontSize: 12,
        fontFamily: "gotham-bold",
        marginLeft: 10
    },
    taskMain: {
        flexDirection: "row"
    },
    checkbox: {
        marginLeft: 10
    },
    taskSettings: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 16
    },
    taskType: {
        color:"#458FFF",
        fontSize: 8
    },
    taskUrgency: {
        color: Colors.primary,
        borderWidth: 0.5,
        borderColor: "red",
        borderRadius: 50,
        paddingHorizontal: 8,
        paddingVertical: 1,
        fontSize: 8
    }
})
