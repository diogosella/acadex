// Preferências de uso do app (seção "Preferências" e "Notificações" das
// configurações). Guardadas só no aparelho.
export interface AppPreferences {
  // Vibração leve ao trocar de aba, de mês, ajustar valores etc.
  hapticsEnabled: boolean;
  // Aviso que já vem selecionado no "Notificar" ao criar um evento
  // (minutos antes; null = não notificar).
  defaultNotifyBeforeMinutes: number | null;
}
