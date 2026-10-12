-- Una cita genera un único recordatorio asociado. El vínculo permite que al
-- borrar una cita también se borre su aviso y evita duplicados.
ALTER TABLE Recordatorio ADD COLUMN IF NOT EXISTS cita_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recordatorio_cita') THEN
        ALTER TABLE Recordatorio
            ADD CONSTRAINT fk_recordatorio_cita
            FOREIGN KEY (cita_id) REFERENCES CitaMedica (id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recordatorio_cita_unico
    ON Recordatorio (cita_id) WHERE cita_id IS NOT NULL;
