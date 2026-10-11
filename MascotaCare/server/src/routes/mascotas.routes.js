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
const validar = require('../middleware/validar');
const esquemas = require('../validation/esquemas');

const router = Router();
const columnas = 'id, nombre, raza, especie, edad, estado, imagen, creado_en, peso, registros_peso, nacimiento, sexo, alergias, condiciones';
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

router.use('/:id', validar(esquemas.paramsId, { origen: 'params', obligatorios: ['id'] }));

// ---------------------------------------------------------------------------
// LISTAR MASCOTAS
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, raza, especie, edad, estado, imagen, creado_en, peso, registros_peso, nacimiento, sexo, alergias, condiciones
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
      `SELECT id, nombre, raza, especie, edad, estado, imagen, creado_en, peso, registros_peso, nacimiento, sexo, alergias, condiciones
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
router.post('/', validar(esquemas.mascota, { obligatorios: ['nombre', 'raza', 'especie', 'edad'] }), async (req, res) => {
  try {
    const { nombre, raza, especie, edad, estado, imagen, peso = null, nacimiento = null,
      sexo = 'desconocido', alergias = '', condiciones = '' } = req.body;
    const registros = peso === null ? [] : [{ peso, fecha: hoy() }];
    const resultado = await pool.query(
      `INSERT INTO Mascota (usuario_id, nombre, raza, especie, edad, estado, imagen, peso, registros_peso, nacimiento, sexo, alergias, condiciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING ${columnas}`,
      [req.usuario.id, nombre, raza, especie, edad, estado || 'saludable', imagen || null,
        peso, JSON.stringify(registros), nacimiento, sexo, alergias, condiciones]
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
// Bloquear la fila evita perder mediciones concurrentes. Solo se reciben
// campos del esquema validado y todos los valores van parametrizados.
async function actualizar(req, res, registro) {
  let conexion;
  try {
    conexion = await pool.connect();
    await conexion.query('BEGIN');
    const actual = await conexion.query('SELECT * FROM Mascota WHERE id = $1 AND usuario_id = $2 FOR UPDATE', [req.params.id, req.usuario.id]);
    if (!actual.rowCount) {
      await conexion.query('ROLLBACK');
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }
    const cambios = registro ? {} : { ...req.body };
    const medicion = registro || (typeof cambios.peso === 'number' ? { peso: cambios.peso, fecha: hoy() } : null);
    if (medicion) {
      const historial = [...actual.rows[0].registros_peso.filter((r) => r.fecha !== medicion.fecha), medicion]
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      cambios.registros_peso = JSON.stringify(historial);
      cambios.peso = historial[historial.length - 1].peso;
    } else if (cambios.peso === null && actual.rows[0].registros_peso.length) {
      delete cambios.peso;
    }
    const campos = Object.keys(cambios);
    const resultado = campos.length ? await conexion.query(
      `UPDATE Mascota SET ${campos.map((campo, i) => `${campo} = $${i + 3}`).join(', ')}
       WHERE id = $1 AND usuario_id = $2 RETURNING ${columnas}`,
      [req.params.id, req.usuario.id, ...Object.values(cambios)]
    ) : await conexion.query(`SELECT ${columnas} FROM Mascota WHERE id = $1 AND usuario_id = $2`, [req.params.id, req.usuario.id]);
    await conexion.query('COMMIT');
    res.json(resultado.rows[0]);
  } catch (err) {
    if (conexion) await conexion.query('ROLLBACK');
    console.error('Error actualizando mascota:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { conexion?.release(); }
}
router.put('/:id', validar(esquemas.mascota, { parcial: true }), (req, res) => actualizar(req, res));
router.post('/:id/pesos', validar(esquemas.peso, { obligatorios: ['peso', 'fecha'] }), (req, res) => actualizar(req, res, req.body));

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