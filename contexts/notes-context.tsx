import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Note } from "@/types/note";

const STORAGE_KEY = "acadex:notes";

type NotesContextValue = {
  notes: Note[];
  addNote: () => string;
  updateNote: (id: string, changes: Partial<Pick<Note, "title" | "content">>) => void;
  deleteNote: (id: string) => void;
  getNote: (id: string) => Note | undefined;
};

const NotesContext = createContext<NotesContextValue | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega as notas salvas uma única vez ao iniciar o app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setNotes(JSON.parse(raw));
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // Persiste toda vez que a lista de notas mudar (depois do load inicial).
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, isLoaded]);

  const addNote = useCallback(() => {
    const id = Date.now().toString();
    const newNote: Note = {
      id,
      title: "",
      content: "",
      createdAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    return id;
  }, []);

  // Grava a data de atualização só quando o texto muda de fato (abrir e
  // fechar uma nota sem mexer não conta como edição).
  const updateNote = useCallback(
    (id: string, changes: Partial<Pick<Note, "title" | "content">>) => {
      const now = Date.now();
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id !== id) return note;
          const changed =
            (changes.title !== undefined && changes.title !== note.title) ||
            (changes.content !== undefined && changes.content !== note.content);
          return changed ? { ...note, ...changes, updatedAt: now } : note;
        })
      );
    },
    []
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const getNote = useCallback(
    (id: string) => notes.find((note) => note.id === id),
    [notes]
  );

  // Lista mostrada: editadas mais recentemente primeiro (a ordem salva não
  // muda).
  const sortedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)
      ),
    [notes]
  );

  const value = useMemo(
    () => ({ notes: sortedNotes, addNote, updateNote, deleteNote, getNote }),
    [sortedNotes, addNote, updateNote, deleteNote, getNote]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes precisa ser usado dentro de um NotesProvider");
  }
  return context;
}
