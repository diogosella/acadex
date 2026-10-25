import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Ponto único de vibração do app. Todos os toques com vibração chamam
// hapticSelection(), que respeita a preferência "Vibração" das
// configurações. A preferência é aplicada aqui pelo PreferencesProvider
// (setHapticsEnabled), assim os componentes não precisam ler o contexto.
let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

// Vibração leve de "seleção" (troca de aba, de mês, ajuste de valor...).
export function hapticSelection(): void {
  if (!hapticsEnabled || Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}

// Vibração de "sucesso" (ex: completar uma rodada de focos).
export function hapticSuccess(): void {
  if (!hapticsEnabled || Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
