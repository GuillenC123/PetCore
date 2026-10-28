/**
 * API local de expo-notifications SDK 58.
 * El índice general importa TopicSubscriptionModule (push), ausente en Expo Go.
 * Usamos entradas concretas del paquete para no cargar funciones remotas.
 * Mantener la prueba de dependencias al actualizar expo-notifications.
 */
export { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
export { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
export { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
export { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
export { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
export { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
export { getPresentedNotificationsAsync } from 'expo-notifications/build/getPresentedNotificationsAsync';
export { dismissNotificationAsync } from 'expo-notifications/build/dismissNotificationAsync';
export { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
export { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
export { addNotificationResponseReceivedListener, getLastNotificationResponseAsync, clearLastNotificationResponseAsync } from 'expo-notifications/build/NotificationsEmitter';
