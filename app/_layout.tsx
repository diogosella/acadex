import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { EventsProvider } from "@/contexts/events-context";
import { NotesProvider } from "@/contexts/notes-context";
import { PomodoroProvider } from "@/contexts/pomodoro-context";
import { SubjectsProvider } from "@/contexts/subjects-context";
import { TasksProvider } from "@/contexts/tasks-context";

SplashScreen.preventAutoHideAsync();

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
      <SafeAreaProvider>
        <NotesProvider>
          <SubjectsProvider>
            <TasksProvider>
              <EventsProvider>
                <PomodoroProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                  </Stack>
                </PomodoroProvider>
              </EventsProvider>
            </TasksProvider>
          </SubjectsProvider>
        </NotesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
