-- Ampliación aditiva que conserva las mascotas existentes.
ALTER TABLE Mascota
 ADD COLUMN IF NOT EXISTS peso DOUBLE PRECISION CHECK (peso > 0 AND peso < 'Infinity'::float8),
 ADD COLUMN IF NOT EXISTS registros_peso JSONB NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN IF NOT EXISTS nacimiento VARCHAR(10),
 ADD COLUMN IF NOT EXISTS sexo VARCHAR(12) NOT NULL DEFAULT 'desconocido' CHECK (sexo IN ('macho', 'hembra', 'desconocido')),
 ADD COLUMN IF NOT EXISTS alergias VARCHAR(1000) NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS condiciones VARCHAR(1000) NOT NULL DEFAULT '';
