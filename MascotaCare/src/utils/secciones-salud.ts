import type { AppPalette } from '@/constants/theme';
import type { Cita, Mascota, Tratamiento } from '../types';
import { pendientesCarnet } from './carnet';
import { crearHistorial } from './historial';
import { edadMascota } from './salud';

export const SECCIONES_SALUD = [
  { id: 'datos', titulo: 'Datos de salud', descripcion: 'Foto, edad, sexo, alergias y condiciones', icono: 'medical-outline', color: '#0369A1', fondo: '#E0F2FE' },
  { id: 'peso', titulo: 'Peso', descripcion: 'Mediciones, evolución y correcciones', icono: 'scale-outline', color: '#0F766E', fondo: '#CCFBF1' },
  { id: 'vacunas', titulo: 'Vacunas y desparasitación', descripcion: 'Carnet, aplicaciones y comprobantes', icono: 'shield-checkmark-outline', color: '#6D28D9', fondo: '#EDE9FE' },
  { id: 'tratamientos', titulo: 'Tratamientos', descripcion: 'Medicamentos, horarios y registro de tomas', icono: 'medkit-outline', color: '#166534', fondo: '#DCFCE7' },
  { id: 'historial', titulo: 'Historial de salud', descripcion: 'Consultas, observaciones y documentos', icono: 'time-outline', color: '#9A3412', fondo: '#FFEDD5' },
] as const;
export type SeccionSalud = typeof SECCIONES_SALUD[number]['id'];

export function esSeccionSalud(valor: unknown): valor is SeccionSalud {
  return SECCIONES_SALUD.some((seccion) => seccion.id === valor);
}

export function resumenesSalud(mascota: Mascota, tratamientos: Tratamiento[], citas: Cita[], ahora = Date.now()): Record<SeccionSalud, string> {
  const peso = [...(mascota.registros_peso ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const siguiente = pendientesCarnet(mascota.carnet ?? [])[0];
  const propios = tratamientos.filter((t) => t.mascota_id === mascota.id);
  const activos = propios.filter((t) => {
    const primera = t.tomas[0], ultima = t.tomas[t.tomas.length - 1];
    if (!primera || !ultima) return false;
    const fin = new Date(ultima.fecha_hora); fin.setHours(23, 59, 59, 999);
    return Date.parse(primera.fecha_hora) <= ahora && fin.getTime() >= ahora;
  });
  const evento = crearHistorial(mascota, citas, tratamientos, ahora)[0];
  return {
    datos: `${edadMascota(mascota)} · ${mascota.alergias?.trim() ? 'Alergias registradas' : 'Consultar datos básicos'}`,
    peso: peso ? `${peso.peso.toLocaleString('es-PE')} kg · ${peso.fecha.split('-').reverse().join('/')}`
      : mascota.peso != null ? `Último peso: ${mascota.peso.toLocaleString('es-PE')} kg` : 'Sin mediciones registradas',
    vacunas: siguiente ? `Próxima aplicación: ${siguiente.proxima_fecha}` : 'Sin próximas aplicaciones registradas',
    tratamientos: activos.length ? `${activos.length} ${activos.length === 1 ? 'tratamiento activo' : 'tratamientos activos'}`
      : propios.length ? 'Sin tratamientos activos · Ver registros' : 'Sin tratamientos registrados',
    historial: evento ? `${evento.titulo} · ${new Date(evento.fecha).toLocaleDateString('es-PE')}` : 'Sin eventos registrados',
  };
}

export function seccionesConColores(colors: AppPalette) {
  const tones = {
    datos: [colors.accent, colors.infoSoft], peso: [colors.teal, colors.tealSoft],
    vacunas: [colors.purple, colors.purpleSoft], tratamientos: [colors.success, colors.successSoft],
    historial: [colors.orange, colors.orangeSoft],
  };
  return SECCIONES_SALUD.map((section) => ({ ...section, color: tones[section.id][0], fondo: tones[section.id][1] }));
}
