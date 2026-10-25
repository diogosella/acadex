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

import { UserProfile } from "@/types/user";

const STORAGE_KEY = "acadex:profile";

const EMPTY_PROFILE: UserProfile = { name: "", course: "" };

type ProfileContextValue = {
  profile: UserProfile;
  updateProfile: (changes: Partial<UserProfile>) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega o perfil salvo uma única vez ao iniciar o app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<UserProfile>;
        setProfile({
          name: typeof saved.name === "string" ? saved.name : "",
          course: typeof saved.course === "string" ? saved.course : "",
        });
      })
      .catch((error) => console.warn("[perfil] falha ao ler o perfil", error))
      .finally(() => setIsLoaded(true));
  }, []);

  // Persiste toda vez que o perfil mudar (depois do load inicial).
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile, isLoaded]);

  const updateProfile = useCallback((changes: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...changes }));
  }, []);

  const value = useMemo(() => ({ profile, updateProfile }), [profile, updateProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile precisa ser usado dentro de um ProfileProvider");
  }
  return context;
}
