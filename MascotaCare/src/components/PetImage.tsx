// ============================================================================
// PetImage.tsx - Imagen circular de una mascota (con placeholder por defecto)
// ----------------------------------------------------------------------------
// Muestra la foto de la mascota si existe (prop `url`). Si no hay foto, se
// dibuja un círculo de color suave con un emoji de huella 🐾 como imagen por
// defecto (placeholder). De esta forma la tarjeta siempre se ve completa y el
// usuario puede colocar una imagen manualmente desde la PC sustituyendo el
// valor de la prop `url` (o la columna "imagen" de la base de datos).
// ============================================================================

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

interface PetImageProps {
  /** URI de la imagen (red o local). null => placeholder por defecto. */
  url?: string | null;
  /** Nombre de la mascota (para iniciales en el placeholder). */
  nombre?: string;
  /** Diámetro de la imagen circular. */
  size?: number;
}

export default function PetImage({ url, nombre, size = 56 }: PetImageProps) {
  // Si hay una foto, la mostramos recortada en círculo.
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  // Sin foto: círculo con fondo suave celeste y un emoji de huella por defecto.
  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.45 }}>🐾</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: AppColors.infoSoft, // fondo mientras carga la imagen.
  },
  placeholder: {
    backgroundColor: AppColors.infoSoft, // azul muy claro de respaldo.
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});