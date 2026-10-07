import type { Cita, DatosApp, Mascota, Recordatorio } from '../types';
import { normalizarIdentificador } from './identificadores';

export function objetoCache(valor: unknown): Record<string, unknown> {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error('Se esperaba un objeto de caché.');
  }
  return valor as Record<string, unknown>;
}

function texto(valor: unknown, admiteVacio = false): string {
  if (typeof valor !== 'string' || (!admiteVacio && !valor.trim()) || valor.includes('\0')) {
    throw new Error('Texto inválido en la caché.');
  }
  return valor;
}

function textoNullable(valor: unknown): string | null {
  return valor === null ? null : texto(valor, true);
}

function enumeracion<T extends string>(valor: unknown, opciones: readonly T[]): T {
  if (typeof valor !== 'string' || !opciones.includes(valor as T)) throw new Error('Estado de caché inválido.');
  return valor as T;
}

function fechaDia(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function fechaIsoCache(valor: unknown): string {
  const fecha = texto(valor);
  if (!fechaDia(fecha.slice(0, 10)) ||
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(fecha) ||
      !Number.isFinite(Date.parse(fecha))) throw new Error('Fecha de caché inválida.');
  return fecha;
}

function mascotaCache(valor: unknown): Mascota {
  const dato = objetoCache(valor);
  return {
    id: normalizarIdentificador(dato.id), nombre: texto(dato.nombre), raza: texto(dato.raza),
    especie: texto(dato.especie), edad: texto(dato.edad), imagen: textoNullable(dato.imagen),
    estado: enumeracion(dato.estado, ['saludable', 'malestar', 'vacuna_pendiente', 'en_tratamiento']),
  };
}

function citaCache(valor: unknown): Cita {
  const dato = objetoCache(valor);
  const cita: Cita = {
    id: normalizarIdentificador(dato.id), mascota_id: normalizarIdentificador(dato.mascota_id),
    titulo: texto(dato.titulo), fecha_hora: fechaIsoCache(dato.fecha_hora),
    doctor: textoNullable(dato.doctor), clinica: textoNullable(dato.clinica),
    estado: enumeracion(dato.estado, ['confirmado', 'pendiente', 'programado', 'cancelado', 'completado']),
  };
  if (dato.mascota_nombre !== undefined) cita.mascota_nombre = texto(dato.mascota_nombre);
  return cita;
}

function recordatorioCache(valor: unknown): Recordatorio {
  const dato = objetoCache(valor);
  if (typeof dato.completado !== 'boolean') throw new Error('Recordatorio inválido.');
  const vencimiento = textoNullable(dato.vence_en);
  if (vencimiento !== null && !fechaDia(vencimiento)) fechaIsoCache(vencimiento);
  const recordatorio: Recordatorio = {
    id: normalizarIdentificador(dato.id),
    mascota_id: dato.mascota_id === null ? null : normalizarIdentificador(dato.mascota_id),
    titulo: texto(dato.titulo), descripcion: textoNullable(dato.descripcion),
    tipo: enumeracion(dato.tipo, ['vacuna', 'alimento', 'cita', 'dosis', 'general']),
    vence_en: vencimiento, completado: dato.completado,
  };
  if (dato.mascota_nombre !== undefined) recordatorio.mascota_nombre = texto(dato.mascota_nombre);
  if (dato.cita_id !== undefined) recordatorio.cita_id = normalizarIdentificador(dato.cita_id);
  if (dato.repeticion !== undefined) recordatorio.repeticion = enumeracion(dato.repeticion, ['ninguna', 'diaria', 'semanal', 'mensual'] as const);
  if (dato.ultima_realizacion !== undefined) recordatorio.ultima_realizacion = fechaIsoCache(dato.ultima_realizacion);
  if (dato.dia_repeticion !== undefined) {
    if (typeof dato.dia_repeticion !== 'number' || !Number.isInteger(dato.dia_repeticion) || dato.dia_repeticion < 1 || dato.dia_repeticion > 31) {
      throw new Error('Día de repetición inválido.');
    }
    recordatorio.dia_repeticion = dato.dia_repeticion;
  }
  return recordatorio;
}

function listaCache<T extends { id: number | string }>(valor: unknown, convertir: (dato: unknown) => T): T[] {
  if (!Array.isArray(valor)) throw new Error('Se esperaba una lista de caché.');
  const lista = valor.map(convertir);
  if (new Set(lista.map((dato) => String(dato.id))).size !== lista.length) throw new Error('IDs duplicados en la caché.');
  return lista;
}

/** Selecciona los campos de las respuestas actuales; no serializa sesión ni ediciones de salud. */
export function prepararDatosCache(valor: unknown): DatosApp {
  const dato = objetoCache(valor);
  const mascotas = listaCache(dato.mascotas, mascotaCache);
  const citas = listaCache(dato.citas, citaCache);
  const recordatorios = listaCache(dato.recordatorios, recordatorioCache);
  const mascotasIds = new Set(mascotas.map((mascota) => String(mascota.id)));
  const citasPorId = new Map(citas.map((cita) => [String(cita.id), cita]));
  if (citas.some((cita) => !mascotasIds.has(String(cita.mascota_id))) ||
      recordatorios.some((recordatorio) => recordatorio.mascota_id !== null && !mascotasIds.has(String(recordatorio.mascota_id)))) {
    throw new Error('La caché hace referencia a una mascota ausente.');
  }
  for (const recordatorio of recordatorios) {
    if (recordatorio.cita_id === undefined) continue;
    const cita = citasPorId.get(String(recordatorio.cita_id));
    if (!cita || cita.mascota_id !== recordatorio.mascota_id) throw new Error('La caché hace referencia a una visita inválida.');
  }
  return { mascotas, citas, recordatorios };
}
