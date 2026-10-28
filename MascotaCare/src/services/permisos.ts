import { Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type TipoPermiso = 'camara' | 'notificaciones';
export type EstadoPermiso = 'permitido' | 'pendiente' | 'denegado' | 'bloqueado' | 'no_disponible';
export const CANAL_CUIDADOS = 'petcore-cuidados';

export function estadoPermiso(respuesta: { granted: boolean; canAskAgain: boolean; status: string; ios?: { status: number } }): EstadoPermiso {
  // iOS también permite entregas silenciosas con autorización provisional.
  if (respuesta.granted || respuesta.ios?.status === 3 || respuesta.ios?.status === 4) return 'permitido';
  if (!respuesta.canAskAgain) return 'bloqueado';
  return respuesta.status === 'undetermined' ? 'pendiente' : 'denegado';
}

export async function consultarPermiso(tipo: TipoPermiso): Promise<EstadoPermiso> {
  if (Platform.OS === 'web') return 'no_disponible';
  if (tipo === 'camara') return estadoPermiso(await ImagePicker.getCameraPermissionsAsync());
  const notifications = await import('expo-notifications');
  return estadoPermiso(await notifications.getPermissionsAsync());
}

export async function prepararCanal() {
  if (Platform.OS !== 'android') return;
  const notifications = await import('expo-notifications');
  await notifications.setNotificationChannelAsync(CANAL_CUIDADOS, {
    name: 'Cuidados de mascotas', importance: notifications.AndroidImportance.HIGH,
    sound: 'default', vibrationPattern: [0, 250, 250, 250],
  });
}

/** Solo se llama como consecuencia de pulsar Permitir o Tomar foto. */
export async function solicitarPermiso(tipo: TipoPermiso): Promise<EstadoPermiso> {
  const actual = await consultarPermiso(tipo);
  if (actual === 'permitido' || actual === 'bloqueado' || actual === 'no_disponible') return actual;
  if (tipo === 'camara') return estadoPermiso(await ImagePicker.requestCameraPermissionsAsync());
  await prepararCanal(); // Android 13 requiere un canal antes del diálogo.
  const notifications = await import('expo-notifications');
  return estadoPermiso(await notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
}

export async function abrirAjustesPermisos() {
  if (Platform.OS === 'web') return;
  await Linking.openSettings();
}

export class PermisoCamaraError extends Error {
  constructor(public readonly bloqueado: boolean) {
    super(bloqueado
      ? 'El acceso a la cámara está bloqueado. Puedes activarlo en Ajustes o seleccionar una imagen de la galería.'
      : 'No se permitió usar la cámara. Puedes volver a intentarlo o seleccionar una imagen de la galería.');
    this.name = 'PermisoCamaraError';
  }
}
