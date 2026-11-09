-- El motivo de la visita es independiente de su estado y de la salud de la mascota.
-- Las citas anteriores conservan sus datos y quedan sin clasificación específica.
ALTER TABLE CitaMedica
    ADD COLUMN IF NOT EXISTS tipo_visita VARCHAR(32) NOT NULL DEFAULT 'otro';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_cita_tipo_visita' AND conrelid = 'citamedica'::regclass
    ) THEN
        ALTER TABLE CitaMedica ADD CONSTRAINT chk_cita_tipo_visita
            CHECK (tipo_visita IN (
                'consulta_malestar', 'control_preventivo', 'vacunacion',
                'desparasitacion', 'seguimiento', 'otro'
            ));
    END IF;
END $$;

-- Solo afecta a nuevas filas; no cambia el estado de ninguna cita existente.
ALTER TABLE CitaMedica ALTER COLUMN estado SET DEFAULT 'programado';
