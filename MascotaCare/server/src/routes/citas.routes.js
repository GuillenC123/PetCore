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
const validar = require('../middleware/validar');
const esquemas = require('../validation/esquemas');

const router = Router();
const columnasMascota = 'id, nombre, raza, especie, edad, estado, imagen, creado_en, peso, registros_peso, nacimiento, sexo, alergias, condiciones';
const columnasRecordatorio = 'id, titulo, descripcion, tipo, vence_en, repeticion, ultima_realizacion, dia_repeticion, completado, mascota_id, cita_id';

router.use('/:id', validar(esquemas.paramsId, { origen: 'params', obligatorios: ['id'] }));

// ---------------------------------------------------------------------------
// LISTAR CITAS
// ---------------------------------------------------------------------------
router.get('/', validar(esquemas.filtroCitas, { origen: 'query' }), async (req, res) => {
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
      parametros.push(mascota_id);
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
// CREAR CITA, SU RECORDATORIO Y EL ESTADO DE LA MASCOTA
// ---------------------------------------------------------------------------
router.post('/', validar(esquemas.crearCita, { obligatorios: ['titulo', 'mascota_id', 'fecha_hora'] }), async (req, res) => {
  let conexion;
  let transaccionActiva = false;
  try {
    const { titulo, mascota_id, fecha_hora, doctor, clinica, estado } = req.body;
    conexion = await pool.connect();
    await conexion.query('BEGIN');
    transaccionActiva = true;

    // El bloqueo evita que dos citas simultáneas creen estados incoherentes.
    const mascota = await conexion.query(
      'SELECT id, nombre FROM Mascota WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [mascota_id, req.usuario.id]
    );
    if (mascota.rowCount === 0) {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(400).json({ error: 'Mascota inválida.' });
    }

    const cita = await conexion.query(
      `INSERT INTO CitaMedica (usuario_id, mascota_id, titulo, fecha_hora, doctor, clinica, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, titulo, fecha_hora, doctor, clinica, estado, mascota_id`,
      [req.usuario.id, mascota_id, titulo, new Date(fecha_hora), doctor, clinica, estado || 'pendiente']
    );
    const recordatorio = await conexion.query(
      `INSERT INTO Recordatorio (usuario_id, mascota_id, cita_id, titulo, descripcion, tipo, vence_en)
       VALUES ($1, $2, $3, 'Visita veterinaria', $4, 'cita', $5::timestamptz)
       RETURNING id, titulo, descripcion, tipo, vence_en, repeticion, ultima_realizacion, dia_repeticion, completado, mascota_id, cita_id`,
      [req.usuario.id, mascota_id, cita.rows[0].id, titulo, fecha_hora]
    );
    const mascotaActualizada = await conexion.query(
      `UPDATE Mascota SET estado = 'malestar'
       WHERE id = $1 AND usuario_id = $2
       RETURNING ${columnasMascota}`,
      [mascota_id, req.usuario.id]
    );

    await conexion.query('COMMIT');
    transaccionActiva = false;
    res.status(201).json({
      cita: cita.rows[0], recordatorio: recordatorio.rows[0], mascota: mascotaActualizada.rows[0],
    });
  } catch (err) {
    if (conexion && transaccionActiva) await conexion.query('ROLLBACK');
    console.error('Error creando la cita:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    conexion?.release();
  }
});

// ---------------------------------------------------------------------------
// COMPLETAR CITA Y SU RECORDATORIO VINCULADO
// ---------------------------------------------------------------------------
router.post('/:id/completar', async (req, res) => {
  let conexion;
  let transaccionActiva = false;
  try {
    conexion = await pool.connect();
    await conexion.query('BEGIN');
    transaccionActiva = true;
    const existente = await conexion.query(
      `SELECT id, fecha_hora, estado
       FROM CitaMedica WHERE id = $1 AND usuario_id = $2 FOR UPDATE`,
      [req.params.id, req.usuario.id]
    );
    if (!existente.rowCount) {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }
    const citaActual = existente.rows[0];
    if (citaActual.estado === 'cancelado' || citaActual.estado === 'completado') {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(409).json({ error: 'La cita ya no se puede completar.' });
    }
    if (new Date(citaActual.fecha_hora).getTime() > Date.now()) {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(409).json({ error: 'La cita aún no puede marcarse como realizada.' });
    }
    const cita = await conexion.query(
      `UPDATE CitaMedica SET estado = 'completado'
       WHERE id = $1 AND usuario_id = $2
       RETURNING id, titulo, fecha_hora, doctor, clinica, estado, mascota_id`,
      [req.params.id, req.usuario.id]
    );
    const recordatorio = await conexion.query(
      `UPDATE Recordatorio SET completado = true
       WHERE cita_id = $1 AND usuario_id = $2
       RETURNING ${columnasRecordatorio}`,
      [req.params.id, req.usuario.id]
    );
    await conexion.query('COMMIT');
    transaccionActiva = false;
    return res.json({ cita: cita.rows[0], recordatorio: recordatorio.rows[0] ?? null });
  } catch (err) {
    if (conexion && transaccionActiva) await conexion.query('ROLLBACK');
    console.error('Error completando la cita:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    conexion?.release();
  }
});

// ---------------------------------------------------------------------------
// ACTUALIZAR CITA (estado y/o datos)
// ---------------------------------------------------------------------------
router.put('/:id', validar(esquemas.cita, { parcial: true }), async (req, res) => {
  let conexion;
  let transaccionActiva = false;
  try {
    const { titulo, fecha_hora, doctor, clinica, estado } = req.body;
    conexion = await pool.connect();
    await conexion.query('BEGIN');
    transaccionActiva = true;
    const existente = await conexion.query(
      'SELECT id, estado FROM CitaMedica WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [req.params.id, req.usuario.id]
    );
    if (!existente.rowCount) {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }
    if (['cancelado', 'completado'].includes(existente.rows[0].estado) &&
        estado !== undefined && !['cancelado', 'completado'].includes(estado)) {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(409).json({ error: 'Una cita cancelada o completada no puede volver a un estado activo.' });
    }
    const resultado = await conexion.query(
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
    const completarAviso = estado === 'cancelado' || estado === 'completado';
    const recordatorio = await conexion.query(
      `UPDATE Recordatorio SET
          descripcion = COALESCE($3, descripcion),
          vence_en = COALESCE($4::timestamptz, vence_en),
          completado = CASE WHEN $5 THEN true ELSE completado END
       WHERE cita_id = $1 AND usuario_id = $2
       RETURNING ${columnasRecordatorio}`,
      [req.params.id, req.usuario.id, titulo, fecha_hora, completarAviso]
    );
    await conexion.query('COMMIT');
    transaccionActiva = false;
    res.json({ ...resultado.rows[0], recordatorio: recordatorio.rows[0] ?? null });
  } catch (err) {
    if (conexion && transaccionActiva) await conexion.query('ROLLBACK');
    console.error('Error actualizando la cita:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    conexion?.release();
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
