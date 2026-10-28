import { Platform } from 'react-native';
import { CANAL_CUIDADOS, prepararCanal } from './permisos';
import { crearSincronizadorAvisos } from './sincronizar-avisos';

/** Imports diferidos: web no carga módulos nativos ni solicita permisos. */
export const sincronizarAvisosDispositivo = crearSincronizadorAvisos({
  listar: async () => {
    if (Platform.OS === 'web') return [];
    const n = await import('expo-notifications');
    return n.getAllScheduledNotificationsAsync();
  },
  cancelar: async (id) => { const n = await import('expo-notifications'); await n.cancelScheduledNotificationAsync(id); },
  programar: async (aviso) => {
    const n = await import('expo-notifications');
    await prepararCanal();
    await n.scheduleNotificationAsync({ identifier: aviso.identifier,
      content: { title: aviso.title, body: aviso.body, sound: 'default', data: aviso.data },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(aviso.fecha), channelId: CANAL_CUIDADOS, delivery: 'bestEffort' },
    });
  },
  limpiarEntregados: async (owner, activos) => {
    if (Platform.OS === 'web') return;
    const n = await import('expo-notifications');
    for (const aviso of await n.getPresentedNotificationsAsync()) {
      const { identifier, content } = aviso.request;
      if (identifier.startsWith('petcore:') && content.data?.petcore === true &&
        (content.data?.owner !== owner || (activos !== null && !activos.has(identifier)))) await n.dismissNotificationAsync(identifier);
    }
  },
});
