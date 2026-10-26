// Fachada de notificações LOCAIS do expo-notifications.
//
// Por que não `import * as Notifications from "expo-notifications"`?
// O índice do pacote reexporta também as APIs de push. No Android, isso
// carrega `TopicSubscriptionModule`, que chama
// requireNativeModule('ExpoTopicSubscriptionModule') logo na importação.
// O Expo Go não tem esse módulo nativo (push foi removido do Expo Go no
// SDK 53), então o app inteiro quebrava ao abrir, com erros em cascata como
// "Route ... is missing the required default export".
//
// Importando cada função pelo caminho direto, só são carregados os módulos
// nativos de notificação local (Scheduler, ChannelManager, Permissions,
// Emitter, Handler), que existem tanto no Expo Go quanto num development
// build. Todo o app deve importar notificações daqui, nunca do pacote raiz.
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
export { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
export { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
export { getAllScheduledNotificationsAsync } from "expo-notifications/build/getAllScheduledNotificationsAsync";
export {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  clearLastNotificationResponse,
  DEFAULT_ACTION_IDENTIFIER,
  getLastNotificationResponse,
} from "expo-notifications/build/NotificationsEmitter";
export { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
export { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
export type {
  NotificationContentInput,
  NotificationResponse,
} from "expo-notifications/build/Notifications.types";
