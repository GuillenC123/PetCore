// Recordatorios persistentes: CRUD, repetición y protección de avisos de cita.
const { Router } = require('express');
const pool = require('../db');
const validar = require('../middleware/validar');
const esquemas = require('../validation/esquemas');

const router = Router();
const columnas = 'id, titulo, descripcion, tipo, vence_en, repeticion, ultima_realizacion, dia_repeticion, completado, mascota_id, cita_id';

router.use('/:id', validar(esquemas.paramsId, { origen: 'params', obligatorios: ['id'] }));

async function mascotaPerteneceAUsuario(conexion, usuarioId, mascotaId) {
  if (mascotaId === null || mascotaId === undefined) return true;
  const resultado = await conexion.query('SELECT id FROM Mascota WHERE id = $1 AND usuario_id = $2', [mascotaId, usuarioId]);
  return resultado.rowCount > 0;
}

function siguienteOcurrencia(valor, repeticion, diaOriginal, ahora) {
  const fecha = new Date(valor);
  const limite = new Date(ahora);
  do {
    if (repeticion === 'mensual') {
      fecha.setUTCDate(1);
      fecha.setUTCMonth(fecha.getUTCMonth() + 1);
      const ultimoDia = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0)).getUTCDate();
      fecha.setUTCDate(Math.min(diaOriginal, ultimoDia));
    } else {
      fecha.setUTCDate(fecha.getUTCDate() + (repeticion === 'semanal' ? 7 : 1));
    }
  } while (fecha <= limite);
  return fecha.toISOString();
}

router.get('/', validar(esquemas.filtroRecordatorios, { origen: 'query' }), async (req, res) => {
  try {
    const soloPendientes = req.query.solo_pendientes === 'true';
    const parametros = [req.usuario.id];
    let sql = `
      SELECT r.${columnas}, m.nombre AS mascota_nombre
      FROM Recordatorio r
      LEFT JOIN Mascota m ON m.id = r.mascota_id
      WHERE r.usuario_id = $1`;
    if (soloPendientes) {
      parametros.push(false);
      sql += ` AND r.completado = $${parametros.length}`;
    }
    sql += ' ORDER BY r.completado, r.vence_en ASC NULLS LAST, r.id';
    const resultado = await pool.query(sql, parametros);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error listando recordatorios:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.post('/', validar(esquemas.crearRecordatorio, { obligatorios: ['titulo', 'tipo', 'vence_en'] }), async (req, res) => {
  try {
    const { titulo, descripcion = null, mascota_id = null, tipo, vence_en, repeticion = 'ninguna', dia_repeticion } = req.body;
    if (!await mascotaPerteneceAUsuario(pool, req.usuario.id, mascota_id)) {
      return res.status(400).json({ error: 'Mascota inválida.' });
    }
    const dia = dia_repeticion ?? new Date(vence_en).getUTCDate();
    const resultado = await pool.query(
      `INSERT INTO Recordatorio (usuario_id, mascota_id, titulo, descripcion, tipo, vence_en, repeticion, dia_repeticion)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8)
       RETURNING ${columnas}`,
      [req.usuario.id, mascota_id, titulo, descripcion, tipo, vence_en, repeticion, dia]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Error creando recordatorio:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.put('/:id', validar(esquemas.recordatorio, { parcial: true }), async (req, res) => {
  let conexion;
  let transaccionActiva = false;
  try {
    conexion = await pool.connect();
    await conexion.query('BEGIN');
    transaccionActiva = true;
    const existente = await conexion.query(
      `SELECT ${columnas} FROM Recordatorio WHERE id = $1 AND usuario_id = $2 FOR UPDATE`,
      [req.params.id, req.usuario.id]
    );
    if (!existente.rowCount) {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(404).json({ error: 'Recordatorio no encontrado.' });
    }

    const actual = existente.rows[0];
    const cambios = { ...req.body };
    if (actual.cita_id != null && (
      (cambios.mascota_id !== undefined && String(cambios.mascota_id) !== String(actual.mascota_id)) ||
      (cambios.tipo !== undefined && cambios.tipo !== actual.tipo)
    )) {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(409).json({ error: 'No puedes cambiar la mascota ni el tipo de un recordatorio asociado a una cita.' });
    }
    if (cambios.mascota_id !== undefined && !await mascotaPerteneceAUsuario(conexion, req.usuario.id, cambios.mascota_id)) {
      await conexion.query('ROLLBACK');
      transaccionActiva = false;
      return res.status(400).json({ error: 'Mascota inválida.' });
    }

    if (cambios.completado === true && actual.repeticion !== 'ninguna') {
      const dia = actual.dia_repeticion ?? new Date(actual.vence_en).getUTCDate();
      cambios.completado = false;
      cambios.vence_en = siguienteOcurrencia(actual.vence_en, actual.repeticion, dia, Date.now());
      cambios.ultima_realizacion = new Date().toISOString();
      cambios.dia_repeticion = dia;
    }
    if (cambios.vence_en !== undefined && cambios.dia_repeticion === undefined && cambios.repeticion === 'mensual') {
      cambios.dia_repeticion = new Date(cambios.vence_en).getUTCDate();
    }

    const campos = Object.keys(cambios);
    const resultado = await conexion.query(
      `UPDATE Recordatorio SET ${campos.map((campo, indice) => `${campo} = $${indice + 3}${campo === 'vence_en' ? '::timestamptz' : ''}`).join(', ')}
       WHERE id = $1 AND usuario_id = $2
       RETURNING ${columnas}`,
      [req.params.id, req.usuario.id, ...Object.values(cambios)]
    );
    await conexion.query('COMMIT');
    transaccionActiva = false;
    res.json(resultado.rows[0]);
  } catch (err) {
    if (conexion && transaccionActiva) await conexion.query('ROLLBACK');
    console.error('Error actualizando recordatorio:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    conexion?.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const resultado = await pool.query(
      'DELETE FROM Recordatorio WHERE id = $1 AND usuario_id = $2 AND cita_id IS NULL',
      [req.params.id, req.usuario.id]
    );
    if (resultado.rowCount) return res.status(204).send();
    const existente = await pool.query('SELECT cita_id FROM Recordatorio WHERE id = $1 AND usuario_id = $2', [req.params.id, req.usuario.id]);
    if (existente.rowCount && existente.rows[0].cita_id !== null) {
      return res.status(409).json({ error: 'El recordatorio asociado a una cita se elimina al eliminar la cita.' });
    }
    return res.status(404).json({ error: 'Recordatorio no encontrado.' });
  } catch (err) {
    console.error('Error eliminando recordatorio:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
