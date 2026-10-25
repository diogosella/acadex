import { Colors, Fonts } from "@/constants/colors";
import {
  DEFAULT_POMODORO_SETTINGS,
  DEV_QUICK_FOCUS_SECONDS,
  POMODORO_SETTING_LIMITS,
} from "@/constants/pomodoro-options";
import { NOTIFY_BEFORE_OPTIONS } from "@/constants/event-options";
import { usePomodoro } from "@/contexts/pomodoro-context";
import { usePomodoroSettings } from "@/contexts/pomodoro-settings-context";
import { DEFAULT_PREFERENCES, usePreferences } from "@/contexts/preferences-context";
import { useProfile } from "@/contexts/profile-context";
import {
  ensureNotificationPermissions,
  getNotificationPermissionStatus,
  NotificationPermissionStatus,
} from "@/lib/event-notifications";
import { hapticSelection } from "@/lib/haptics";
import { PomodoroSettings } from "@/types/pomodoro";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Tela de configurações (aberta pela engrenagem do Pomodoro). Cobre as
// classes "Usuário" (perfil local: nome e curso) e "Configuração Pomodoro"
// (durações e ciclos) do diagrama, mais preferências de uso: status das
// notificações e aviso padrão dos eventos, vibração e o acesso a "Sobre e
// ajuda". Tudo é salvo na hora, sem botão de salvar.

type SettingRowConfig = {
  key: keyof PomodoroSettings;
  label: string;
  description: string;
  unit: string;
};

const SETTING_ROWS: SettingRowConfig[] = [
  {
    key: "focusMinutes",
    label: "Foco",
    description: "Duração de cada sessão de estudo",
    unit: "min",
  },
  {
    key: "shortBreakMinutes",
    label: "Pausa curta",
    description: "Descanso entre as sessões de foco",
    unit: "min",
  },
  {
    key: "longBreakMinutes",
    label: "Pausa longa",
    description: "Descanso maior depois de alguns ciclos",
    unit: "min",
  },
  {
    key: "cyclesBeforeLongBreak",
    label: "Ciclos até a pausa longa",
    description: "Sessões de foco antes da pausa longa",
    unit: "",
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function SettingsScreen() {
  const { profile, updateProfile } = useProfile();
  const { settings, updateSettings, resetSettings } = usePomodoroSettings();
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const { phase } = usePomodoro();
  const [confirmResetVisible, setConfirmResetVisible] = useState(false);
  const notificationStatus = useNotificationStatus();

  const initials = getInitials(profile.name);
  const isDefault =
    SETTING_ROWS.every(({ key }) => settings[key] === DEFAULT_POMODORO_SETTINGS[key]) &&
    preferences.hapticsEnabled === DEFAULT_PREFERENCES.hapticsEnabled &&
    preferences.defaultNotifyBeforeMinutes === DEFAULT_PREFERENCES.defaultNotifyBeforeMinutes;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Configurações</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Perfil */}
          <Text style={styles.sectionTitle}>Perfil</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                {initials ? (
                  <Text style={styles.avatarText}>{initials}</Text>
                ) : (
                  <Ionicons name="person" size={26} color={Colors.text} />
                )}
              </View>

              <View style={styles.profileFields}>
                <Text style={styles.fieldLabel}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={profile.name}
                  onChangeText={(name) => updateProfile({ name })}
                  autoCapitalize="words"
                  returnKeyType="next"
                />

                <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Curso</Text>
                <TextInput
                  style={styles.input}
                  value={profile.course}
                  onChangeText={(course) => updateProfile({ course })}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {/* Pomodoro */}
          <Text style={styles.sectionTitle}>Pomodoro</Text>
          <View style={styles.card}>
            {SETTING_ROWS.map((row, index) => (
              <SettingStepper
                key={row.key}
                config={row}
                value={settings[row.key]}
                onChange={(value) => updateSettings({ [row.key]: value })}
                showDivider={index < SETTING_ROWS.length - 1}
              />
            ))}
          </View>

          {phase !== "idle" && (
            <Text style={styles.note}>
              Há uma sessão em andamento: as mudanças valem a partir da próxima fase.
            </Text>
          )}

          {/* Notificações */}
          <Text style={styles.sectionTitle}>Notificações</Text>
          <View style={styles.card}>
            <View style={[styles.settingRow, styles.settingDivider]}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Avisos de eventos</Text>
                <Text style={styles.settingDescription}>
                  {NOTIFICATION_STATUS_TEXT[notificationStatus.status]}
                </Text>
              </View>
              <NotificationStatusAction
                status={notificationStatus.status}
                onRequest={notificationStatus.request}
              />
            </View>

            <View style={styles.notifyDefault}>
              <Text style={styles.settingLabel}>Aviso padrão</Text>
              <Text style={styles.settingDescription}>
                Já vem selecionado ao criar um evento
              </Text>
              <View style={styles.chips}>
                {NOTIFY_BEFORE_OPTIONS.map((option) => {
                  const selected = option.minutes === preferences.defaultNotifyBeforeMinutes;
                  return (
                    <Pressable
                      key={option.label}
                      onPress={() => {
                        if (selected) return;
                        hapticSelection();
                        updatePreferences({ defaultNotifyBeforeMinutes: option.minutes });
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {shortNotifyLabel(option.minutes)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Preferências */}
          <Text style={styles.sectionTitle}>Preferências</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Vibração</Text>
                <Text style={styles.settingDescription}>
                  Vibração leve ao trocar de aba, de mês e ajustar valores
                </Text>
              </View>
              <Switch
                value={preferences.hapticsEnabled}
                onValueChange={(hapticsEnabled) => updatePreferences({ hapticsEnabled })}
                trackColor={{ false: "#FFFFFF26", true: Colors.primary }}
                thumbColor={Colors.text}
                accessibilityLabel="Vibração"
              />
            </View>
          </View>

          {/* Ajuda */}
          <Text style={styles.sectionTitle}>Ajuda</Text>
          <Pressable
            onPress={() => router.push("/about")}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, styles.linkRow, pressed && styles.linkPressed]}
          >
            <Ionicons name="help-circle-outline" size={22} color={Colors.text} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Sobre e ajuda</Text>
              <Text style={styles.settingDescription}>
                Como usar o ACADEX, perguntas frequentes e créditos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF80" />
          </Pressable>

          <Pressable
            onPress={() => setConfirmResetVisible(true)}
            disabled={isDefault}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetPressed,
              isDefault && styles.resetDisabled,
            ]}
          >
            <Ionicons name="refresh" size={16} color={Colors.text} />
            <Text style={styles.resetText}>Restaurar configurações</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* Confirmação antes de restaurar (mesmo padrão visual da exclusão de
          evento/nota). Só as configurações do Pomodoro voltam ao padrão; o
          perfil não muda. */}
      <Modal
        transparent
        animationType="fade"
        visible={confirmResetVisible}
        onRequestClose={() => setConfirmResetVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setConfirmResetVisible(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Restaurar configurações?</Text>
            <Text style={styles.modalText}>
              O Pomodoro volta para {DEFAULT_POMODORO_SETTINGS.focusMinutes} min de foco,{" "}
              {DEFAULT_POMODORO_SETTINGS.shortBreakMinutes} min de pausa curta,{" "}
              {DEFAULT_POMODORO_SETTINGS.longBreakMinutes} min de pausa longa e{" "}
              {DEFAULT_POMODORO_SETTINGS.cyclesBeforeLongBreak} ciclos, o aviso padrão volta
              para {shortNotifyLabel(DEFAULT_PREFERENCES.defaultNotifyBeforeMinutes)} antes e a
              vibração é ligada. Seu perfil não muda.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setConfirmResetVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmButton}
                onPress={() => {
                  resetSettings();
                  resetPreferences();
                  setConfirmResetVisible(false);
                }}
              >
                <Text style={styles.modalConfirmText}>Restaurar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Rótulos curtos para os chips de "Aviso padrão".
function shortNotifyLabel(minutes: number | null): string {
  if (minutes === null) return "Não notificar";
  if (minutes === 0) return "No horário";
  if (minutes % 1440 === 0) return minutes === 1440 ? "1 dia" : `${minutes / 1440} dias`;
  if (minutes % 60 === 0) return minutes === 60 ? "1 hora" : `${minutes / 60} horas`;
  return `${minutes} min`;
}

const NOTIFICATION_STATUS_TEXT: Record<NotificationPermissionStatus, string> = {
  granted: "Ativadas: você recebe os avisos dos eventos",
  undetermined: "Ainda não permitidas neste aparelho",
  denied: "Bloqueadas nas configurações do aparelho",
  unsupported: "Indisponíveis no navegador",
};

// Status da permissão de notificação, atualizado ao abrir a tela e ao
// voltar das configurações do sistema (o app volta a ficar "active").
function useNotificationStatus() {
  const [status, setStatus] = useState<NotificationPermissionStatus>("undetermined");

  const refresh = useCallback(() => {
    getNotificationPermissionStatus().then(setStatus);
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    await ensureNotificationPermissions();
    refresh();
  }, [refresh]);

  return { status, request };
}

type NotificationStatusActionProps = {
  status: NotificationPermissionStatus;
  onRequest: () => void;
};

// Lado direito da linha de notificações: selo "Ativadas", botão para pedir
// a permissão ou atalho para as configurações do sistema (quando bloqueada,
// o Android não deixa o app perguntar de novo).
function NotificationStatusAction({ status, onRequest }: NotificationStatusActionProps) {
  if (status === "unsupported") return null;

  if (status === "granted") {
    return (
      <View style={styles.statusBadge}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.text} />
        <Text style={styles.statusBadgeText}>Ativadas</Text>
      </View>
    );
  }

  const label = status === "denied" ? "Abrir ajustes" : "Ativar";
  const onPress = status === "denied" ? () => Linking.openSettings() : onRequest;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

type SettingStepperProps = {
  config: SettingRowConfig;
  value: number;
  onChange: (value: number) => void;
  showDivider: boolean;
};

function SettingStepper({ config, value, onChange, showDivider }: SettingStepperProps) {
  const { min, max, step } = POMODORO_SETTING_LIMITS[config.key];
  const canDecrease = value > min;
  // Foco "0" só existe em desenvolvimento: é o foco rápido de teste.
  const isDevQuickFocus = __DEV__ && config.key === "focusMinutes" && value === 0;
  const canIncrease = value < max;

  const change = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    hapticSelection();
    onChange(next);
  };

  return (
    <View style={[styles.settingRow, showDivider && styles.settingDivider]}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{config.label}</Text>
        <Text style={styles.settingDescription}>{config.description}</Text>
      </View>

      <View style={styles.stepper}>
        <StepperButton
          icon="remove"
          disabled={!canDecrease}
          onPress={() => change(-step)}
          label={`Diminuir ${config.label}`}
        />
        <View style={styles.valueBox}>
          {isDevQuickFocus ? (
            <>
              <Text style={[styles.value, styles.devValue]}>{DEV_QUICK_FOCUS_SECONDS}</Text>
              <Text style={[styles.unit, styles.devValue]}>seg (dev)</Text>
            </>
          ) : (
            <>
              <Text style={styles.value}>{value}</Text>
              {config.unit ? <Text style={styles.unit}>{config.unit}</Text> : null}
            </>
          )}
        </View>
        <StepperButton
          icon="add"
          disabled={!canIncrease}
          onPress={() => change(step)}
          label={`Aumentar ${config.label}`}
        />
      </View>
    </View>
  );
}

type StepperButtonProps = {
  icon: "add" | "remove";
  disabled: boolean;
  onPress: () => void;
  label: string;
};

function StepperButton({ icon, disabled, onPress, label }: StepperButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.stepperButton,
        pressed && styles.stepperButtonPressed,
        disabled && styles.stepperButtonDisabled,
      ]}
    >
      <Ionicons name={icon} size={18} color={Colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  headerRow: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backPressed: {
    backgroundColor: "#FFFFFF14",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 22,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: "#FFFFFF80",
    fontFamily: Fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  profileRow: {
    flexDirection: "row",
    paddingVertical: 16,
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 20,
  },
  profileFields: {
    flex: 1,
  },
  fieldLabel: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 13,
    marginBottom: 6,
  },
  fieldLabelSpaced: {
    marginTop: 14,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  settingDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  settingDescription: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 11,
    marginTop: 3,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: `${Colors.primary}66`,
  },
  stepperButtonPressed: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepperButtonDisabled: {
    opacity: 0.3,
  },
  valueBox: {
    minWidth: 48,
    alignItems: "center",
  },
  devValue: {
    color: "#FFD60A",
  },
  value: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 18,
  },
  unit: {
    color: "#FFFFFF80",
    fontFamily: Fonts.book,
    fontSize: 10,
    marginTop: -2,
  },
  notifyDefault: {
    paddingVertical: 14,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: "#FFFFFFB3",
    fontFamily: Fonts.book,
    fontSize: 12,
  },
  chipTextSelected: {
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusBadgeText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  linkPressed: {
    opacity: 0.8,
  },
  note: {
    color: "#FFD60A",
    fontFamily: Fonts.book,
    fontSize: 12,
    marginTop: 12,
    marginHorizontal: 4,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetPressed: {
    backgroundColor: "#FFFFFF0D",
  },
  resetDisabled: {
    opacity: 0.35,
  },
  resetText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#000000B0",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: `${Colors.primary}4D`,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 16,
    textAlign: "center",
  },
  modalText: {
    color: "#FFFFFFB3",
    fontFamily: Fonts.book,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
  },
  modalConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  modalConfirmText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
