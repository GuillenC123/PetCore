// ============================================================================
// recordatorios.routes.js - Rutas protegidas de Recordatorios
// ----------------------------------------------------------------------------
// Endpoints para listar y actualizar recordatorios del usuario autenticado:
//  * GET  /api/recordatorios          -> listar (filtrar por pendientes/completos)
//  * PUT  /api/recordatorios/:id      -> marcar como completado / editar
// ============================================================================

const { Router } = require('express');
const pool = require('../db');

const router = Router();

// ---------------------------------------------------------------------------
// LISTAR RECORDATORIOS
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    // Parámetro "solo_pendientes=true" devuelve únicamente los no completados.
    const soloPendientes = req.query.solo_pendientes === 'true';

    let sql = `
      SELECT r.id, r.titulo, r.descripcion, r.tipo, r.vence_en, r.completado,
             m.nombre AS mascota_nombre, r.mascota_id
      FROM Recordatorio r
      LEFT JOIN Mascota m ON m.id = r.mascota_id
      WHERE r.usuario_id = $1`;

    const parametros = [req.usuario.id];
    if (soloPendientes) {
      parametros.push(false);
      sql += ` AND r.completado = $${parametros.length}`;
    }

    sql += ` ORDER BY r.vence_en ASC NULLS LAST, r.id`;

    const resultado = await pool.query(sql, parametros);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error listando recordatorios:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// ACTUALIZAR RECORDATORIO (marcar completado, editar texto, etc.)
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { completado, titulo, descripcion, vence_en } = req.body;

    const resultado = await pool.query(
      `UPDATE Recordatorio SET
          titulo     = COALESCE($3, titulo),
          descripcion = COALESCE($4, descripcion),
          vence_en    = COALESCE($5, vence_en),
          completado  = COALESCE($6, completado)
       WHERE id = $1 AND usuario_id = $2
       RETURNING id, titulo, descripcion, vence_en, tipo, completado, mascota_id`,
      [req.params.id, req.usuario.id, titulo, descripcion, vence_en, completado]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado.' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error actualizando el recordatorio:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;