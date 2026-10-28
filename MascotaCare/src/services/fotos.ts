import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Selecciona y convierte a una foto portable; nunca guarda una URI temporal. */
export async function seleccionarFoto(): Promise<string | null> {
  // Debe abrirse directamente desde el botón para conservar el gesto en web.
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1,
  });
  if (resultado.canceled || !resultado.assets[0]) return null;
  const foto = resultado.assets[0];
  const contexto = ImageManipulator.manipulate(foto.uri);
  let imagen: Awaited<ReturnType<typeof contexto.renderAsync>> | undefined;
  try {
    const lado = Math.min(foto.width, foto.height);
    if (lado <= 0) throw new Error('No se pudo leer la imagen. Prueba con otra foto.');
    contexto.crop({ originX: (foto.width - lado) / 2, originY: (foto.height - lado) / 2, width: lado, height: lado });
    contexto.resize({ width: Math.min(lado, 512), height: Math.min(lado, 512) });
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
