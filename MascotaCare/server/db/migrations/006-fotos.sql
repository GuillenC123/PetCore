-- Fotos pequeñas y portables en la cuenta; conserva las imágenes anteriores.
ALTER TABLE Usuario ADD COLUMN IF NOT EXISTS imagen TEXT;
ALTER TABLE Mascota ALTER COLUMN imagen TYPE TEXT;
