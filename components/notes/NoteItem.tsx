import { Colors, Fonts } from "@/constants/colors";
import { Note } from "@/types/note";
import { Pressable, StyleSheet, Text } from "react-native";

type NoteItemProps = {
  note: Note;
  onPress: () => void;
};

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

// "Editada hoje, 14:30", "Editada ontem, 09:05", "Editada em 23 out" (com o
// ano, se for de outro ano). Nunca editada: "Criada …".
function formatNoteTimestamp(note: Note): string {
  const edited = note.updatedAt !== undefined;
  const date = new Date(note.updatedAt ?? note.createdAt);
  const verb = edited ? "Editada" : "Criada";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  if (date.getTime() >= startOfToday) return `${verb} hoje, ${time}`;
  if (date.getTime() >= startOfToday - dayMs) return `${verb} ontem, ${time}`;
  const day = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear()
    ? `${verb} em ${day}`
    : `${verb} em ${day} ${date.getFullYear()}`;
}

export default function NoteItem({ note, onPress }: NoteItemProps) {
  const title = note.title.trim() || "Sem título";
  const preview = note.content.slice(0, 60);

  return (
    <Pressable style={styles.noteComponent} onPress={onPress}>
      <Text style={styles.NoteTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.NotePreview} numberOfLines={2}>{preview}</Text>
      <Text style={styles.noteDate}>{formatNoteTimestamp(note)}</Text>
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
    },
    noteDate: {
        color: "#FFFFFFB3",
        fontFamily: Fonts.book,
        fontSize: 10,
        marginTop: 8
    }
})