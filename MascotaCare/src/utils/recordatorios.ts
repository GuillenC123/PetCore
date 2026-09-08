import type { Recordatorio } from '../types';

export const REPETICIONES = { ninguna: 'No repetir', diaria: 'Cada día', semanal: 'Cada semana', mensual: 'Cada mes' } as const;

/** Las fechas antiguas sin hora se interpretan como días locales. */
export function fechaRecordatorio(valor: string | null): Date | null {
  if (!valor) return null;
  const texto = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T00:00:00` : valor;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(texto)) return null;
  const fecha = new Date(texto);
  return Number.isFinite(fecha.getTime()) ? fecha : null;
}

export function estadoRecordatorio(r: Recordatorio, ahora: number): string {
  if (r.completado) return 'Completado';
  const fecha = fechaRecordatorio(r.vence_en);
  if (!fecha) return 'Sin fecha';
  if (fecha.getTime() <= ahora) return 'Vencido';
  return fecha.toDateString() === new Date(ahora).toDateString() ? 'Hoy' : 'Próximo';
}

export function ordenarRecordatorios(lista: Recordatorio[]): Recordatorio[] {
  return [...lista].sort((a, b) => Number(a.completado) - Number(b.completado) ||
    (fechaRecordatorio(a.vence_en)?.getTime() ?? Infinity) - (fechaRecordatorio(b.vence_en)?.getTime() ?? Infinity));
}

/** Una tarea repetida avanza a la primera ocurrencia futura al completarla. */
export function completarRecordatorio(r: Recordatorio, completado: boolean, ahora: number): Recordatorio {
  const fecha = fechaRecordatorio(r.vence_en);
  if (!completado || !fecha || !r.repeticion || r.repeticion === 'ninguna') return { ...r, completado };
  const diaOriginal = r.dia_repeticion ?? fecha.getDate();
  do {
    if (r.repeticion === 'mensual') {
      fecha.setDate(1);
      fecha.setMonth(fecha.getMonth() + 1);
      const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
      fecha.setDate(Math.min(diaOriginal, ultimoDia));
    } else fecha.setDate(fecha.getDate() + (r.repeticion === 'semanal' ? 7 : 1));
  } while (fecha.getTime() <= ahora);
  return { ...r, completado: false, vence_en: fecha.toISOString(), dia_repeticion: diaOriginal, ultima_realizacion: new Date(ahora).toISOString() };
}
