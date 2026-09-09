import type { RegistroCarnet } from '../types';
import { interpretarFechaVisita } from './citas';
import { validarTexto } from './validaciones';

export function validarCarnet(datos: Omit<RegistroCarnet, 'id'>, ahora = Date.now()): string | undefined {
  if (!['vacuna', 'desparasitacion'].includes(datos.tipo)) return 'Selecciona el tipo de cuidado.';
  if (validarTexto(datos.nombre, 120)) return 'Escribe el nombre de la vacuna o del desparasitante (hasta 120 caracteres).';
  const aplicada = datos.fecha_aplicacion ? interpretarFechaVisita(datos.fecha_aplicacion, '00:00') : null;
  const proxima = datos.proxima_fecha ? interpretarFechaVisita(datos.proxima_fecha, '00:00') : null;
  if (datos.fecha_aplicacion !== null && (!aplicada || aplicada.getTime() > ahora)) return 'La fecha de aplicación debe ser válida y no futura.';
  if (datos.proxima_fecha !== null && !proxima) return 'Introduce una próxima fecha válida (DD/MM/AAAA).';
  if (!aplicada && !proxima) return 'Registra una aplicación o una próxima fecha indicada por el veterinario.';
  if (aplicada && proxima && proxima <= aplicada) return 'La próxima fecha debe ser posterior a la aplicación.';
}

export function pendientesCarnet(registros: RegistroCarnet[]): RegistroCarnet[] {
  const atendidos = new Set(registros.filter((r) => r.fecha_aplicacion).map((r) => r.anterior_id));
  return registros.filter((r) => r.proxima_fecha && !atendidos.has(r.id)).sort((a, b) =>
    interpretarFechaVisita(a.proxima_fecha!, '00:00')!.getTime() - interpretarFechaVisita(b.proxima_fecha!, '00:00')!.getTime());
}

export function estadoProximo(fecha: string, ahora = new Date()): 'Próximo' | 'Vencido' {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return interpretarFechaVisita(fecha, '00:00')! < hoy ? 'Vencido' : 'Próximo';
}
