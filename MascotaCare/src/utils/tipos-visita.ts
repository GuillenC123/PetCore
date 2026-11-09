import type { TipoVisita } from '../types';

export const TIPOS_VISITA: readonly { value: TipoVisita; label: string }[] = [
  { value: 'consulta_malestar', label: 'Consulta por malestar' },
  { value: 'control_preventivo', label: 'Control preventivo' },
  { value: 'vacunacion', label: 'Vacunación' },
  { value: 'desparasitacion', label: 'Desparasitación' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'otro', label: 'Otro' },
];

export function esTipoVisita(value: unknown): value is TipoVisita {
  return TIPOS_VISITA.some((tipo) => tipo.value === value);
}

export function etiquetaTipoVisita(value?: TipoVisita): string {
  return TIPOS_VISITA.find((tipo) => tipo.value === value)?.label ?? 'Visita veterinaria';
}
