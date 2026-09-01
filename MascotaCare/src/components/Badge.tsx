// ============================================================================
// Badge.tsx - Etiqueta (badge) redondeada de estado
// ----------------------------------------------------------------------------
// Muestra un texto de estado sobre un fondo de color claro. Se usa en las
// tarjetas de mascota (estado de salud) y de cita (estado de la visita).
//
// El color de fondo y el color del texto se definen por "tono":
//   * success -> verde suave (Saludable / Programado).
//   * danger  -> rojo suave (Vacuna pendiente / Pendiente).
//   * info    -> celeste suave (Confirmado).
// ============================================================================

import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

type BadgeTone = 'success' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  /** Texto a mostrar dentro de la etiqueta. */
  label: string;
  /** Tono de color que determinará fondo y texto. Por defecto "neutral". */
  tone?: BadgeTone;
}

// Mapa de colores (fondo claro + texto en el color semántico correspondiente).
const TONE_STYLES = {
  success: { background: AppColors.successSoft, foreground: AppColors.success },
  danger: { background: AppColors.dangerSoft, foreground: AppColors.danger },
  info: { background: AppColors.infoSoft, foreground: AppColors.info },
  neutral: { background: AppColors.background, foreground: AppColors.textSecondary },
} as const;

export default function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const colores = TONE_STYLES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colores.background }]}>
      <Text style={[styles.label, { color: colores.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Contenedor con esquinas muy redondeadas y texto compacto.
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});