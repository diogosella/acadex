import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useNotificationNavigation } from "@/hooks/use-notification-navigation";

export default function TabLayout() {
  useNotificationNavigation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#A9ABAE",

        tabBarStyle: {
          backgroundColor: "#040F17",
          height: 120,
          borderTopWidth: 0,
          paddingTop: 10,
        },

        tabBarLabelStyle: {
          fontSize: 8,
          marginBottom: 5,
          fontFamily: "gotham",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="pomodoro"
        options={{
          title: "Pomodoro",
          tabBarIcon: ({ color }) => (
            <Ionicons name="timer-outline" size={18} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notes"
        options={{
          title: "Notas",
          tabBarIcon: ({ color }) => (
            <Ionicons name="create-outline" size={18} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendário",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={18} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tarefas",
          tabBarIcon: ({ color }) => (
            <Ionicons name="checkbox-outline" size={18} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
