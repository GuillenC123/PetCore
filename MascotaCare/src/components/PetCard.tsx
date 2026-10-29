import AnimatedPressable from '@/components/AnimatedPressable';
import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
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
import { StyleSheet, Text, View } from 'react-native';

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
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  // Guarda las config: ejecutamos la utilidad que convierte el estado en
  // etiqueta legible y tono de color para el badge.

  return (
    <AnimatedPressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {/* Imagen circular de la mascota (placeholder si no hay foto). */}
      <View style={styles.portrait}>
        <PetImage url={mascota.imagen} nombre={mascota.nombre} size={64} />
        <View style={styles.pawBadge}><Ionicons name="paw" size={12} color={AppColors.teal} /></View>
      </View>

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
    </AnimatedPressable>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    gap: 14,
    // Sombra suave (elevación).
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  portrait: { padding: 4, borderRadius: 40, backgroundColor: AppColors.tealSoft },
  pawBadge: { position: 'absolute', right: -2, bottom: 0, width: 25, height: 25, borderRadius: 13, backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppColors.border },
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
}));
