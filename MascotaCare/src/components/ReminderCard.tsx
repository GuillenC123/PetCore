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
import { formatearFechaCita } from '@/utils/estados';
import { estadoRecordatorio, fechaRecordatorio, REPETICIONES } from '@/utils/recordatorios';

interface ReminderCardProps {
  recordatorio: Recordatorio;
  /** Acción al tocar el checkbox (marcar como completado). */
  onToggle: (recordatorio: Recordatorio) => void;
  ahora: number;
  onEdit: (recordatorio: Recordatorio) => void;
  onPostpone: (recordatorio: Recordatorio, minutos: number) => void;
}

export default function ReminderCard({ recordatorio, onToggle, ahora, onEdit, onPostpone }: ReminderCardProps) {
  // El subtítulo en rojo con alerta corresponde a recordatorios que vencen hoy/mañana.
  const estado = estadoRecordatorio(recordatorio, ahora);
  const esUrgente = estado === 'Vencido' || estado === 'Hoy';
  // Color del borde izquierdo: verde oscuro si urgente, gris si no.
  const colorBorde = esUrgente ? AppColors.danger : AppColors.textMuted;
  const fecha = fechaRecordatorio(recordatorio.vence_en);

  return (
    <View style={[styles.card, { borderLeftColor: colorBorde }]}>
      {/* Contenido principal y subtítulo. */}
      <View style={styles.info}>
        <Text style={styles.titulo}>{recordatorio.titulo}</Text>
        {!!recordatorio.mascota_nombre && <Text style={styles.subtitulo}>{recordatorio.mascota_nombre}</Text>}
        <Text style={[styles.subtitulo, esUrgente && { color: '#B91C1C' }]}>{estado}{fecha ? ` · ${formatearFechaCita(fecha.toISOString())}` : ''}</Text>
        <Text style={styles.subtitulo}>{REPETICIONES[recordatorio.repeticion ?? 'ninguna']}</Text>
        {!!recordatorio.ultima_realizacion && <Text style={styles.subtitulo}>Última realización: {formatearFechaCita(recordatorio.ultima_realizacion)}</Text>}
        <View style={styles.subtituloRow}>
          {/* Ícono de alerta solo cuando el recordatorio es urgente. */}
          {esUrgente && <Ionicons name="alert-circle" size={14} color={AppColors.danger} />}
          <Text
            style={[styles.subtitulo, esUrgente && { color: AppColors.danger }]}>
            {recordatorio.descripcion}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => onEdit(recordatorio)} style={styles.action}><Text style={styles.link}>Editar</Text></Pressable>
          {!recordatorio.completado && <>
            <Pressable accessibilityRole="button" onPress={() => onPostpone(recordatorio, 60)} style={styles.action}><Text style={styles.link}>Posponer 1 h</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => onPostpone(recordatorio, 1440)} style={styles.action}><Text style={styles.link}>Posponer 1 día</Text></Pressable>
          </>}
        </View>
        {recordatorio.repeticion && recordatorio.repeticion !== 'ninguna' && <Text style={styles.subtitulo}>Completar programa la siguiente fecha.</Text>}
      </View>

      {/* Checkbox cuadrado: al marcarlo se completa el recordatorio. */}
      <Pressable
        onPress={() => onToggle(recordatorio)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: recordatorio.completado }}
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { paddingVertical: 12, paddingHorizontal: 4 },
  link: { color: '#0369A1', fontWeight: '600' },
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
    width: 44,
    height: 44,
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
