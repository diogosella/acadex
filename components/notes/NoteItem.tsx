import { Colors, Fonts } from "@/constants/colors";
import { Note } from "@/types/note";
import { Pressable, StyleSheet, Text } from "react-native";

type NoteItemProps = {
  note: Note;
  onPress: () => void;
};

export default function NoteItem({ note, onPress }: NoteItemProps) {
  const title = note.title.trim() || "Sem título";
  const preview = note.content.slice(0, 60);

  return (
    <Pressable style={styles.noteComponent} onPress={onPress}>
      <Text style={styles.NoteTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.NotePreview} numberOfLines={2}>{preview}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
    noteComponent: {
       backgroundColor: Colors.primary,
       width: "100%",
       borderRadius: 10,
       padding: 14,
       marginBottom: 14
    },
    NoteTitle: {
        color: Colors.text,
        fontFamily: Fonts.bold,
        fontSize: 22,
    },
    NotePreview: {
        color: Colors.text,
        fontFamily: Fonts.book,
        fontSize: 10,
        lineHeight: 14,
        marginTop: 4
    }
})