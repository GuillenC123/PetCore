import type { Mascota, RegistroPeso } from '../types';
import { interpretarFechaVisita } from './citas';

export function fechaPesoHoy(ahora = new Date()): string {
  return `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()}`;
}

export function crearRegistroPeso(peso: number, fecha: string, ahora = new Date()): RegistroPeso {
  if (!Number.isFinite(peso) || peso <= 0) throw new Error('Ingresa un peso mayor que cero en kg.');
  const dia = interpretarFechaVisita(fecha, '00:00');
  if (!dia || dia.getTime() > ahora.getTime()) throw new Error('Ingresa una fecha válida que no sea futura (DD/MM/AAAA).');
  return { peso, fecha: `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}` };
}

export function aplicarRegistroPeso(mascota: Mascota, registro: RegistroPeso): Mascota {
  const registros = [...(mascota.registros_peso ?? []).filter((r) => r.fecha !== registro.fecha), registro]
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { ...mascota, registros_peso: registros, peso: registros[registros.length - 1].peso };
}

export function puntosPeso(registros: RegistroPeso[], ancho: number, alto: number) {
  if (!registros.length) return [];
  const tiempos = registros.map((r) => new Date(`${r.fecha}T00:00:00Z`).getTime());
  const min = Math.min(...registros.map((r) => r.peso));
  const max = Math.max(...registros.map((r) => r.peso));
  const inicio = Math.min(...tiempos), fin = Math.max(...tiempos);
  return registros.map((r, i) => ({
    x: fin === inicio ? ancho / 2 : (tiempos[i] - inicio) / (fin - inicio) * ancho,
    y: max === min ? alto / 2 : alto - (r.peso - min) / (max - min) * alto,
  }));
}
