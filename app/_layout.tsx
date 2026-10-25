import { useFonts } from "expo-font";
// No SDK 56+ o Expo Router não aceita importar "@react-navigation/native"
// direto: tema e ThemeProvider vêm do próprio expo-router.
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { EventsProvider } from "@/contexts/events-context";
import { NotesProvider } from "@/contexts/notes-context";
import { PomodoroProvider } from "@/contexts/pomodoro-context";
import { PomodoroHistoryProvider } from "@/contexts/pomodoro-history-context";
import { PomodoroSettingsProvider } from "@/contexts/pomodoro-settings-context";
import { PreferencesProvider } from "@/contexts/preferences-context";
import { ProfileProvider } from "@/contexts/profile-context";
import { SubjectsProvider } from "@/contexts/subjects-context";
import { Colors } from "@/constants/colors";
import { TasksProvider } from "@/contexts/tasks-context";

SplashScreen.preventAutoHideAsync();

// Tema escuro da navegação com as cores do app. Sem isso o React Navigation
// usa o tema claro, e o fundo branco dele aparece por um instante nas
// transições (troca de abas, abrir/fechar uma nota).
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    gotham: require("../assets/fonts/GothamBook.otf"),
    "gotham-regular": require("../assets/fonts/GothamRegular.otf"),
    "gotham-bold": require("../assets/fonts/GothamBold.otf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <SafeAreaProvider>
          <PreferencesProvider>
            <NotesProvider>
              <SubjectsProvider>
                <TasksProvider>
                  <EventsProvider>
                    <ProfileProvider>
                      {/* As configurações vêm antes do Pomodoro: o timer lê as
                          durações e ciclos delas. */}
                      <PomodoroSettingsProvider>
                        {/* O histórico vem antes do Pomodoro: o timer registra as sessões nele. */}
                        <PomodoroHistoryProvider>
                          <PomodoroProvider>
                            <Stack screenOptions={{ headerShown: false }}>
                              <Stack.Screen name="(tabs)" />
                            </Stack>
                          </PomodoroProvider>
                        </PomodoroHistoryProvider>
                      </PomodoroSettingsProvider>
                    </ProfileProvider>
                  </EventsProvider>
                </TasksProvider>
              </SubjectsProvider>
            </NotesProvider>
          </PreferencesProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
