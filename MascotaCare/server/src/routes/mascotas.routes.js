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
const columnas = 'id, nombre, raza, especie, edad, estado, imagen, creado_en, peso, registros_peso, nacimiento, sexo, alergias, condiciones, datos_salud';
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

router.use('/:id', validar(esquemas.paramsId, { origen: 'params', obligatorios: ['id'] }));

// ---------------------------------------------------------------------------
// LISTAR MASCOTAS
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, raza, especie, edad, estado, imagen, creado_en, peso, registros_peso, nacimiento, sexo, alergias, condiciones, datos_salud
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
      `SELECT id, nombre, raza, especie, edad, estado, imagen, creado_en, peso, registros_peso, nacimiento, sexo, alergias, condiciones, datos_salud
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

function texto(valor, maximo) {
  return typeof valor === 'string' && valor.trim().length > 0 && valor.length <= maximo;
}
function fechaDia(valor, admiteNulo = false) {
  return (admiteNulo && valor === null) || (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && Number.isFinite(Date.parse(`${valor}T00:00:00Z`)));
}
function validarDatosSalud(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return 'Se esperaba un objeto de salud.';
  for (const clave of Object.keys(datos)) if (!['carnet', 'observaciones', 'tratamientos'].includes(clave)) return 'Campo de salud no permitido.';
  if (datos.carnet !== undefined && (!Array.isArray(datos.carnet) || datos.carnet.length > 200 || datos.carnet.some((r) => !r || !Number.isSafeInteger(r.id) || !['vacuna', 'desparasitacion'].includes(r.tipo) || !texto(r.nombre, 120) || !fechaDia(r.fecha_aplicacion, true) || !fechaDia(r.proxima_fecha, true)))) return 'Carnet inválido.';
  if (datos.observaciones !== undefined && (!Array.isArray(datos.observaciones) || datos.observaciones.length > 500 || datos.observaciones.some((o) => !o || !Number.isSafeInteger(o.id) || !['observacion', 'consulta'].includes(o.tipo) || !texto(o.titulo, 120) || !texto(o.descripcion, 2000) || typeof o.fecha !== 'string' || !Number.isFinite(Date.parse(o.fecha))))) return 'Observaciones inválidas.';
  if (datos.tratamientos !== undefined && (!Array.isArray(datos.tratamientos) || datos.tratamientos.length > 100 || datos.tratamientos.some((t) => !t || !Number.isSafeInteger(t.id) || !texto(t.medicamento, 120) || !texto(t.indicaciones, 2000) || !fechaDia(t.inicio) || !Number.isInteger(t.duracion_dias) || t.duracion_dias < 1 || t.duracion_dias > 365 || !Array.isArray(t.horarios) || !Array.isArray(t.tomas)))) return 'Tratamientos inválidos.';
  return null;
}

// Guarda los datos clínicos estructurados. No acepta adjuntos locales porque
// una URI del teléfono no es recuperable desde PostgreSQL ni otro dispositivo.
router.put('/:id/salud', async (req, res) => {
  try {
    const error = validarDatosSalud(req.body);
    if (error) return res.status(400).json({ error });
    const actual = await pool.query('SELECT datos_salud FROM Mascota WHERE id = $1 AND usuario_id = $2', [req.params.id, req.usuario.id]);
    if (!actual.rowCount) return res.status(404).json({ error: 'Mascota no encontrada.' });
    const datosActuales = actual.rows[0].datos_salud || {};
    const datosSalud = { ...datosActuales, ...req.body };
    if (Array.isArray(datosSalud.carnet)) datosSalud.carnet = datosSalud.carnet.map(({ comprobante, ...registro }) => registro);
    const resultado = await pool.query(
      `UPDATE Mascota SET datos_salud = $3::jsonb WHERE id = $1 AND usuario_id = $2 RETURNING ${columnas}`,
      [req.params.id, req.usuario.id, JSON.stringify(datosSalud)]
    );
    return res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error guardando datos de salud:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
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
