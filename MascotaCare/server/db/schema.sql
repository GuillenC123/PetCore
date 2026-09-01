-- ============================================================================
-- MascotaCare - Esquema de Base de Datos (PostgreSQL)
-- ----------------------------------------------------------------------------
-- Este script crea las tablas, reglas de negocio y datos iniciales de la
-- aplicación. Se aplica a la base de datos existente llamada "MascotaCare".
--
-- Convenciones de diseño:
--   * IDs numéricos autogenerados (BIGSERIAL) para simplicidad académica.
--   * UUID para la contraseña (hash), nunca en texto plano.
--   * Timestamps con zona horaria (TIMESTAMPTZ) para fechas/horas.
--   * Restricciones CHECK para garantizar valores válidos (estados, tipos).
--   * Reglas de negocio vía CONSTRAINTS (integridad a nivel de BD).
--
-- IMPORTANTE: Este script es IDEMPOTENTE a nivel de esquema: cada bloque usa
-- "CREATE TABLE IF NOT EXISTS" y el seed solo inserta si las tablas están
-- vacías, de modo que se puede re-ejecutar sin destruir datos.
-- ============================================================================

-- ============================================================================
-- REGLA DE NEGOCIO: ENUMERACIONES GLOBALES
-- ----------------------------------------------------------------------------
-- Los estados se implementan como tipos ENUM para que la base de datos rechace
-- automáticamente cualquier valor no contemplado en la app, garantizando
-- consistencia entre el cliente y el servidor.
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_mascota') THEN
        CREATE TYPE estado_mascota AS ENUM ('saludable', 'vacuna_pendiente', 'en_tratamiento');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_cita') THEN
        CREATE TYPE estado_cita AS ENUM ('confirmado', 'pendiente', 'programado', 'cancelado', 'completado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_recordatorio') THEN
        CREATE TYPE tipo_recordatorio AS ENUM ('vacuna', 'alimento', 'cita', 'dosis', 'general');
    END IF;
END $$;

-- ============================================================================
-- TABLA: Usuario
-- ----------------------------------------------------------------------------
-- Almacena las credenciales y datos de perfil de cada persona. La contraseña
-- se guarda únicamente como hash (bcrypt). El correo es único para permitir el
-- inicio de sesión.
-- ============================================================================
CREATE TABLE IF NOT EXISTS Usuario (
    id            BIGSERIAL PRIMARY KEY,
    nombre        VARCHAR(120)  NOT NULL,
    correo        VARCHAR(254)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    creado_en     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- REGLA DE NEGOCIO: El correo debe tener un formato razonable.
ALTER TABLE Usuario DROP CONSTRAINT IF EXISTS chk_usuario_correo;
ALTER TABLE Usuario ADD CONSTRAINT chk_usuario_correo
    CHECK (correo ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

-- ============================================================================
-- TABLA: Mascota
-- ----------------------------------------------------------------------------
-- Cada mascota pertenece a un usuario. No se permite eliminar el usuario si
-- tiene mascotas (ON DELETE RESTRICT) para preservar su historial.
-- ============================================================================
CREATE TABLE IF NOT EXISTS Mascota (
    id                BIGSERIAL PRIMARY KEY,
    usuario_id        BIGINT        NOT NULL,
    nombre            VARCHAR(120)  NOT NULL,
    raza              VARCHAR(120)  NOT NULL,
    especie           VARCHAR(60)   NOT NULL DEFAULT 'Otro',
    edad              VARCHAR(60)   NOT NULL,
    estado            estado_mascota NOT NULL DEFAULT 'saludable',
    imagen            VARCHAR(500),           -- ruta/uri de la foto de la mascota
    creado_en         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_mascota_usuario
        FOREIGN KEY (usuario_id) REFERENCES Usuario (id) ON DELETE RESTRICT
);

-- Índice para acelerar la consulta "mascotas de un usuario".
CREATE INDEX IF NOT EXISTS idx_mascota_usuario ON Mascota (usuario_id);

-- ============================================================================
-- TABLA: CitaMedica
-- ----------------------------------------------------------------------------
-- Representa una visita veterinaria. Se referencia una mascota y un usuario
-- (el dueño). La fecha y hora es obligatoria y el estado debe ser válido.
-- ============================================================================
CREATE TABLE IF NOT EXISTS CitaMedica (
    id             BIGSERIAL PRIMARY KEY,
    usuario_id     BIGINT       NOT NULL,
    mascota_id     BIGINT       NOT NULL,
    titulo         VARCHAR(200) NOT NULL,
    fecha_hora     TIMESTAMPTZ  NOT NULL,
    doctor         VARCHAR(200),
    clinica        VARCHAR(200),
    estado         estado_cita  NOT NULL DEFAULT 'pendiente',
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_cita_usuario
        FOREIGN KEY (usuario_id) REFERENCES Usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_cita_mascota
        FOREIGN KEY (mascota_id) REFERENCES Mascota (id) ON DELETE CASCADE
);

-- REGLA DE NEGOCIO: Una cita cancelada/completada solo puede pasar a otro
-- estado "no activo", nunca volver a pendiente/programado/confirmado.
ALTER TABLE CitaMedica DROP CONSTRAINT IF EXISTS chk_cita_estado_final;
ALTER TABLE CitaMedica ADD CONSTRAINT chk_cita_estado_final
    CHECK (
        estado NOT IN ('cancelado', 'completado')
        OR estado IN ('completado', 'cancelado')
    );

-- Índice para listar citas por usuario ordenadas por fecha.
CREATE INDEX IF NOT EXISTS idx_cita_usuario ON CitaMedica (usuario_id, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_cita_mascota ON CitaMedica (mascota_id);

-- ============================================================================
-- TABLA: Recordatorio
-- ----------------------------------------------------------------------------
-- Tareas relacionadas con el cuidado de una mascota. El campo "vence_en"
-- representa la fecha límite prevista.
-- ============================================================================
CREATE TABLE IF NOT EXISTS Recordatorio (
    id                BIGSERIAL PRIMARY KEY,
    usuario_id        BIGINT       NOT NULL,
    mascota_id        BIGINT,
    titulo            VARCHAR(200) NOT NULL,
    descripcion       VARCHAR(300),
    tipo              tipo_recordatorio NOT NULL DEFAULT 'general',
    vence_en          DATE,
    completado        BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_recordatorio_usuario
        FOREIGN KEY (usuario_id) REFERENCES Usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_recordatorio_mascota
        FOREIGN KEY (mascota_id) REFERENCES Mascota (id) ON DELETE CASCADE
);

-- Índice para listar recordatorios pendientes de un usuario.
CREATE INDEX IF NOT EXISTS idx_recordatorio_usuario
    ON Recordatorio (usuario_id, completado, vence_en);

-- ============================================================================
-- DATOS DE EJEMPLO (SEED)
-- ----------------------------------------------------------------------------
-- Crea el usuario de prueba "Ana García" y sus mascotas/citas/recordatorios,
-- SOLO si la tabla Usuario está vacía (para no duplicar datos al re-ejecutar).
--
-- REGLA DE NEGOCIO aplicada aquí:
--   * La contraseña del usuario semilla es "123456" almacenada como hash bcrypt
--     (generado con `bcrypt.hashSync('123456', 10)`). El prefijo "$2b$..." indica
--     el algoritmo, costo y salt; la API la verifica con bcrypt.compare.
-- ============================================================================
DO $$
DECLARE
    v_user_id BIGINT;
    v_luna    BIGINT;
    v_milo    BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Usuario LIMIT 1) THEN

        -- Hash bcrypt de "123456" con costo 10 (tiempo de ejecución fijo).
        INSERT INTO Usuario (nombre, correo, password_hash)
        VALUES (
            'Ana García',
            'ana.garcia@email.com',
            '$2a$10$kJ62yAV88R249wXFzFBqNOUGwM5DN5JWKAwgO4u9UupNhoaGKewMi'
        ) RETURNING id INTO v_user_id;

        -- Mascota 1: Luna (Golden Retriever) - con vacuna pendiente.
        INSERT INTO Mascota (usuario_id, nombre, raza, especie, edad, estado)
        VALUES (v_user_id, 'Luna', 'Golden Retriever', 'Perro', '3 años', 'vacuna_pendiente')
        RETURNING id INTO v_luna;

        -- Mascota 2: Milo (Gato Persa/Doméstico) - saludable.
        INSERT INTO Mascota (usuario_id, nombre, raza, especie, edad, estado)
        VALUES (v_user_id, 'Milo', 'Gato Persa/Doméstico', 'Gato', '1 año/5 años', 'saludable')
        RETURNING id INTO v_milo;

        -- Citas de Luna y Milo.
        INSERT INTO CitaMedica (usuario_id, mascota_id, titulo, fecha_hora, doctor, clinica, estado)
        VALUES
            (v_user_id, v_luna, 'Revisión General - Luna',      NOW() + INTERVAL '2 hours',  'Dr. Ramírez', 'VetClinica Central', 'confirmado'),
            (v_user_id, v_milo, 'Vacunación - Milo',             NOW() + INTERVAL '1 day',    'Dra. López',   'Clínica Paws',       'pendiente'),
            (v_user_id, v_luna, 'Desparasitación - Luna',        NOW() + INTERVAL '14 days',  'Dr. Ramírez', 'VetClinica Central', 'programado');

        -- Recordatorios.
        INSERT INTO Recordatorio (usuario_id, mascota_id, titulo, descripcion, tipo, vence_en, completado)
        VALUES
            (v_user_id, v_milo, 'Vacuna Antirrábica (Milo)', 'Vence mañana',          'vacuna',  CURRENT_DATE + 1, FALSE),
            (v_user_id, v_luna, 'Comprar alimento (Luna)',   'En 3 días',             'alimento', CURRENT_DATE + 3, FALSE);

    END IF;
END $$;