// ============================================================================
// mockData.ts - Datos simulados de la aplicación MascotaCare
// ----------------------------------------------------------------------------
// Esta información alimenta la interfaz cuando el servidor API local no está
// disponible (así la app siempre se puede ejecutar para demostración). Todas
// las estructuras siguen los tipos definidos en "types.ts".
//
// Los datos coinciden con las credenciales y el contenido sembrado en la base
// de datos PostgreSQL (usuario de prueba "Ana García").
// ============================================================================

import type {
  Usuario,
  Mascota,
  Cita,
  Recordatorio,
} from '@/types';

// ---------------------------------------------------------------------------
// Usuario de ejemplo (perfecto para la pantalla de Perfil y el saludo).
// ---------------------------------------------------------------------------

export const mockUsuario: Usuario = {
  id: 1,
  nombre: 'Ana García',
  correo: 'ana.garcia@email.com',
};

// ---------------------------------------------------------------------------
// Mascotas de "Ana García" (Luna y Milo).
//  * Luna: tiene una vacuna pendiente  -> estado de alerta (rojo).
//  * Milo: se encuentra saludable      -> estado de éxito (verde).
// ---------------------------------------------------------------------------

export const mockMascotas: Mascota[] = [
  {
    id: 1,
    nombre: 'Luna',
    raza: 'Golden Retriever',
    especie: 'Perro',
    edad: '3 años',
    estado: 'vacuna_pendiente',
    imagen: null,
  },
  {
    id: 2,
    nombre: 'Milo',
    raza: 'Gato Persa/Doméstico',
    especie: 'Gato',
    edad: '1 año/5 años',
    estado: 'saludable',
    imagen: null,
  },
];

// ---------------------------------------------------------------------------
// Citas programadas.
//  * Cita 1 (Confirmado, azul)     - Revisión General de Luna hoy.
//  * Cita 2 (Pendiente, rojo)      - Vacunación de Milo mañana.
//  * Cita 3 (Programado, verde)    - Desparasitación de Luna.
// ---------------------------------------------------------------------------

export const mockCitas: Cita[] = [
  {
    id: 1,
    titulo: 'Revisión General - Luna',
    fecha_hora: '2026-09-01T15:30:00.000Z',
    doctor: 'Dr. Ramírez',
    clinica: 'VetClinica Central',
    estado: 'confirmado',
    mascota_nombre: 'Luna',
    mascota_id: 1,
  },
  {
    id: 2,
    titulo: 'Vacunación - Milo',
    fecha_hora: '2026-09-02T10:00:00.000Z',
    doctor: 'Dra. López',
    clinica: 'Clínica Paws',
    estado: 'pendiente',
    mascota_nombre: 'Milo',
    mascota_id: 2,
  },
  {
    id: 3,
    titulo: 'Desparasitación - Luna',
    fecha_hora: '2026-09-15T09:00:00.000Z',
    doctor: 'Dr. Ramírez',
    clinica: 'VetClinica Central',
    estado: 'programado',
    mascota_nombre: 'Luna',
    mascota_id: 1,
  },
];

// ---------------------------------------------------------------------------
// Recordatorios.
//  * El primero vence mañana y es de tipo vacuna (se resalta con borde verde
//    oscuro y subtítulo en rojo con ícono de alerta).
//  * El segundo es de tipo alimento y su subtítulo va en gris.
// ---------------------------------------------------------------------------

export const mockRecordatorios: Recordatorio[] = [
  {
    id: 1,
    titulo: 'Vacuna Antirrábica (Milo)',
    descripcion: 'Vence mañana',
    tipo: 'vacuna',
    vence_en: '2026-09-02',
    completado: false,
    mascota_nombre: 'Milo',
    mascota_id: 2,
  },
  {
    id: 2,
    titulo: 'Comprar alimento (Luna)',
    descripcion: 'En 3 días',
    tipo: 'alimento',
    vence_en: '2026-09-04',
    completado: false,
    mascota_nombre: 'Luna',
    mascota_id: 1,
  },
];

// ---------------------------------------------------------------------------
// Datos "globales" para la app en modo demostración (sin servidor).
// ---------------------------------------------------------------------------

export const mockData = {
  usuario: mockUsuario,
  mascotas: mockMascotas,
  citas: mockCitas,
  recordatorios: mockRecordatorios,
};

/** Credenciales de acceso para el usuario de demostración. */
export const MOCK_EMAIL = 'ana.garcia@email.com';
export const MOCK_PASSWORD = '123456';