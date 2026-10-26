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
  clampPomodoroSetting,
  DEFAULT_POMODORO_SETTINGS,
} from "@/constants/pomodoro-options";
import { PomodoroSettings } from "@/types/pomodoro";

const STORAGE_KEY = "acadex:pomodoro-settings";

type PomodoroSettingsContextValue = {
  settings: PomodoroSettings;
  // true depois de ler as configurações salvas (antes disso vale o padrão).
  isLoaded: boolean;
  updateSettings: (changes: Partial<PomodoroSettings>) => void;
  resetSettings: () => void;
};

const PomodoroSettingsContext = createContext<PomodoroSettingsContextValue | undefined>(
  undefined
);

// Normaliza o que veio do armazenamento (ou de uma atualização): cada campo
// dentro dos limites, e o padrão para o que faltar ou for inválido.
function normalize(raw: Partial<Record<keyof PomodoroSettings, unknown>>): PomodoroSettings {
  return {
    focusMinutes: clampPomodoroSetting("focusMinutes", raw.focusMinutes),
    shortBreakMinutes: clampPomodoroSetting("shortBreakMinutes", raw.shortBreakMinutes),
    longBreakMinutes: clampPomodoroSetting("longBreakMinutes", raw.longBreakMinutes),
    cyclesBeforeLongBreak: clampPomodoroSetting(
      "cyclesBeforeLongBreak",
      raw.cyclesBeforeLongBreak
    ),
    soundEnabled:
      typeof raw.soundEnabled === "boolean"
        ? raw.soundEnabled
        : DEFAULT_POMODORO_SETTINGS.soundEnabled,
  };
}

export function PomodoroSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega as configurações salvas uma única vez ao iniciar o app. Até
  // terminar, vale o padrão (25/5/15, 4 ciclos).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings(normalize(JSON.parse(raw)));
      })
      .catch((error) => console.warn("[pomodoro] falha ao ler as configurações", error))
      .finally(() => setIsLoaded(true));
  }, []);

  // Persiste toda vez que as configurações mudarem (depois do load inicial).
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, isLoaded]);

  const updateSettings = useCallback((changes: Partial<PomodoroSettings>) => {
    setSettings((prev) => normalize({ ...prev, ...changes }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_POMODORO_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, isLoaded, updateSettings, resetSettings }),
    [settings, isLoaded, updateSettings, resetSettings]
  );

  return (
    <PomodoroSettingsContext.Provider value={value}>{children}</PomodoroSettingsContext.Provider>
  );
}

export function usePomodoroSettings() {
  const context = useContext(PomodoroSettingsContext);
  if (!context) {
    throw new Error(
      "usePomodoroSettings precisa ser usado dentro de um PomodoroSettingsProvider"
    );
  }
  return context;
}
