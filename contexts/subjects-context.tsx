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

import { Subject } from "@/types/subject";

const STORAGE_KEY = "acadex:subjects";

type NewSubjectInput = {
  name: string;
  color: string;
};

type SubjectsContextValue = {
  subjects: Subject[];
  addSubject: (input: NewSubjectInput) => string;
  deleteSubject: (id: string) => void;
  getSubject: (id: string) => Subject | undefined;
};

const SubjectsContext = createContext<SubjectsContextValue | undefined>(undefined);

export function SubjectsProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega os assuntos salvos uma única vez ao iniciar o app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setSubjects(JSON.parse(raw));
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // Persiste toda vez que a lista de assuntos mudar (depois do load inicial).
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
  }, [subjects, isLoaded]);

  const addSubject = useCallback((input: NewSubjectInput) => {
    const id = Date.now().toString();
    const newSubject: Subject = {
      id,
      name: input.name,
      color: input.color,
      createdAt: Date.now(),
    };
    setSubjects((prev) => [...prev, newSubject]);
    return id;
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
  }, []);

  const getSubject = useCallback(
    (id: string) => subjects.find((subject) => subject.id === id),
    [subjects]
  );

  const value = useMemo(
    () => ({ subjects, addSubject, deleteSubject, getSubject }),
    [subjects, addSubject, deleteSubject, getSubject]
  );

  return <SubjectsContext.Provider value={value}>{children}</SubjectsContext.Provider>;
}

export function useSubjects() {
  const context = useContext(SubjectsContext);
  if (!context) {
    throw new Error("useSubjects precisa ser usado dentro de um SubjectsProvider");
  }
  return context;
}
