export const RAZA_MESTIZA = 'Mestizo / sin raza definida';
export const RAZA_DESCONOCIDA = 'Desconocida';

export function filtrarRazas(razas: string[], busqueda: string): string[] {
  const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const texto = normalizar(busqueda);
  return razas.filter((raza) => normalizar(raza).includes(texto));
}
