import { cancelAppNotification, scheduleAppNotification } from "@/lib/notification-registry";
import { Platform } from "react-native";

import { formatFocusDuration } from "@/constants/pomodoro-options";
import {
  ensureAndroidChannel,
  ensureNotificationPermissions,
  getNotificationPermissionStatus,
} from "@/lib/event-notifications";
import { PomodoroPhase } from "@/types/pomodoro";

// Avisos do Pomodoro (caso de uso "Usar Pomodoro «include» Receber
// notificações"; TipoNotificacao POMODORO). Mesmo esquema dos eventos e das
// tarefas: identificadores fixos, então reagendar substitui o aviso antigo.
//
// - Foco rodando: aviso no fim do foco ("Foco concluído" ou, na última
//   sessão da rodada, "Rodada completa") e, se vier pausa, outro no fim
//   dela ("Pausa terminada").
// - Pausa rodando: aviso no fim da pausa.
// - Pausado, cancelado ou parado: nenhum aviso.

const IS_SUPPORTED = Platform.OS !== "web";
const PHASE_END_ID = "pomodoro:phase-end";
const BREAK_END_ID = "pomodoro:break-end";
// No Android o som é definido pelo canal, então há dois: com e sem som
// (somAtivo). No Expo Go a criação de canais falha (problema conhecido) e o
// aviso cai no canal padrão, que toca som; no app instalado funciona.
const ANDROID_CHANNEL_ID = "pomodoro";
const ANDROID_CHANNEL_NAME = "Timer Pomodoro";
const ANDROID_SILENT_CHANNEL_ID = "pomodoro-silent";
const ANDROID_SILENT_CHANNEL_NAME = "Timer Pomodoro (sem som)";

type ActivePhase = Exclude<PomodoroPhase, "idle">;

export type PomodoroNotificationPlan = {
  phase: ActivePhase;
  phaseEndAt: number; // quando a fase atual termina
  // Só para foco: a pausa que vem depois (null = fim de rodada, sem pausa).
  nextBreak: { phase: "shortBreak" | "longBreak"; durationMs: number } | null;
  // Só para foco no fim da rodada: total de sessões e tempo de foco.
  round: { sessions: number; focusMs: number } | null;
  // somAtivo da Configuração Pomodoro.
  soundEnabled: boolean;
};

type Content = { title: string; body: string };

function breakName(phase: "shortBreak" | "longBreak"): string {
  return phase === "longBreak" ? "pausa longa" : "pausa curta";
}

const BREAK_END_CONTENT: Content = {
  title: "Pausa terminada",
  body: "Toque para começar o próximo foco.",
};

async function scheduleAt(
  identifier: string,
  at: number,
  content: Content,
  soundEnabled: boolean
): Promise<void> {
  if (at <= Date.now()) return;
  await scheduleAppNotification({
    id: identifier,
    type: "POMODORO",
    title: content.title,
    message: content.body,
    triggerAt: at,
    channelId: soundEnabled ? ANDROID_CHANNEL_ID : ANDROID_SILENT_CHANNEL_ID,
    sound: soundEnabled,
    data: { pomodoro: true, silent: !soundEnabled },
  });
}

export async function cancelPomodoroNotifications(): Promise<void> {
  if (!IS_SUPPORTED) return;
  try {
    await cancelAppNotification(PHASE_END_ID);
    await cancelAppNotification(BREAK_END_ID);
  } catch (error) {
    console.warn("[notificações] falha ao cancelar avisos do Pomodoro", error);
  }
}

// Agenda os avisos da fase em andamento (substituindo os anteriores).
// `requestPermission`: true só quando o usuário acabou de iniciar um foco
// (é quando o pedido do sistema faz sentido).
export async function schedulePomodoroNotifications(
  plan: PomodoroNotificationPlan,
  options: { requestPermission?: boolean } = {}
): Promise<void> {
  if (!IS_SUPPORTED) return;
  await cancelPomodoroNotifications();

  const allowed = options.requestPermission
    ? await ensureNotificationPermissions()
    : (await getNotificationPermissionStatus()) === "granted";
  if (!allowed) return;

  try {
    const sound = plan.soundEnabled;
    if (sound) {
      await ensureAndroidChannel(ANDROID_CHANNEL_ID, ANDROID_CHANNEL_NAME);
    } else {
      await ensureAndroidChannel(ANDROID_SILENT_CHANNEL_ID, ANDROID_SILENT_CHANNEL_NAME, {
        silent: true,
      });
    }

    if (plan.phase !== "focus") {
      await scheduleAt(PHASE_END_ID, plan.phaseEndAt, BREAK_END_CONTENT, sound);
      return;
    }

    if (plan.round) {
      await scheduleAt(
        PHASE_END_ID,
        plan.phaseEndAt,
        {
          title: "Rodada completa!",
          body: `Você completou ${plan.round.sessions} sessões, somando ${formatFocusDuration(
            plan.round.focusMs
          )} de foco.`,
        },
        sound
      );
      return;
    }

    if (plan.nextBreak) {
      await scheduleAt(
        PHASE_END_ID,
        plan.phaseEndAt,
        {
          title: "Foco concluído!",
          body: `Hora da ${breakName(plan.nextBreak.phase)}: ${formatFocusDuration(
            plan.nextBreak.durationMs
          )} de descanso.`,
        },
        sound
      );
      await scheduleAt(
        BREAK_END_ID,
        plan.phaseEndAt + plan.nextBreak.durationMs,
        BREAK_END_CONTENT,
        sound
      );
    }
  } catch (error) {
    console.warn("[notificações] falha ao agendar avisos do Pomodoro", error);
  }
}
