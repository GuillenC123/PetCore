import { solicitarPermiso, PermisoCamaraError } from './permisos';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type OrigenFoto = 'galeria' | 'camara';

/** Cámara y galería comparten compresión y una URI portable. */
export async function seleccionarFoto(origen: OrigenFoto = 'galeria', cuadrada = true): Promise<string | null> {
  if (origen === 'camara') {
    if (Platform.OS === 'web') throw new Error('Para tomar una foto, abre PetCore en tu teléfono. Puedes elegir una imagen de la galería aquí.');
    const permiso = await solicitarPermiso('camara');
    if (permiso !== 'permitido') throw new PermisoCamaraError(permiso === 'bloqueado');
  }
  const resultado = origen === 'camara'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
  if (resultado.canceled || !resultado.assets[0]) return null;
  const foto = resultado.assets[0];
  const contexto = ImageManipulator.manipulate(foto.uri);
  let imagen: Awaited<ReturnType<typeof contexto.renderAsync>> | undefined;
  try {
    const lado = Math.min(foto.width, foto.height);
    if (lado <= 0) throw new Error('No se pudo leer la imagen. Prueba con otra foto.');
    if (cuadrada) contexto.crop({ originX: (foto.width - lado) / 2, originY: (foto.height - lado) / 2, width: lado, height: lado });
    if (cuadrada) contexto.resize({ width: Math.min(lado, 512), height: Math.min(lado, 512) });
    else if (Math.max(foto.width, foto.height) > 1280) contexto.resize(foto.width >= foto.height ? { width: 1280 } : { height: 1280 });
    imagen = await contexto.renderAsync();
    const guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
    if (!guardada.base64) throw new Error('No se pudo preparar la foto. Inténtalo nuevamente.');
    if (guardada.base64.length > 4 * Math.ceil(512 * 1024 / 3)) {
      throw new Error('La foto es demasiado grande. Selecciona otra imagen.');
    }
    return `data:image/jpeg;base64,${guardada.base64}`;
  } finally {
    imagen?.release();
    contexto.release();
  }
}
