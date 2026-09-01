// ============================================================================
// citas.routes.js - Rutas protegidas de Citas Médicas
// ----------------------------------------------------------------------------
// CRUD de citas del usuario autenticado:
//  * GET    /api/citas    -> listar citas (opcionalmente por mascota)
//  * POST   /api/citas    -> crear
//  * PUT    /api/citas    -> actualizar estado
// En todos los casos se filtra por usuario_id para proteger los datos.
// ============================================================================

const { Router } = require('express');
const pool = require('../db');

const router = Router();

// Valores permitidos para el estado de una cita.
const ESTADOS = ['confirmado', 'pendiente', 'programado', 'cancelado', 'completado'];

// ---------------------------------------------------------------------------
// LISTAR CITAS
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { mascota_id } = req.query;

    // Si se pasa "mascota_id", filtramos también por esa mascota.
    const parametros = [req.usuario.id];
    let sql = `
      SELECT c.id, c.titulo, c.fecha_hora, c.doctor, c.clinica, c.estado,
             m.nombre AS mascota_nombre, c.mascota_id
      FROM CitaMedica c
      JOIN Mascota m ON m.id = c.mascota_id
      WHERE c.usuario_id = $1`;

    if (mascota_id) {
      parametros.push(Number(mascota_id));
      sql += ` AND c.mascota_id = $${parametros.length}`;
    }

    sql += ` ORDER BY c.fecha_hora ASC`;

    const resultado = await pool.query(sql, parametros);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error listando citas:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// CREAR CITA
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { titulo, mascota_id, fecha_hora, doctor, clinica, estado } = req.body;

    // --- Validación de negocio ---
    if (!titulo || !mascota_id || !fecha_hora) {
      return res
        .status(400)
        .json({ error: 'Título, mascota y fecha son obligatorios.' });
    }
    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    // Verifica que la mascota pertenezca al usuario autenticado.
    const mascota = await pool.query(
      'SELECT id FROM Mascota WHERE id = $1 AND usuario_id = $2',
      [mascota_id, req.usuario.id]
    );
    if (mascota.rowCount === 0) {
      return res.status(400).json({ error: 'Mascota inválida.' });
    }

    const resultado = await pool.query(
      `INSERT INTO CitaMedica (usuario_id, mascota_id, titulo, fecha_hora, doctor, clinica, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, titulo, fecha_hora, doctor, clinica, estado, mascota_id`,
      [req.usuario.id, mascota_id, titulo, new Date(fecha_hora), doctor, clinica, estado || 'pendiente']
    );

    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Error creando la cita:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// ACTUALIZAR CITA (estado y/o datos)
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { titulo, fecha_hora, doctor, clinica, estado } = req.body;

    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    const resultado = await pool.query(
      `UPDATE CitaMedica SET
          titulo     = COALESCE($3, titulo),
          fecha_hora = COALESCE($4, fecha_hora),
          doctor     = COALESCE($5, doctor),
          clinica    = COALESCE($6, clinica),
          estado     = COALESCE($7, estado)
       WHERE id = $1 AND usuario_id = $2
       RETURNING id, titulo, fecha_hora, doctor, clinica, estado, mascota_id`,
      [req.params.id, req.usuario.id, titulo, fecha_hora ? new Date(fecha_hora) : null, doctor, clinica, estado]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error actualizando la cita:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// ELIMINAR CITA
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await pool.query(
      'DELETE FROM CitaMedica WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuario.id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error eliminando la cita:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;