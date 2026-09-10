import type { Mascota, Tratamiento } from '../types';
import { pendientesCarnet, estadoProximo } from './carnet';

export function estadosSalud(mascota: Mascota, tratamientos: Tratamiento[], ahora = Date.now()) {
  const estado = mascota.estado_salud ?? mascota.estado;
  const salud = estado === 'malestar' ? 'Malestar' : estado === 'saludable' ? 'Saludable' : 'Salud sin registrar';
  const propios = tratamientos.filter((t) => t.mascota_id === mascota.id);
  const enTratamiento = propios.some((t) => {
    const primera = t.tomas[0], ultima = t.tomas[t.tomas.length - 1];
    if (!primera || !ultima) return false;
    const fin = new Date(ultima.fecha_hora); fin.setHours(23, 59, 59, 999);
    return Date.parse(primera.fecha_hora) <= ahora && fin.getTime() >= ahora;
  }) || (!propios.length && (mascota.estado === 'en_tratamiento' || !!mascota.cuidados_registrados?.includes('en_tratamiento')));
  const pendientes = pendientesCarnet(mascota.carnet ?? []);
  const vacunas = pendientes.filter((r) => r.tipo === 'vacuna');
  const vacunaPendiente = vacunas.length > 0 || (!(mascota.carnet ?? []).some((r) => r.tipo === 'vacuna') && (mascota.estado === 'vacuna_pendiente' || !!mascota.cuidados_registrados?.includes('vacuna_pendiente')));
  const vacunaVencida = vacunas.some((r) => estadoProximo(r.proxima_fecha!, new Date(ahora)) === 'Vencido');
  return { salud, enTratamiento, vacunaPendiente, vacunaVencida,
    desparasitacionPendiente: pendientes.some((r) => r.tipo === 'desparasitacion') };
}
