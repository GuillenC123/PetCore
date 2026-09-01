// ============================================================================
// ReminderCard.tsx - Tarjeta de Recordatorio
// ----------------------------------------------------------------------------
// Contenedor blanco con borde izquierdo de color (verde oscuro para el que
// vence pronto / alerta, gris para los normales). Contiene:
//   * Texto principal (título del recordatorio).
//   * Subtítulo debajo (puede ir en rojo con ícono de alerta si vence mañana).
//   * A la derecha un "checkbox" cuadrado, marcable para marcar como hecho.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { Recordatorio } from '@/types';

interface ReminderCardProps {
  recordatorio: Recordatorio;
  /** Acción al tocar el checkbox (marcar como completado). */
  onToggle: (recordatorio: Recordatorio) => void;
}

export default function ReminderCard({ recordatorio, onToggle }: ReminderCardProps) {
  // El subtítulo en rojo con alerta corresponde a recordatorios que vencen hoy/mañana.
  const esUrgente = /mañana|hoy/i.test(recordatorio.descripcion ?? '');
  // Color del borde izquierdo: verde oscuro si urgente, gris si no.
  const colorBorde = esUrgente ? AppColors.successDark : AppColors.textMuted;

  return (
    <View style={[styles.card, { borderLeftColor: colorBorde }]}>
      {/* Contenido principal y subtítulo. */}
      <View style={styles.info}>
        <Text style={styles.titulo}>{recordatorio.titulo}</Text>
        <View style={styles.subtituloRow}>
          {/* Ícono de alerta solo cuando el recordatorio es urgente. */}
          {esUrgente && <Ionicons name="alert-circle" size={14} color={AppColors.danger} />}
          <Text
            style={[styles.subtitulo, esUrgente && { color: AppColors.danger }]}>
            {recordatorio.descripcion}
          </Text>
        </View>
      </View>

      {/* Checkbox cuadrado: al marcarlo se completa el recordatorio. */}
      <Pressable
        onPress={() => onToggle(recordatorio)}
        style={[styles.checkbox, recordatorio.completado && styles.checkboxMarcado]}
        accessibilityLabel={`Marcar ${recordatorio.titulo}`}>
        {recordatorio.completado && (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    // Sombra suave.
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  info: {
    flex: 1,
    gap: 4,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
  },
  subtituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subtitulo: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppColors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMarcado: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
});