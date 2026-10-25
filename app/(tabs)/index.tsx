import { getLaunchNotificationTarget } from "@/hooks/use-notification-navigation";
import { Redirect } from "expo-router";
import { useState } from "react";

// Rota inicial: só redireciona. Normalmente para o Pomodoro; se o app foi
// aberto pelo toque numa notificação de evento, direto para o Calendário
// (ver hooks/use-notification-navigation.ts).
export default function TabsIndex() {
  // Lido uma única vez (inicializador do useState), na primeira montagem.
  const [target] = useState(() => getLaunchNotificationTarget() ?? "/pomodoro");

  return <Redirect href={target} />;
}
