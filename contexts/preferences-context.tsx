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

import {
  DEFAULT_NOTIFY_BEFORE_MINUTES,
  NOTIFY_BEFORE_OPTIONS,
} from "@/constants/event-options";
import { setHapticsEnabled } from "@/lib/haptics";
import { AppPreferences } from "@/types/preferences";

const STORAGE_KEY = "acadex:preferences";

export const DEFAULT_PREFERENCES: AppPreferences = {
  hapticsEnabled: true,
  defaultNotifyBeforeMinutes: DEFAULT_NOTIFY_BEFORE_MINUTES,
};

type PreferencesContextValue = {
  preferences: AppPreferences;
  updatePreferences: (changes: Partial<AppPreferences>) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

// Aceita só valores válidos (ex: um aviso que exista nas opções); o resto
// volta para o padrão.
function normalize(raw: Partial<Record<keyof AppPreferences, unknown>>): AppPreferences {
  const notify = raw.defaultNotifyBeforeMinutes;
  const notifyIsValid = NOTIFY_BEFORE_OPTIONS.some((option) => option.minutes === notify);
  return {
    hapticsEnabled:
      typeof raw.hapticsEnabled === "boolean"
        ? raw.hapticsEnabled
        : DEFAULT_PREFERENCES.hapticsEnabled,
    defaultNotifyBeforeMinutes: notifyIsValid
      ? (notify as number | null)
      : DEFAULT_PREFERENCES.defaultNotifyBeforeMinutes,
  };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega as preferências salvas uma única vez ao iniciar o app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setPreferences(normalize(JSON.parse(raw)));
      })
      .catch((error) => console.warn("[preferências] falha ao ler", error))
      .finally(() => setIsLoaded(true));
  }, []);

  // Persiste toda vez que mudarem (depois do load inicial).
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences, isLoaded]);

  // A vibração é aplicada direto no módulo lib/haptics (ver comentário lá).
  useEffect(() => {
    setHapticsEnabled(preferences.hapticsEnabled);
  }, [preferences.hapticsEnabled]);

  const updatePreferences = useCallback((changes: Partial<AppPreferences>) => {
    setPreferences((prev) => normalize({ ...prev, ...changes }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(
    () => ({ preferences, updatePreferences, resetPreferences }),
    [preferences, updatePreferences, resetPreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences precisa ser usado dentro de um PreferencesProvider");
  }
  return context;
}
