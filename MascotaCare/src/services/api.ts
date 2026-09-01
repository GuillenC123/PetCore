// ============================================================================
// api.ts - Cliente del servidor API local de MascotaCare
// ----------------------------------------------------------------------------
// Encapsula todas las llamadas HTTP (fetch) hacia el servidor Express:
//   * Endpoints públicos:  login y registro (no requieren token).
//   * Endpoints protegidos: mascotas, citas y recordatorios (requieren token).
//
// Reglas de funcionamiento:
//   1. La URL base viene de la constante API_URL. En un emulador Android se usa
//      "10.0.2.2" para alcanzar el localhost de la máquina anfitriona; en buen
//      una prueba real se deja "localhost".
//   2. El token JWT se envía en la cabecera "Authorization: Bearer <token>".
//   3. Si el servidor no responde (offline), la app usa los datos simulados de
//      "mockData" para que la interfaz siempre pueda demostrarse. Para ello se
//      exportan funciones "use fallback" manejadas desde el contexto.
// ============================================================================

import { Platform } from 'react-native';

import type {
  ApiError,
  AuthResponse,
  Cita,
  Mascota,
  Recordatorio,
  Usuario,
} from '@/types';

// En un emulador Android el "localhost" de la máquina se accede por 10.0.2.2.
// Para un dispositivo físico, reemplazar por la IP LAN del equipo que corre la API.
const HOST = Platform.select({
  android: '10.0.2.2',
  default: 'localhost',
});

/** URL base del servidor API. */
export const API_URL = `http://${HOST}:4000/api`;

/**
 * Lanza fetch y normaliza la respuesta: si el servidor devuelve un error HTTP
 * se lanza una excepción con el mensaje de la API (para mostrarlo en formas).
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  // Si la respuesta no es 2xx, intentamos leer el mensaje de error de la API.
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const cuerpo = (await res.json()) as ApiError;
      if (cuerpo?.error) message = cuerpo.error;
    } catch {
      // Si no hay cuerpo JSON, dejamos el mensaje genérico.
    }
    throw new Error(message);
  }

  // 204 No Content (p. ej. en DELETE) no tiene cuerpo que analizar.
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}

// ============================================================================
// Servicio de autenticación (público)
// ============================================================================

/** Inicia sesión con correo y contraseña. */
export function apiLogin(correo: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, password }),
  });
}

/** Crea una cuenta nueva y devuelve el token de sesión. */
export function apiRegistro(
  nombre: string,
  correo: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ nombre, correo, password }),
  });
}

// ============================================================================
// Servicio de datos protegidos (requieren token)
// ============================================================================

/** Cabeceras con el token JWT del usuario logueado. */
function autorizar(token: string): RequestInit['headers'] {
  return { Authorization: `Bearer ${token}` };
}

/** Lista las mascotas del usuario autenticado. */
export function apiGetMascotas(token: string): Promise<Mascota[]> {
  return request<Mascota[]>('/mascotas', { headers: autorizar(token) });
}

/** Lista las citas del usuario autenticado. */
export function apiGetCitas(token: string): Promise<Cita[]> {
  return request<Cita[]>('/citas', { headers: autorizar(token) });
}

/** Lista los recordatorios pendientes del usuario autenticado. */
export function apiGetRecordatorios(token: string): Promise<Recordatorio[]> {
  return request<Recordatorio[]>('/recordatorios?', { headers: autorizar(token) });
}

/** Marca un recordatorio como completado (mueve su checkbox). */
export function apiTacharRecordatorio(
  token: string,
  id: number,
  completado: boolean
): Promise<Recordatorio> {
  return request<Recordatorio>(`/recordatorios/${id}`, {
    method: 'PUT',
    headers: autorizar(token),
    body: JSON.stringify({ completado }),
  });
}

// ============================================================================
// Tipos de utilidad exportados para reuso
// ============================================================================

export type { Usuario, Mascota, Cita, Recordatorio };