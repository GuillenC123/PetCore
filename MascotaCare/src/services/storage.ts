import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CacheDatosApp, DatosApp, DestinoCache, OrigenCache } from '@/types';
import { fechaIsoCache, objetoCache, prepararDatosCache } from '@/utils/cache';
import { normalizarIdentificador } from '@/utils/identificadores';

export const VERSION_CACHE = 1;

export class ErrorStorage extends Error {
  constructor(message: string, public readonly tipo: 'destino' | 'datos' | 'lectura' | 'escritura' | 'eliminacion') {
    super(message);
    this.name = 'ErrorStorage';
  }
}

export type ResultadoLecturaCache =
  | { estado: 'disponible'; cache: CacheDatosApp }
  | { estado: 'ausente' | 'corrupta' }
  | { estado: 'incompatible'; version: number }
  | { estado: 'error'; error: ErrorStorage };

function prepararDestino(destino: DestinoCache): { clave: string; usuarioId: string; origen: OrigenCache } {
  try {
    const origen = destino.origen;
    if (origen !== 'api' && origen !== 'demo') throw new Error('Origen inválido.');
    const usuarioId = String(normalizarIdentificador(destino.usuarioId));
    return { clave: `petcore:cache:v${VERSION_CACHE}:${origen}:usuario:${usuarioId}`, usuarioId, origen };
  } catch {
    throw new ErrorStorage('Selecciona un usuario y origen válidos para la caché.', 'destino');
  }
}

// Una cola por clave: usuarios distintos no se bloquean entre sí. También se
// ordenan lecturas y eliminaciones para no leer a medias ni resucitar datos borrados.
const pendientes = new Map<string, Promise<void>>();

function encolar<T>(clave: string, operacion: () => Promise<T>): Promise<T> {
  const anterior = pendientes.get(clave) ?? Promise.resolve();
  const resultado = anterior.then(operacion);
  const finalizada = resultado.then(() => {}, () => {});
  pendientes.set(clave, finalizada);
  void finalizada.then(() => {
    if (pendientes.get(clave) === finalizada) pendientes.delete(clave);
  });
  return resultado;
}

export async function leerCache(destino: DestinoCache): Promise<ResultadoLecturaCache> {
  const { clave, usuarioId, origen } = prepararDestino(destino);
  return encolar(clave, async () => {
    let contenido: string | null;
    try {
      contenido = await AsyncStorage.getItem(clave);
    } catch {
      return { estado: 'error', error: new ErrorStorage('No se pudo leer la caché del dispositivo.', 'lectura') };
    }
    if (contenido === null) return { estado: 'ausente' };
    try {
      const valor = objetoCache(JSON.parse(contenido));
      const version = valor.version;
      if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) throw new Error('Versión inválida.');
      if (version !== VERSION_CACHE) return { estado: 'incompatible', version };
      if (valor.usuarioId !== usuarioId || valor.origen !== origen) throw new Error('Propietario inválido.');
      const cache: CacheDatosApp = {
        version: VERSION_CACHE, usuarioId, origen,
        actualizadoEn: fechaIsoCache(valor.actualizadoEn), datos: prepararDatosCache(valor.datos),
      };
      return { estado: 'disponible', cache };
    } catch {
      // Se conserva el contenido: detectar corrupción no equivale a borrarlo.
      return { estado: 'corrupta' };
    }
  });
}

export async function guardarCache(destino: DestinoCache, datos: DatosApp): Promise<CacheDatosApp> {
  const { clave, usuarioId, origen } = prepararDestino(destino);
  let cache: CacheDatosApp;
  let contenido: string;
  try {
    cache = {
      version: VERSION_CACHE, usuarioId, origen,
      actualizadoEn: new Date().toISOString(), datos: prepararDatosCache(datos),
    };
    // Captura al llamar, antes de esperar en la cola: posteriores cambios del
    // objeto de entrada no pueden alterar una escritura ya solicitada.
    contenido = JSON.stringify(cache);
  } catch {
    throw new ErrorStorage('Los datos no tienen un formato válido para guardar la caché.', 'datos');
  }
  return encolar(clave, async () => {
    try {
      await AsyncStorage.setItem(clave, contenido);
      return cache;
    } catch {
      throw new ErrorStorage('No se pudo guardar la caché en el dispositivo.', 'escritura');
    }
  });
}

export async function eliminarCache(destino: DestinoCache): Promise<void> {
  const { clave } = prepararDestino(destino);
  return encolar(clave, async () => {
    try {
      await AsyncStorage.removeItem(clave);
    } catch {
      throw new ErrorStorage('No se pudo eliminar la caché del dispositivo.', 'eliminacion');
    }
  });
}
