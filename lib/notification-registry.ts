import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import * as Notifications from "@/lib/notifications-api";
import { AppNotification, NotificationType } from "@/types/notification";

// Classe Notificacao do diagrama, com seus métodos agendar() e cancelar().
//
// Todo aviso do app (eventos, tarefas e Pomodoro) é agendado e cancelado por
// aqui: o aviso vai para o sistema do celular (que é quem o entrega) e, ao
// mesmo tempo, fica registrado no aparelho com tipo, título, mensagem,
// horário de disparo e se já foi enviado.
//
// "Enviado": o horário de disparo já passou sem o aviso ter sido cancelado
// (com o app aberto, o aviso que chega é marcado na hora). Avisos enviados
// ficam guardados por NOTIFICATION_KEEP_DAYS; cancelados saem do registro.
//
// Na web não há notificações: o registro também não é usado.

const IS_SUPPORTED = Platform.OS !== "web";
const STORAGE_KEY = "acadex:notifications";
const NOTIFICATION_KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type ScheduleInput = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  triggerAt: number;
  channelId: string;
  // Som do aviso (padrão: toca). Ver lib/pomodoro-notifications.ts.
  sound?: boolean;
  data?: Record<string, unknown>;
};

let cache: AppNotification[] | null = null;
// Fila de operações: leituras e escritas do registro acontecem uma de cada
// vez, na ordem em que foram pedidas (vários avisos podem ser agendados ao
// mesmo tempo, ex: na sincronização ao abrir o app).
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.catch(() => undefined);
  return run;
}

function isAppNotification(value: unknown): value is AppNotification {
  const n = value as AppNotification;
  return (
    typeof n === "object" &&
    n !== null &&
    typeof n.id === "string" &&
    typeof n.type === "string" &&
    typeof n.title === "string" &&
    typeof n.message === "string" &&
    typeof n.triggerAt === "number"
  );
}

// Marca como enviados os avisos cujo horário passou e descarta os enviados
// há mais de NOTIFICATION_KEEP_DAYS.
function refresh(list: AppNotification[]): AppNotification[] {
  const now = Date.now();
  const cutoff = now - NOTIFICATION_KEEP_DAYS * DAY_MS;
  return list
    .map((item) => (!item.sent && item.triggerAt <= now ? { ...item, sent: true } : item))
    .filter((item) => !item.sent || item.triggerAt >= cutoff);
}

async function load(): Promise<AppNotification[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isAppNotification) : [];
  } catch (error) {
    console.warn("[notificações] falha ao ler o registro de avisos", error);
    cache = [];
  }
  return cache;
}

async function save(list: AppNotification[]): Promise<void> {
  cache = refresh(list);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("[notificações] falha ao salvar o registro de avisos", error);
  }
}

// agendar(): agenda o aviso no sistema (substituindo um anterior com o
// mesmo id) e registra. Erros do sistema são repassados a quem chamou.
export function scheduleAppNotification(input: ScheduleInput): Promise<void> {
  return enqueue(async () => {
    if (!IS_SUPPORTED) return;
    await Notifications.cancelScheduledNotificationAsync(input.id);
    await Notifications.scheduleNotificationAsync({
      identifier: input.id,
      content: {
        title: input.title,
        body: input.message,
        ...(input.sound === undefined ? {} : { sound: input.sound }),
        data: input.data ?? {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(input.triggerAt),
        channelId: input.channelId,
      },
    });

    // Substitui o aviso pendente com o mesmo id; os já enviados ficam (os
    // ids do Pomodoro se repetem a cada sessão).
    const list = refresh(await load()).filter((item) => item.id !== input.id || item.sent);
    list.push({
      id: input.id,
      type: input.type,
      title: input.title,
      message: input.message,
      triggerAt: input.triggerAt,
      sent: false,
      scheduledAt: Date.now(),
    });
    await save(list);
  });
}

// cancelar(): tira o aviso do sistema e do registro (se ainda não foi
// enviado; um aviso já entregue continua no registro).
export function cancelAppNotification(id: string): Promise<void> {
  return enqueue(async () => {
    if (!IS_SUPPORTED) return;
    await Notifications.cancelScheduledNotificationAsync(id);
    const list = await load();
    const next = refresh(list).filter((item) => item.id !== id || item.sent);
    if (next.length !== list.length || next.some((item, i) => item !== list[i])) {
      await save(next);
    }
  });
}

// Todos os avisos registrados (agendados e enviados), do mais próximo ao
// mais distante. Não usado por nenhuma tela ainda; fica disponível para,
// por exemplo, uma lista de "Próximos avisos".
export function getAppNotifications(): Promise<AppNotification[]> {
  return enqueue(async () => {
    const list = refresh(await load());
    return [...list].sort((a, b) => a.triggerAt - b.triggerAt);
  });
}

function markSent(id: string): void {
  enqueue(async () => {
    const list = await load();
    if (!list.some((item) => item.id === id && !item.sent)) return;
    await save(list.map((item) => (item.id === id && !item.sent ? { ...item, sent: true } : item)));
  });
}

// Com o app aberto, o aviso que chega é marcado como enviado na hora.
if (IS_SUPPORTED) {
  Notifications.addNotificationReceivedListener((notification) => {
    markSent(notification.request.identifier);
  });
}
