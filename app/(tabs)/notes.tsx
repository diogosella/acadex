import NoteItem from "@/components/notes/NoteItem";
import Header from "@/components/ui/Header";
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Notes() {

   const notes = [1,2,3,4,5,6,7];

  return (
    
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
            <Header title="Notas" />

            <FlatList
              style={styles.notesList}
              data={notes}
              keyExtractor={(item) => item.toString()}
              renderItem={() => <NoteItem />}
            />

            <View style={styles.createButton}>
              <Ionicons name="pencil-outline" size={32} color="white" style={styles.createIcon} />
            </View>

      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040F17"
  },
  safe: {
    flex: 1,
  },
  phText: {
    color: "#ffffff",
  },
  notesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  createButton: {
    width: 50,
    height: 50,
    position: "absolute",
    bottom: 20,
    right: 20,  
    borderRadius: 50,
    backgroundColor: "#AC191A",
    justifyContent: "center",
    boxShadow: '0 1px 20px black'
  },
  createIcon: {
    textAlign: "center",
  }
})
