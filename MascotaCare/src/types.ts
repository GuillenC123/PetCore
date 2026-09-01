// ============================================================================
// types.ts - Definición de los modelos de datos de MascotaCare
// ----------------------------------------------------------------------------
// Estos tipos de TypeScript describen la forma de los objetos que llegan tanto
// del backend (API Express) como de los datos simulados (mockData). Definirlos
// una sola vez nos permite tipar los componentes y el contexto, garantizando
// coherencia entre la vista y los datos.
// ============================================================================

// ---------------------------------------------------------------------------
// Estados semánticos para la UI. Se derivan automáticamente de los valores que
// devuelve la API (que coinciden con los ENUMs de PostgreSQL).
// ---------------------------------------------------------------------------

/** Estado de salud de una mascota. */
export type EstadoMascota = 'saludable' | 'vacuna_pendiente' | 'en_tratamiento';

/** Estado de una cita veterinaria. */
export type EstadoCita = 'confirmado' | 'pendiente' | 'programado' | 'cancelado' | 'completado';

/** Tipo de un recordatorio. */
export type TipoRecordatorio = 'vacuna' | 'alimento' | 'cita' | 'dosis' | 'general';

// ---------------------------------------------------------------------------
// Modelo de Usuario
// ---------------------------------------------------------------------------

export interface Usuario {
  /** Identificador numérico en la base de datos. */
  id: number;
  /** Nombre completo del usuario (se muestra en el saludo). */
  nombre: string;
  /** Correo electrónico único (usado para iniciar sesión). */
  correo: string;
}

// ---------------------------------------------------------------------------
// Modelo de Mascota
// ---------------------------------------------------------------------------

export interface Mascota {
  id: number;
  nombre: string;
  raza: string;
  /** Perro, Gato, etc. */
  especie: string;
  /** Edad en formato de texto (ej. "3 años"). */
  edad: string;
  estado: EstadoMascota;
  /** URI o null si no hay foto subida. */
  imagen: string | null;
}

// ---------------------------------------------------------------------------
// Modelo de Cita Médica
// ---------------------------------------------------------------------------

export interface Cita {
  id: number;
  titulo: string;
  /** Fecha y hora como string ISO (ej. "2026-09-01T15:30:00Z"). */
  fecha_hora: string;
  doctor: string | null;
  clinica: string | null;
  estado: EstadoCita;
  /** Nombre de la mascota asociada (se une desde la API). */
  mascota_nombre?: string;
  mascota_id: number;
}

// ---------------------------------------------------------------------------
// Modelo de Recordatorio
// ---------------------------------------------------------------------------

export interface Recordatorio {
  id: number;
  titulo: string;
  descripcion: string | null;
  tipo: TipoRecordatorio;
  /** Fecha límite (DD-MM o texto amigable según la pantalla). */
  vence_en: string | null;
  /** Si ya fue completado (checkbox). */
  completado: boolean;
  mascota_nombre?: string;
  mascota_id: number | null;
}

// ---------------------------------------------------------------------------
// Respuestas de la autenticación
// ---------------------------------------------------------------------------

export interface AuthResponse {
  usuario: Usuario;
  token: string;
}

/** Error normalizado que podemos mostrar en los formularios. */
export interface ApiError {
  error: string;
}