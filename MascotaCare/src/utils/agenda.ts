import type { Cita, Recordatorio, Tratamiento } from '../types';
import { fechaRecordatorio } from './recordatorios';

export interface EventoAgenda {
  clave: string; tipo: 'cita' | 'medicamento' | 'recordatorio'; id: number;
  mascota_id: number | null; titulo: string; detalle: string; fecha: string;
}
export function crearAgenda(citas: Cita[], tratamientos: Tratamiento[], recordatorios: Recordatorio[]): EventoAgenda[] {
  const eventos: EventoAgenda[] = [];
  citas.filter((c) => c.estado !== 'cancelado' && c.estado !== 'completado').forEach((c) => eventos.push({
    clave: `cita-${c.id}`, tipo: 'cita', id: c.id, mascota_id: c.mascota_id, titulo: c.titulo,
    detalle: [c.doctor, c.clinica].filter(Boolean).join(' · '), fecha: c.fecha_hora,
  }));
  tratamientos.forEach((t) => t.tomas.filter((toma) => toma.estado === 'pendiente').forEach((toma) => eventos.push({
    clave: `toma-${t.id}-${toma.fecha_hora}`, tipo: 'medicamento', id: t.id, mascota_id: t.mascota_id,
    titulo: t.medicamento, detalle: t.indicaciones, fecha: toma.fecha_hora,
  })));
  recordatorios.filter((r) => !r.completado).forEach((r) => {
    const fecha = fechaRecordatorio(r.vence_en);
    if (!fecha) return;
    // La visita y su aviso original se muestran una sola vez. Un aviso pospuesto conserva su fecha propia.
    if (r.cita_id !== undefined && citas.some((c) => c.id === r.cita_id && new Date(c.fecha_hora).getTime() === fecha.getTime())) return;
    eventos.push({ clave: `recordatorio-${r.id}`, tipo: 'recordatorio', id: r.id, mascota_id: r.mascota_id,
      titulo: r.titulo, detalle: r.descripcion ?? '', fecha: fecha.toISOString() });
  });
  return eventos.filter((e) => Number.isFinite(Date.parse(e.fecha))).sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
}

export type FiltroAgenda = 'Hoy' | 'Esta semana' | 'Vencidos' | 'Todos';
export function filtrarAgenda(eventos: EventoAgenda[], filtro: FiltroAgenda, mascotaId: number | null, ahora = Date.now()) {
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
  const lunes = new Date(hoy); lunes.setDate(lunes.getDate() - (lunes.getDay() + 6) % 7);
  const finSemana = new Date(lunes); finSemana.setDate(finSemana.getDate() + 7);
  return eventos.filter((e) => {
    if (mascotaId !== null && e.mascota_id !== mascotaId) return false;
    const fecha = Date.parse(e.fecha);
    if (filtro === 'Hoy') return fecha >= hoy.getTime() && fecha < manana.getTime();
    if (filtro === 'Esta semana') return fecha >= lunes.getTime() && fecha < finSemana.getTime();
    if (filtro === 'Vencidos') return fecha < ahora;
    return true;
  });
}
