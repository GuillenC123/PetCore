-- Alinea el ENUM existente con el estado de salud que usa el frontend.
-- PostgreSQL ejecuta esta migración fuera de una transacción explícita.
ALTER TYPE estado_mascota ADD VALUE IF NOT EXISTS 'malestar';
