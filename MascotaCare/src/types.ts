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
export type EstadoMascota = 'saludable' | 'malestar' | 'vacuna_pendiente' | 'en_tratamiento';

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
  /** Peso en kilogramos; ausente para mascotas que aún no lo registraron. */
  peso?: number | null;
  registros_peso?: RegistroPeso[];
  carnet?: RegistroCarnet[];
  observaciones?: ObservacionSalud[];
  adjuntos_historial?: Record<string, AdjuntoSalud[]>;
  nacimiento?: string | null;
  sexo?: 'macho' | 'hembra' | 'desconocido';
  alergias?: string;
  condiciones?: string;
  estado: EstadoMascota;
  /** Salud independiente de los cuidados; estado se conserva por compatibilidad con la API. */
  estado_salud?: 'saludable' | 'malestar' | 'sin_registrar';
  cuidados_registrados?: ('en_tratamiento' | 'vacuna_pendiente')[];
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
  repeticion?: 'ninguna' | 'diaria' | 'semanal' | 'mensual';
  ultima_realizacion?: string;
  dia_repeticion?: number;
  cita_id?: number;
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

export type EstadoToma = 'pendiente' | 'administrada' | 'omitida';
export interface AdjuntoSalud { uri: string; nombre: string; mime: string }
export interface ObservacionSalud {
  id: number;
  tipo: 'observacion' | 'consulta';
  titulo: string;
  descripcion: string;
  fecha: string;
}
export interface RegistroCarnet {
  id: number;
  tipo: 'vacuna' | 'desparasitacion';
  nombre: string;
  fecha_aplicacion: string | null;
  proxima_fecha: string | null;
  comprobante: string | null;
  anterior_id?: number;
}
export interface RegistroPeso {
  /** Fecha local ISO, sin hora: AAAA-MM-DD. Un registro por día. */
  fecha: string;
  peso: number;
}
export interface Toma {
  fecha_hora: string;
  estado: EstadoToma;
  registrada_en?: string;
}
export interface Tratamiento {
  id: number;
  mascota_id: number;
  medicamento: string;
  indicaciones: string;
  inicio: string;
  duracion_dias: number;
  horarios: string[];
  tomas: Toma[];
}
