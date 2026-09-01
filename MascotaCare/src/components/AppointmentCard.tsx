// ============================================================================
// AppointmentCard.tsx - Tarjeta de Cita
// ----------------------------------------------------------------------------
// Tarjeta blanca redondeada con una línea vertical de color en el borde
// izquierdo (azul=confirmado, rojo=pendiente, verde=programado). Estructura:
//   * Fila superior : título en negrita + badge con el estado a la derecha.
//   * Fila media    : ícono de reloj + fecha y hora (texto corto legible).
//   * Fila inferior : doctor • clínica en gris.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { Cita } from '@/types';
import { colorDeTono, configurarEstadoCita, formatearFechaCita } from '@/utils/estados';
import Badge from './Badge';

interface AppointmentCardProps {
  /** Cita a representar. */
  cita: Cita;
}

export default function AppointmentCard({ cita }: AppointmentCardProps) {
  // Config de estado -> texto + tono de badge.
  const estadoUI = configurarEstadoCita(cita.estado);
  // Color de la línea vertical del borde izquierdo.
  const colorAcento = colorDeTono(estadoUI.tone);

  return (
    <View style={[styles.card, { borderLeftColor: colorAcento }]}>
      {/* ---- Fila superior: título + badge ---- */}
      <View style={styles.filaTop}>
        <Text style={styles.titulo} numberOfLines={1}>
          {cita.titulo}
        </Text>
        <Badge label={estadoUI.label} tone={estadoUI.tone} />
      </View>

      {/* ---- Fila media: reloj + fecha ---- */}
      <View style={styles.fila}>
        <Ionicons name="time-outline" size={15} color={AppColors.textSecondary} />
        <Text style={styles.fecha}>{formatearFechaCita(cita.fecha_hora)}</Text>
      </View>

      {/* ---- Fila inferior: doctor y clínica ---- */}
      {cita.doctor || cita.clinica ? (
        <Text style={styles.doctor}>
          {[cita.doctor, cita.clinica].filter(Boolean).join(' • ')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    // Línea vertical de color en el borde izquierdo (grosor 4d).
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    // Sombra suave.
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  filaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titulo: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fecha: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  doctor: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
});