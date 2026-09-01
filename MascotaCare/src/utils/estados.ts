// ============================================================================
// estados.ts - Utilidades de texto y colores para los estados del modelo
// ----------------------------------------------------------------------------
// Centraliza la conversión de los valores de estado (que vienen de PostgreSQL)
// hacia el texto legible y el tono de color que se muestra en la UI (badges y
// líneas decorativas de las tarjetas).
// ============================================================================

import { AppColors } from '@/constants/theme';
import type { EstadoCita, EstadoMascota } from '@/types';

// Tonos disponibles para los Badge y para las barras verticales de las citas.
export type Tone = 'success' | 'danger' | 'info' | 'neutral';

// ---------------------------------------------------------------------------
// Mascotas: estado de salud -> etiqueta + tono.
// ---------------------------------------------------------------------------

interface EstadoMascotaUI {
  label: string;
  tone: Tone;
}

/** Configuración de la etiqueta de salud de una mascota. */
export function configurarEstadoMascota(estado: EstadoMascota): EstadoMascotaUI {
  switch (estado) {
    case 'saludable':
      return { label: 'Saludable', tone: 'success' };
    case 'vacuna_pendiente':
      return { label: 'Vacuna Pendiente', tone: 'danger' };
    case 'en_tratamiento':
      return { label: 'En Tratamiento', tone: 'info' };
    default:
      return { label: estado, tone: 'neutral' };
  }
}

// ---------------------------------------------------------------------------
// Citas: estado de la visita -> texto + tono.
// ---------------------------------------------------------------------------

/** Configuración de la etiqueta de una cita. */
export function configurarEstadoCita(estado: EstadoCita): EstadoMascotaUI {
  switch (estado) {
    case 'confirmado':
      return { label: 'Confirmado', tone: 'info' };
    case 'pendiente':
      return { label: 'Pendiente', tone: 'danger' };
    case 'programado':
      return { label: 'Programado', tone: 'success' };
    case 'cancelado':
      return { label: 'Cancelado', tone: 'neutral' };
    case 'completado':
      return { label: 'Completado', tone: 'neutral' };
    default:
      return { label: estado, tone: 'neutral' };
  }
}

// ---------------------------------------------------------------------------
// Relación tono -> color de acento (para la barra vertical de las citas).
// ---------------------------------------------------------------------------

/** Devuelve el color de acento de un tono (para la línea lateral de citas). */
export function colorDeTono(tone: Tone): string {
  switch (tone) {
    case 'success':
      return AppColors.success;
    case 'danger':
      return AppColors.danger;
    case 'info':
      return AppColors.info;
    default:
      return AppColors.textMuted;
  }
}

// ---------------------------------------------------------------------------
// Fecha amigable para las citas ("Hoy, 15:30", "Mañana, 10:00", "15 Sep").
// ---------------------------------------------------------------------------

/** Formatea una fecha ISO a texto corto legible según la proximidad. */
export function formatearFechaCita(iso: string): string {
  const fecha = new Date(iso);
  const ahora = new Date();

  // Compara por día (inicio del día) para saber si es hoy/mañana.
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
  const diffDias = Math.round((inicioFecha - inicioHoy) / 86400000);

  // Hora en formato "HH:MM" de 24h.
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(
    fecha.getMinutes()
  ).padStart(2, '0')}`;

  let diaTexto: string;
  if (diffDias === 0) diaTexto = 'Hoy';
  else if (diffDias === 1) diaTexto = 'Mañana';
  else diaTexto = `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;

  return `${diaTexto}, ${hora}`;
}

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];