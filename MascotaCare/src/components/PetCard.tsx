// ============================================================================
// PetCard.tsx - Tarjeta de Mascota
// ----------------------------------------------------------------------------
// Tarjeta blanca con sombra suave y esquinas redondeadas. Distribución:
//   * Izquierda : imagen circular de la mascota.
//   * Centro    : nombre (grande/negrita), raza y edad (gris), y opcionalmente
//                 un badge con el estado de salud.
//   * Derecha   : chevron gris claro (indica que es navegable).
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { Mascota } from '@/types';
import { edadMascota } from '@/utils/salud';
import PetHealthStatus from './PetHealthStatus';
import PetImage from './PetImage';

interface PetCardProps {
  /** Datos de la mascota a mostrar. */
  mascota: Mascota;
  /** Mostrar la etiqueta de estado de salud (Inicio no la muestra). */
  showStatus?: boolean;
  /** Acción al pulsar la tarjeta. */
  onPress?: () => void;
}

export default function PetCard({ mascota, showStatus = true, onPress }: PetCardProps) {
  // Guarda las config: ejecutamos la utilidad que convierte el estado en
  // etiqueta legible y tono de color para el badge.

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {/* Imagen circular de la mascota (placeholder si no hay foto). */}
      <PetImage url={mascota.imagen} nombre={mascota.nombre} size={60} />

      {/* Información central de la mascota. */}
      <View style={styles.info}>
        <Text style={styles.nombre}>{mascota.nombre}</Text>
        <Text style={styles.raza}>
          {mascota.raza} · {edadMascota(mascota)}
        </Text>
        {/* El badge del estado solo aparece cuando showStatus es true. */}
        {showStatus && <PetHealthStatus mascota={mascota} />}
      </View>

      {/* Flecha indicando que se puede navegar a otra pantalla. */}
      <Ionicons name="chevron-forward" size={20} color={AppColors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    // Sombra suave (elevación).
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nombre: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
  },
  raza: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
