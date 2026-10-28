import type { Cita, Mascota, Recordatorio, Tratamiento } from '@/types';
import { crearAgenda } from './agenda';

export const MAX_AVISOS = 50; // Reserva margen respecto al límite de iOS.
export interface AvisoLocal {
  identifier: string;
  fecha: number;
  title: string;
  body: string;
  data: { petcore: true; version: 1; owner: string; clave: string; firma: string };
}
export function identificadorAviso(owner: string, clave: string) { return `petcore:v1:${owner}:${encodeURIComponent(clave)}`; }
export function propietarioAvisos(id: string | number, demo: boolean) { return `${demo ? 'demo' : 'api'}:${id}`; }

/** Solo cuidados futuros; los repetidos avanzan al completarlos, igual que la agenda. */
export function crearAvisosLocales(owner: string, mascotas: Mascota[], citas: Cita[], tratamientos: Tratamiento[], recordatorios: Recordatorio[], ahora = Date.now()): AvisoLocal[] {
  const tipos = { cita: 'Visita veterinaria', medicamento: 'Medicamento', recordatorio: 'Recordatorio' };
  return crearAgenda(citas, tratamientos, recordatorios).map((evento) => {
    let fecha = Date.parse(evento.fecha);
    const recordatorio = evento.tipo === 'recordatorio' ? recordatorios.find((r) => String(r.id) === String(evento.id)) : undefined;
    // Los cuidados sin hora avisan a las 09:00 locales, en lugar de medianoche.
    if (recordatorio?.vence_en && /^\d{4}-\d{2}-\d{2}$/.test(recordatorio.vence_en)) fecha = new Date(`${recordatorio.vence_en}T09:00:00`).getTime();
    const mascota = mascotas.find((m) => String(m.id) === String(evento.mascota_id));
    const title = `${tipos[evento.tipo]}${mascota ? ` · ${mascota.nombre}` : ''}`;
    const body = evento.titulo.slice(0, 180);
    const firma = JSON.stringify([fecha, title, body]);
    return { identifier: identificadorAviso(owner, evento.clave), fecha, title, body,
      data: { petcore: true as const, version: 1 as const, owner, clave: evento.clave, firma } };
  }).filter((aviso) => Number.isFinite(aviso.fecha) && aviso.fecha > ahora)
    .sort((a, b) => a.fecha - b.fecha).filter((aviso, i, todos) => todos.findIndex((otro) => otro.identifier === aviso.identifier) === i).slice(0, MAX_AVISOS);
}

/** La notificación nunca puede proporcionar una ruta arbitraria ni cruzar cuentas. */
export function leerDestinoAviso(data: Record<string, unknown>, owner: string): string | null {
  if (data.petcore !== true || data.version !== 1 || data.owner !== owner || typeof data.clave !== 'string' || data.clave.length > 180) return null;
  return /^(cita|recordatorio)-[\w.-]+$/.test(data.clave) || /^toma-\d+-\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(data.clave) ? data.clave : null;
}
