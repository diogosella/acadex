import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function CalendarList() {

const daysArray30 = Array.from({ length: 31 }, (_, i) => i + 1);

const daysArray31 = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
            <ScrollView>
                {daysArray31.map((day) => (
                    <View key={day} style={styles.dayContainer}>
                        <Text style={styles.calendarDay}>{day}</Text>
                        <Text style={styles.addButton}>+</Text>
                        <View style={styles.hrLine} />
                    </View>
                    ))}
                    
                    {daysArray30.map((day) => (
                    <View key={day} style={styles.dayContainer}>
                        <Text style={styles.calendarDay}>{day}</Text>
                        <Text style={styles.addButton}>+</Text>
                        <View style={styles.hrLine} />
                    </View>
                    ))}
            </ScrollView>
    );
}

const styles = StyleSheet.create({
    calendarComponent: {
      overflowY: "auto",  
    },
    dayContainer: {
        flexDirection: "column",
        marginTop: 20,
    },
    calendarDay: {
        color: "white",
        marginLeft: 25,
        fontFamily: "gotham-bold"
    },
    hrLine: {
        width: "85%",
        alignSelf: "center",
        borderTopWidth: 0.2,
        borderTopColor: "#FFFFFF25",
    },
    addButton: {
        color: "white",
        alignSelf: "flex-end",
        fontSize: 18,
        marginRight: 35,
        marginBottom: 12
    }
})