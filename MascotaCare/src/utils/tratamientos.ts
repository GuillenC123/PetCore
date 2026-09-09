import type { EstadoToma, Tratamiento } from '../types';
import { interpretarFechaVisita } from './citas';
import { validarTexto } from './validaciones';

export type NuevoTratamiento = Omit<Tratamiento, 'id' | 'tomas'>;

export function crearTratamiento(datos: NuevoTratamiento, id: number): Tratamiento {
  if (validarTexto(datos.medicamento, 120)) throw new Error('Escribe el medicamento (hasta 120 caracteres).');
  if (validarTexto(datos.indicaciones, 2000)) throw new Error('Registra las indicaciones del veterinario (hasta 2000 caracteres).');
  const inicio = interpretarFechaVisita(datos.inicio, '00:00');
  if (!inicio) throw new Error('Introduce una fecha de inicio válida (DD/MM/AAAA).');
  if (!Number.isInteger(datos.duracion_dias) || datos.duracion_dias < 1 || datos.duracion_dias > 365) {
    throw new Error('La duración debe ser un número entero entre 1 y 365 días.');
  }
  const horarios = datos.horarios.map((h) => h.trim());
  if (!horarios.length || horarios.length > 24 || horarios.some((h) => !interpretarFechaVisita(datos.inicio, h))) {
    throw new Error('Introduce de 1 a 24 horarios en formato HH:MM, separados por comas.');
  }
  if (new Set(horarios).size !== horarios.length) throw new Error('No repitas el mismo horario.');
  horarios.sort();
  const tomas: Tratamiento['tomas'] = [];
  for (let dia = 0; dia < datos.duracion_dias; dia++) {
    for (const hora of horarios) {
      const fecha = new Date(inicio);
      fecha.setDate(fecha.getDate() + dia);
      const [horas, minutos] = hora.split(':').map(Number);
      fecha.setHours(horas, minutos, 0, 0);
      tomas.push({ fecha_hora: fecha.toISOString(), estado: 'pendiente' });
    }
  }
  return { ...datos, id, medicamento: datos.medicamento.trim(), indicaciones: datos.indicaciones.trim(), horarios, tomas };
}

export function registrarToma(tratamiento: Tratamiento, fecha: string, estado: EstadoToma, ahora = Date.now()): Tratamiento {
  const toma = tratamiento.tomas.find((t) => t.fecha_hora === fecha);
  if (!toma) throw new Error('No se encontró la toma.');
  if (!['pendiente', 'administrada', 'omitida'].includes(estado)) throw new Error('Estado de toma inválido.');
  if (new Date(fecha).getTime() > ahora) throw new Error('Esta toma todavía está programada para más adelante.');
  return { ...tratamiento, tomas: tratamiento.tomas.map((t) => t.fecha_hora === fecha
    ? { ...t, estado, registrada_en: estado === 'pendiente' ? undefined : new Date(ahora).toISOString() } : t) };
}
