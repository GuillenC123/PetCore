// ============================================================================
// QuickActionCard.tsx - Botón de Acción Rápida
// ----------------------------------------------------------------------------
// Tarjeta cuadrada blanca pequeña muy utilizada en la pantalla de Inicio.
//   * Centro superior : ícono dentro de un círculo de color claro.
//   * Centro inferior : texto corto descriptivo (p. ej. "Añadir Mascota").
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

// Nombres de íconos permitidos (tono de Ionicons de MaterialCommunityIcons).
type IconName = keyof typeof Ionicons.glyphMap;

interface QuickActionCardProps {
  /** Nombre del ícono a mostrar dentro del círculo. */
  icon: IconName;
  /** Texto corto bajo el ícono. */
  label: string;
  /** Color de fondo del círculo (claro). */
  circleColor?: string;
  /** Color del ícono dentro del círculo. */
  iconColor?: string;
  /** Acción al tocar la tarjeta. */
  onPress?: () => void;
}

export default function QuickActionCard({
  icon,
  label,
  circleColor = AppColors.infoSoft,
  iconColor = AppColors.primaryDark,
  onPress,
}: QuickActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {/* Círculo de color claro con el ícono centrado. */}
      <View style={[styles.circle, { backgroundColor: circleColor }]}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>

      {/* Texto descriptivo de la acción. */}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
    // Sombra suave.
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
