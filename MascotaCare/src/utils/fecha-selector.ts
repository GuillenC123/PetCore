import { interpretarFechaVisita } from './citas';

export interface DateTimeFieldProps {
  mode: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: string;
  disabled?: boolean;
}
export function valorSelector(value: string, mode: 'date' | 'time', ahora = new Date()): Date {
  return (mode === 'date' ? interpretarFechaVisita(value, '00:00') : interpretarFechaVisita('01/01/2000', value)) ?? ahora;
}
export function formatearSelector(fecha: Date, mode: 'date' | 'time'): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return mode === 'date' ? `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()}` : `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}
export function valorWeb(value: string, mode: 'date' | 'time'): string {
  if (!value) return '';
  if (mode === 'time') return value;
  return value.split('/').reverse().join('-');
}
export function desdeWeb(value: string, mode: 'date' | 'time'): string {
  return mode === 'date' ? value.split('-').reverse().join('/') : value;
}
