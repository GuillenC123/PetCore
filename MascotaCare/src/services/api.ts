// Cliente HTTP: configuración, errores y adaptación de respuestas de PostgreSQL.
import { Platform } from 'react-native';

import { normalizarIdentificador } from '@/utils/identificadores';
import type { ApiError, AuthResponse, Cita, DatosApp, Identificador, Mascota, Recordatorio, Usuario } from '@/types';

const HOST = Platform.select({ android: '10.0.2.2', default: 'localhost' });
export const API_URL = (process.env.EXPO_PUBLIC_API_URL?.trim() || `http://${HOST}:4000/api`).replace(/\/+$/, '');

export type TipoErrorApi = 'red' | 'http' | 'respuesta' | 'cancelada' | 'tiempo';

export class ErrorApi extends Error {
  constructor(message: string, public readonly tipo: TipoErrorApi, public readonly status?: number) {
    super(message);
    this.name = 'ErrorApi';
  }
}

export function esErrorDeRed(error: unknown): boolean {
  return error instanceof ErrorApi && error.tipo === 'red';
}

/** La cancelación de sesión y el tiempo de espera no habilitan el modo demo. */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  let tiempoAgotado = false;
  const cancelar = () => controller.abort();
  options.signal?.addEventListener('abort', cancelar, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(() => { tiempoAgotado = true; controller.abort(); }, 15000);

  try {
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
    } catch {
      if (options.signal?.aborted) throw new ErrorApi('La solicitud se canceló.', 'cancelada');
      if (tiempoAgotado) throw new ErrorApi('El servidor tardó demasiado en responder. Vuelve a intentarlo.', 'tiempo');
      throw new ErrorApi('No se pudo conectar con el servidor. Comprueba la conexión y vuelve a intentarlo.', 'red');
    }

    if (!res.ok) {
      let mensaje = `El servidor respondió con un error (${res.status}).`;
      try {
        const cuerpo = await res.json() as ApiError;
        if (typeof cuerpo?.error === 'string') mensaje = cuerpo.error;
      } catch {
        // Una respuesta HTTP sigue siendo HTTP aunque su cuerpo no sea JSON.
      }
      throw new ErrorApi(mensaje, 'http', res.status);
    }
    if (res.status === 204) return undefined as T;

    try {
      return await res.json() as T;
    } catch {
      if (options.signal?.aborted) throw new ErrorApi('La solicitud se canceló.', 'cancelada');
      if (tiempoAgotado) throw new ErrorApi('El servidor tardó demasiado en responder. Vuelve a intentarlo.', 'tiempo');
      throw new ErrorApi('El servidor devolvió una respuesta que no se pudo leer.', 'respuesta');
    }
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancelar);
  }
}

/** Una respuesta inválida no se confunde con un fallo de conexión. */
function adaptar<T>(transformar: () => T): T {
  try {
    return transformar();
  } catch {
    throw new ErrorApi('El servidor devolvió datos con un formato inválido.', 'respuesta');
  }
}

function mascotaApi(dato: Mascota): Mascota {
  if (typeof dato.nombre !== 'string' || typeof dato.raza !== 'string' ||
      typeof dato.especie !== 'string' || typeof dato.edad !== 'string' ||
      !['saludable', 'malestar', 'vacuna_pendiente', 'en_tratamiento'].includes(dato.estado)) {
    throw new Error('Mascota inválida.');
  }
  return { ...dato, id: normalizarIdentificador(dato.id) };
}

function citaApi(dato: Cita): Cita {
  if (typeof dato.titulo !== 'string' || !Number.isFinite(Date.parse(dato.fecha_hora)) ||
      !['confirmado', 'pendiente', 'programado', 'cancelado', 'completado'].includes(dato.estado)) {
    throw new Error('Cita inválida.');
  }
  return { ...dato, id: normalizarIdentificador(dato.id), mascota_id: normalizarIdentificador(dato.mascota_id) };
}

function recordatorioApi(dato: Recordatorio): Recordatorio {
  if (typeof dato.titulo !== 'string' || typeof dato.completado !== 'boolean' ||
      !['vacuna', 'alimento', 'cita', 'dosis', 'general'].includes(dato.tipo)) {
    throw new Error('Recordatorio inválido.');
  }
  return {
    ...dato,
    id: normalizarIdentificador(dato.id),
    mascota_id: dato.mascota_id === null ? null : normalizarIdentificador(dato.mascota_id),
  };
}

function listaApi<T>(datos: T[], transformar: (dato: T) => T): T[] {
  return adaptar(() => {
    if (!Array.isArray(datos)) throw new Error('Se esperaba una lista.');
    return datos.map(transformar);
  });
}

function sesionApi(datos: AuthResponse): AuthResponse {
  return adaptar(() => {
    if (typeof datos.token !== 'string' || !datos.token) throw new Error('Falta el token.');
    if (typeof datos.usuario.nombre !== 'string' || typeof datos.usuario.correo !== 'string') {
      throw new Error('Usuario inválido.');
    }
    return { ...datos, usuario: { ...datos.usuario, id: normalizarIdentificador(datos.usuario.id) } };
  });
}

export async function apiLogin(correo: string, password: string, signal?: AbortSignal): Promise<AuthResponse> {
  const datos = await request<AuthResponse>('/auth/login', {
    method: 'POST', signal, body: JSON.stringify({ correo, password }),
  });
  return sesionApi(datos);
}

export async function apiRegistro(nombre: string, correo: string, password: string, signal?: AbortSignal): Promise<AuthResponse> {
  const datos = await request<AuthResponse>('/auth/registro', {
    method: 'POST', signal, body: JSON.stringify({ nombre, correo, password }),
  });
  return sesionApi(datos);
}

function autorizar(token: string): RequestInit['headers'] {
  return { Authorization: `Bearer ${token}` };
}

export async function apiGetMascotas(token: string, signal?: AbortSignal): Promise<Mascota[]> {
  return listaApi(await request<Mascota[]>('/mascotas', { headers: autorizar(token), signal }), mascotaApi);
}

export async function apiGetCitas(token: string, signal?: AbortSignal): Promise<Cita[]> {
  return listaApi(await request<Cita[]>('/citas', { headers: autorizar(token), signal }), citaApi);
}

export async function apiGetRecordatorios(token: string, signal?: AbortSignal): Promise<Recordatorio[]> {
  return listaApi(await request<Recordatorio[]>('/recordatorios', { headers: autorizar(token), signal }), recordatorioApi);
}

/** Se entregan las tres listas juntas; un fallo no publica una carga parcial. */
export async function apiGetDatos(token: string, signal?: AbortSignal): Promise<DatosApp> {
  const [mascotas, citas, recordatorios] = await Promise.all([
    apiGetMascotas(token, signal), apiGetCitas(token, signal), apiGetRecordatorios(token, signal),
  ]);
  return { mascotas, citas, recordatorios };
}

export async function apiTacharRecordatorio(token: string, id: Identificador, completado: boolean): Promise<Recordatorio> {
  const datos = await request<Recordatorio>(`/recordatorios/${id}`, {
    method: 'PUT', headers: autorizar(token), body: JSON.stringify({ completado }),
  });
  return adaptar(() => recordatorioApi(datos));
}

export type { Usuario, Mascota, Cita, Recordatorio };
