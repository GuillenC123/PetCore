import type { Cita } from '../types';

/** Interpreta los campos en la hora local y rechaza fechas inexistentes. */
export function interpretarFechaVisita(fecha: string, hora: string): Date | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha.trim());
  const tiempo = /^(\d{2}):(\d{2})$/.exec(hora.trim());
  if (!partes || !tiempo) return null;
  const [, dia, mes, anio] = partes.map(Number);
  const [, horas, minutos] = tiempo.map(Number);
  const resultado = new Date(anio, mes - 1, dia, horas, minutos);
  if (resultado.getFullYear() !== anio || resultado.getMonth() !== mes - 1 ||
      resultado.getDate() !== dia || resultado.getHours() !== horas ||
      resultado.getMinutes() !== minutos) return null;
  return resultado;
}

export function obtenerProximasCitas(citas: Cita[], ahora = Date.now()): Cita[] {
  return citas.filter((cita) =>
    cita.estado !== 'cancelado' && cita.estado !== 'completado' &&
    new Date(cita.fecha_hora).getTime() > ahora
  ).sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
}
