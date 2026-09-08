import type { Mascota } from '../types';
import { interpretarFechaVisita } from './citas';
import { validarPeso, validarTexto } from './validaciones';

export interface DatosFichaSalud {
  nacimiento: string | null;
  edad: string;
  sexo: NonNullable<Mascota['sexo']>;
  peso: number | null;
  alergias: string;
  condiciones: string;
}

export function validarFichaSalud(datos: DatosFichaSalud): string | undefined {
  if (datos.nacimiento !== null) {
    const fecha = interpretarFechaVisita(datos.nacimiento, '00:00');
    if (!fecha || fecha.getTime() > Date.now()) return 'Ingresa un nacimiento válido que no sea futuro (DD/MM/AAAA).';
  } else if (validarTexto(datos.edad, 60)) return 'Indica la edad aproximada, por ejemplo 2 años y 3 meses.';
  if (!['macho', 'hembra', 'desconocido'].includes(datos.sexo)) return 'Selecciona el sexo.';
  if (datos.peso !== null && validarPeso(String(datos.peso))) return 'Ingresa un peso mayor que cero en kg.';
  if (datos.alergias.length > 1000 || datos.condiciones.length > 1000) return 'Usa hasta 1000 caracteres en alergias y condiciones.';
}

export function edadMascota(mascota: Pick<Mascota, 'nacimiento' | 'edad'>, ahora = new Date()): string {
  const nacimiento = mascota.nacimiento ? interpretarFechaVisita(mascota.nacimiento, '00:00') : null;
  if (!nacimiento) return mascota.edad || 'Sin registrar';
  let meses = (ahora.getFullYear() - nacimiento.getFullYear()) * 12 + ahora.getMonth() - nacimiento.getMonth();
  if (ahora.getDate() < nacimiento.getDate()) meses--;
  if (meses <= 0) return 'Menos de 1 mes';
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  return [anios ? `${anios} año${anios === 1 ? '' : 's'}` : '', resto ? `${resto} mes${resto === 1 ? '' : 'es'}` : ''].filter(Boolean).join(' y ');
}
