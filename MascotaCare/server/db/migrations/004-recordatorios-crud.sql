-- Añade hora y repetición sin perder avisos existentes: las fechas históricas
-- se interpretan como medianoche de Lima.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repeticion_recordatorio') THEN
        CREATE TYPE repeticion_recordatorio AS ENUM ('ninguna', 'diaria', 'semanal', 'mensual');
    END IF;
END $$;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'recordatorio' AND column_name = 'vence_en') <> 'timestamp with time zone' THEN
        ALTER TABLE Recordatorio
            ALTER COLUMN vence_en TYPE TIMESTAMPTZ
            USING CASE WHEN vence_en IS NULL THEN NULL ELSE vence_en::timestamp AT TIME ZONE 'America/Lima' END;
    END IF;
END $$;

ALTER TABLE Recordatorio
    ADD COLUMN IF NOT EXISTS repeticion repeticion_recordatorio NOT NULL DEFAULT 'ninguna',
    ADD COLUMN IF NOT EXISTS ultima_realizacion TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dia_repeticion SMALLINT;

ALTER TABLE Recordatorio DROP CONSTRAINT IF EXISTS chk_recordatorio_dia_repeticion;
ALTER TABLE Recordatorio ADD CONSTRAINT chk_recordatorio_dia_repeticion
    CHECK (dia_repeticion IS NULL OR dia_repeticion BETWEEN 1 AND 31);
