-- Registros clínicos estructurados. Los archivos adjuntos se conservan en el
-- dispositivo hasta contar con almacenamiento de objetos dedicado.
ALTER TABLE Mascota
    ADD COLUMN IF NOT EXISTS datos_salud JSONB NOT NULL
    DEFAULT '{"carnet": [], "observaciones": [], "tratamientos": []}'::jsonb;

ALTER TABLE Mascota DROP CONSTRAINT IF EXISTS chk_mascota_datos_salud;
ALTER TABLE Mascota ADD CONSTRAINT chk_mascota_datos_salud
    CHECK (jsonb_typeof(datos_salud) = 'object');
