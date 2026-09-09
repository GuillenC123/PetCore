import type { AdjuntoSalud, Cita, Mascota, Tratamiento, ObservacionSalud } from '../types';
import { interpretarFechaVisita } from './citas';
import { validarTexto } from './validaciones';

export interface EventoSalud { clave: string; tipo: string; titulo: string; detalle: string; fecha: string; adjuntos: AdjuntoSalud[] }
export function validarObservacion(datos: Omit<ObservacionSalud, 'id'>, ahora = Date.now()) {
  if (!['consulta', 'observacion'].includes(datos.tipo)) throw new Error('Selecciona el tipo de registro.');
  if (validarTexto(datos.titulo, 120) || validarTexto(datos.descripcion, 2000)) throw new Error('Completa el título y la descripción.');
  if (!Number.isFinite(Date.parse(datos.fecha)) || Date.parse(datos.fecha) > ahora) throw new Error('Introduce una fecha válida que no sea futura.');
}
export function crearHistorial(mascota: Mascota, citas: Cita[], tratamientos: Tratamiento[], ahora = Date.now()): EventoSalud[] {
  const eventos: EventoSalud[] = [];
  citas.filter((c) => c.mascota_id === mascota.id && c.estado === 'completado').forEach((c) => eventos.push({
    clave: `cita-${c.id}`, tipo: 'Consulta', titulo: c.titulo, detalle: [c.doctor, c.clinica].filter(Boolean).join(' · '), fecha: c.fecha_hora, adjuntos: [],
  }));
  (mascota.carnet ?? []).filter((r) => r.fecha_aplicacion).forEach((r) => eventos.push({
    clave: `carnet-${r.id}`, tipo: r.tipo === 'vacuna' ? 'Vacuna' : 'Desparasitación', titulo: r.nombre,
    detalle: `Aplicado. Próxima fecha indicada: ${r.proxima_fecha ?? 'Sin registrar'}`,
    fecha: interpretarFechaVisita(r.fecha_aplicacion!, '00:00')!.toISOString(),
    adjuntos: r.comprobante ? [{ uri: r.comprobante, nombre: 'Comprobante', mime: 'image/*' }] : [],
  }));
  tratamientos.filter((t) => t.mascota_id === mascota.id).forEach((t) => eventos.push({
    clave: `tratamiento-${t.id}`, tipo: 'Tratamiento', titulo: t.medicamento,
    detalle: `${t.indicaciones}\nDuración: ${t.duracion_dias} días. Horarios: ${t.horarios.join(', ')}`,
    fecha: interpretarFechaVisita(t.inicio, '00:00')!.toISOString(), adjuntos: [],
  }));
  (mascota.observaciones ?? []).forEach((o) => eventos.push({ clave: `observacion-${o.id}`,
    tipo: o.tipo === 'consulta' ? 'Consulta registrada' : 'Observación', titulo: o.titulo, detalle: o.descripcion, fecha: o.fecha, adjuntos: [] }));
  return eventos.filter((e) => Date.parse(e.fecha) <= ahora).map((e) => ({ ...e,
    adjuntos: [...e.adjuntos, ...(mascota.adjuntos_historial?.[e.clave] ?? [])],
  })).sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
}
