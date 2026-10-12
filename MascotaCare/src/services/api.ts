// Cliente HTTP: configuración, errores y adaptación de respuestas de PostgreSQL.
import { Platform } from 'react-native';

import { normalizarIdentificador } from '@/utils/identificadores';
import type { ApiError, AuthResponse, Cita, DatosApp, EstadoCita, EstadoMascota, Identificador, Mascota, ObservacionSalud, Recordatorio, RegistroCarnet, Tratamiento, Usuario } from '@/types';

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

type MascotaRespuesta = Mascota & { datos_salud?: { carnet?: RegistroCarnet[]; observaciones?: ObservacionSalud[]; tratamientos?: Tratamiento[] } };

function mascotaApi(dato: MascotaRespuesta): Mascota {
  if (typeof dato.nombre !== 'string' || typeof dato.raza !== 'string' ||
      typeof dato.especie !== 'string' || typeof dato.edad !== 'string' ||
      !['saludable', 'malestar', 'vacuna_pendiente', 'en_tratamiento'].includes(dato.estado)) {
    throw new Error('Mascota inválida.');
  }
  const salud = dato.datos_salud;
  if (salud !== undefined && (salud === null || typeof salud !== 'object' || Array.isArray(salud) ||
      (salud.carnet !== undefined && !Array.isArray(salud.carnet)) ||
      (salud.observaciones !== undefined && !Array.isArray(salud.observaciones)) ||
      (salud.tratamientos !== undefined && !Array.isArray(salud.tratamientos)))) {
    throw new Error('Datos de salud inválidos.');
  }
  const { datos_salud, ...mascota } = dato;
  return {
    ...mascota, id: normalizarIdentificador(dato.id),
    carnet: salud?.carnet ?? dato.carnet,
    observaciones: salud?.observaciones ?? dato.observaciones,
    tratamientos_salud: salud?.tratamientos ?? dato.tratamientos_salud,
  };
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
      !['vacuna', 'alimento', 'cita', 'dosis', 'general'].includes(dato.tipo) ||
      (dato.repeticion !== undefined && !['ninguna', 'diaria', 'semanal', 'mensual'].includes(dato.repeticion))) {
    throw new Error('Recordatorio inválido.');
  }
  return {
    ...dato,
    id: normalizarIdentificador(dato.id),
    mascota_id: dato.mascota_id === null ? null : normalizarIdentificador(dato.mascota_id),
    cita_id: dato.cita_id == null ? undefined : normalizarIdentificador(dato.cita_id),
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

export async function apiActualizarPerfil(token: string, datos: Pick<Usuario, 'nombre' | 'correo'>): Promise<AuthResponse> {
  const respuesta = await request<AuthResponse>('/auth/perfil', {
    method: 'PUT', headers: autorizar(token), body: JSON.stringify(datos),
  });
  return sesionApi(respuesta);
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

export type RecordatorioEditable = Pick<Recordatorio,
  'titulo' | 'descripcion' | 'mascota_id' | 'tipo' | 'vence_en' | 'repeticion' | 'dia_repeticion'>;

export async function apiCrearRecordatorio(token: string, datos: RecordatorioEditable): Promise<Recordatorio> {
  const respuesta = await request<Recordatorio>('/recordatorios', {
    method: 'POST', headers: autorizar(token), body: JSON.stringify(datos),
  });
  return adaptar(() => recordatorioApi(respuesta));
}

export async function apiActualizarRecordatorio(token: string, id: Identificador,
  datos: Partial<RecordatorioEditable & Pick<Recordatorio, 'completado'>>): Promise<Recordatorio> {
  const respuesta = await request<Recordatorio>(`/recordatorios/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: autorizar(token), body: JSON.stringify(datos),
  });
  return adaptar(() => recordatorioApi(respuesta));
}

export async function apiEliminarRecordatorio(token: string, id: Identificador): Promise<void> {
  await request<void>(`/recordatorios/${encodeURIComponent(id)}`, { method: 'DELETE', headers: autorizar(token) });
}

/** Datos básicos y ficha de salud persistidos en la API. */
export interface MascotaNueva {
  peso?: number | null;
  nacimiento?: string | null;
  sexo?: Mascota['sexo'];
  alergias?: string;
  condiciones?: string;
  nombre: string;
  raza: string;
  especie: string;
  edad: string;
  estado: EstadoMascota;
  imagen?: string | null;
}

/** Crea una mascota en la BD y devuelve la fila con su id definitivo. */
export async function apiCrearMascota(token: string, datos: MascotaNueva, signal?: AbortSignal): Promise<Mascota> {
  const respuesta = await request<Mascota>('/mascotas', {
    method: 'POST', headers: autorizar(token), signal, body: JSON.stringify(datos),
  });
  return adaptar(() => mascotaApi(respuesta));
}

export async function apiActualizarMascota(token: string, id: Identificador, datos: Partial<MascotaNueva>): Promise<Mascota> {
  const respuesta = await request<Mascota>(`/mascotas/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: autorizar(token), body: JSON.stringify(datos),
  });
  return adaptar(() => mascotaApi(respuesta));
}

export async function apiRegistrarPeso(token: string, id: Identificador, registro: { peso: number; fecha: string }): Promise<Mascota> {
  const respuesta = await request<Mascota>(`/mascotas/${encodeURIComponent(id)}/pesos`, {
    method: 'POST', headers: autorizar(token), body: JSON.stringify(registro),
  });
  return adaptar(() => mascotaApi(respuesta));
}

export type DatosSaludRemotos = Partial<Pick<Mascota, 'carnet' | 'observaciones' | 'tratamientos_salud'>>;

/** Persiste colecciones clínicas estructuradas; los archivos locales no viajan a la API. */
export async function apiActualizarSalud(token: string, id: Identificador, datos: DatosSaludRemotos): Promise<Mascota> {
  const cuerpo = {
    ...(datos.carnet === undefined ? {} : { carnet: datos.carnet }),
    ...(datos.observaciones === undefined ? {} : { observaciones: datos.observaciones }),
    ...(datos.tratamientos_salud === undefined ? {} : { tratamientos: datos.tratamientos_salud }),
  };
  const respuesta = await request<MascotaRespuesta>(`/mascotas/${encodeURIComponent(id)}/salud`, {
    method: 'PUT', headers: autorizar(token), body: JSON.stringify(cuerpo),
  });
  return adaptar(() => mascotaApi(respuesta));
}

/** Cuerpo que acepta POST /api/citas. */
export interface CitaNueva {
  titulo: string;
  mascota_id: Identificador;
  fecha_hora: string;
  doctor?: string | null;
  clinica?: string | null;
  estado?: EstadoCita;
}

export interface CitaProgramada {
  cita: Cita;
  recordatorio: Recordatorio;
  mascota: Mascota;
}

export interface CitaCompletada {
  cita: Cita;
  recordatorio: Recordatorio | null;
}

export interface CitaActualizada {
  cita: Cita;
  recordatorio: Recordatorio | null;
}

/** Crea atómicamente cita, recordatorio y estado de la mascota. */
export async function apiCrearCita(token: string, datos: CitaNueva, signal?: AbortSignal): Promise<CitaProgramada> {
  const respuesta = await request<CitaProgramada>('/citas', {
    method: 'POST', headers: autorizar(token), signal, body: JSON.stringify(datos),
  });
  return adaptar(() => ({
    cita: citaApi(respuesta.cita),
    recordatorio: recordatorioApi(respuesta.recordatorio),
    mascota: mascotaApi(respuesta.mascota),
  }));
}

/** Completa la visita y su recordatorio asociado en una única transacción. */
export async function apiCompletarCita(token: string, id: Identificador): Promise<CitaCompletada> {
  const respuesta = await request<CitaCompletada>(`/citas/${encodeURIComponent(id)}/completar`, {
    method: 'POST', headers: autorizar(token), body: JSON.stringify({}),
  });
  return adaptar(() => ({
    cita: citaApi(respuesta.cita),
    recordatorio: respuesta.recordatorio === null ? null : recordatorioApi(respuesta.recordatorio),
  }));
}

/** Edita o cancela una cita y mantiene sincronizado su recordatorio asociado. */
export async function apiActualizarCita(token: string, id: Identificador,
  datos: Partial<Pick<Cita, 'titulo' | 'fecha_hora' | 'doctor' | 'clinica' | 'estado'>>): Promise<CitaActualizada> {
  const respuesta = await request<Cita & { recordatorio?: Recordatorio | null }>(`/citas/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: autorizar(token), body: JSON.stringify(datos),
  });
  const { recordatorio, ...cita } = respuesta;
  return adaptar(() => ({
    cita: citaApi(cita),
    recordatorio: recordatorio == null ? null : recordatorioApi(recordatorio),
  }));
}

export type { Usuario, Mascota, Cita, Recordatorio };
