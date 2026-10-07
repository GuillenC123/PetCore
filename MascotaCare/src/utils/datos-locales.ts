import type { Identificador } from '../types';

export interface CambiosLocales {
  mascotas: Set<string>;
  citas: Set<string>;
  recordatorios: Set<string>;
}

/** Conserva las filas editadas en la sesión, incluso si no aparecen en la nueva respuesta. */
export function conservarCambiosLocales<T extends { id: Identificador }>(actual: T[], remoto: T[], protegidos: Set<string>): T[] {
  const porId = new Map(actual.map((dato) => [String(dato.id), dato]));
  const idsRemotos = new Set(remoto.map((dato) => String(dato.id)));
  return [
    ...remoto.map((dato) => protegidos.has(String(dato.id)) ? porId.get(String(dato.id)) ?? dato : dato),
    ...actual.filter((dato) => protegidos.has(String(dato.id)) && !idsRemotos.has(String(dato.id))),
  ];
}
