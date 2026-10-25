import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import AppTabBar from "@/components/ui/AppTabBar";
import { Colors } from "@/constants/colors";
import { useNotificationNavigation } from "@/hooks/use-notification-navigation";

export default function TabLayout() {
  useNotificationNavigation();

  return (
    <Tabs
      // Barra de abas própria: pílula vermelha na aba ativa, sem o ripple
      // circular padrão do Android. Ver components/ui/AppTabBar.tsx.
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,

        // Troca de abas mais fluida:
        // - lazy: false monta todas as abas logo na abertura do app (atrás
        //   da splash), então trocar de aba não precisa mais renderizar a
        //   tela inteira na hora do toque — era isso que causava o atraso,
        //   principalmente no Calendário.
        // - freezeOnBlur congela as abas fora de foco: elas não re-renderizam
        //   em segundo plano (ex: o timer do Pomodoro atualizando a cada
        //   segundo enquanto você está em outra aba).
        // - animation "shift": transição curta (150 ms) com deslize sutil,
        //   em vez de a tela trocar de uma vez.
        // - sceneStyle com a cor de fundo do app: evita um fundo branco
        //   aparecendo durante a transição.
        lazy: false,
        freezeOnBlur: true,
        animation: "shift",
        sceneStyle: { backgroundColor: Colors.background },
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
            <Ionicons name="timer-outline" size={20} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notes"
        options={{
          title: "Notas",
          tabBarIcon: ({ color }) => (
            <Ionicons name="create-outline" size={20} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendário",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tarefas",
          tabBarIcon: ({ color }) => (
            <Ionicons name="checkbox-outline" size={20} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
