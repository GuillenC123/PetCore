// ============================================================================
// mascotas.routes.js - Rutas protegidas de Mascotas
// ----------------------------------------------------------------------------
// Implementa el CRUD básico de mascotas del usuario autenticado:
//  * GET    /api/mascotas             -> listar las mascotas del usuario
//  * GET    /api/mascotas/:id         -> obtener una mascota
//  * POST   /api/mascotas             -> crear una nueva mascota
//  * PUT    /api/mascotas/:id         -> actualizar
//  * DELETE /api/mascotas/:id         -> eliminar
// Todas requieren el token de autenticación (middleware authMiddleware) y
// siempre filtran por usuario_id para evitar acceder a datos ajenos.
// ============================================================================

const { Router } = require('express');
const pool = require('../db');

const router = Router();

// Map entre el valor de la app y su equivalente en la BD (enum state).
const ESTADOS = ['saludable', 'vacuna_pendiente', 'en_tratamiento'];

// ---------------------------------------------------------------------------
// LISTAR MASCOTAS
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, raza, especie, edad, estado, imagen, creado_en
       FROM Mascota
       WHERE usuario_id = $1
       ORDER BY id`,
      [req.usuario.id]
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error listando mascotas:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// OBTENER UNA MASCOTA
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, raza, especie, edad, estado, imagen, creado_en
       FROM Mascota
       WHERE id = $1 AND usuario_id = $2`,
      [req.params.id, req.usuario.id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error obteniendo la mascota:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// CREAR MASCOTA
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { nombre, raza, especie, edad, estado, imagen } = req.body;

    // --- Validación (reglas de negocio) ---
    if (!nombre || !raza || !especie || !edad) {
      return res
        .status(400)
        .json({ error: 'Nombre, raza, especie y edad son obligatorios.' });
    }
    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    const resultado = await pool.query(
      `INSERT INTO Mascota (usuario_id, nombre, raza, especie, edad, estado, imagen)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, raza, especie, edad, estado, imagen, creado_en`,
      [req.usuario.id, nombre, raza, especie, edad, estado || 'saludable', imagen || null]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Error creando la mascota:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// ACTUALIZAR MASCOTA
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { nombre, raza, especie, edad, estado, imagen } = req.body;

    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    // Con COALESCE solo actualizamos los campos enviados; el resto se conserva.
    const resultado = await pool.query(
      `UPDATE Mascota SET
          nombre    = COALESCE($3, nombre),
          raza      = COALESCE($4, raza),
          especie   = COALESCE($5, especie),
          edad      = COALESCE($6, edad),
          estado    = COALESCE($7, estado),
          imagen    = COALESCE($8, imagen)
       WHERE id = $1 AND usuario_id = $2
       RETURNING id, nombre, raza, especie, edad, estado, imagen, creado_en`,
      [req.params.id, req.usuario.id, nombre, raza, especie, edad, estado, imagen]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error actualizando la mascota:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// ELIMINAR MASCOTA
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await pool.query(
      'DELETE FROM Mascota WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuario.id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error eliminando la mascota:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;