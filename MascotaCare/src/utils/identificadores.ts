import type { Identificador } from '../types';

/** PostgreSQL devuelve BIGINT como texto. Solo convertimos enteros seguros. */
export function normalizarIdentificador(valor: unknown): Identificador {
  if (typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0) return valor;
  if (typeof valor !== 'string' || !/^[1-9]\d{0,18}$/.test(valor) || BigInt(valor) > 9223372036854775807n) {
    throw new Error('La respuesta contiene un identificador inválido.');
  }
  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : valor;
}

/** Resuelve parámetros de navegación sin convertir BIGINT a Number. */
export function buscarPorId<T extends { id: Identificador }>(lista: T[], id?: string): T | undefined {
  return id === undefined ? undefined : lista.find((elemento) => String(elemento.id) === id);
}

export function esIdentificadorRemoto(id: Identificador): boolean {
  return typeof id === 'number' ? Number.isSafeInteger(id) && id > 0 : /^[1-9]\d*$/.test(id);
}
