import NoteItem from "@/components/notes/NoteItem";
import Header from "@/components/ui/Header";
import { Colors } from "@/constants/colors";
import { useNotes } from "@/contexts/notes-context";
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Notes() {

  const { notes, addNote } = useNotes();

  const handleCreateNote = () => {
    const id = addNote();
    router.push(`/note/${id}`);
  };

  return (

    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
            <Header title="Notas" />

            <FlatList
              style={styles.notesList}
              data={notes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <NoteItem note={item} onPress={() => router.push(`/note/${item.id}`)} />
              )}
            />

            <Pressable style={styles.createButton} onPress={handleCreateNote}>
              <Ionicons name="pencil-outline" size={32} color={Colors.text} style={styles.createIcon} />
            </Pressable>

      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  safe: {
    flex: 1,
  },
  phText: {
    color: Colors.text,
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
    backgroundColor: Colors.primary,
    justifyContent: "center",
    boxShadow: '0 1px 20px black'
  },
  createIcon: {
    textAlign: "center",
  }
})
