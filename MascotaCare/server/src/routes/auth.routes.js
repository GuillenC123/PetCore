// ============================================================================
// auth.routes.js - Endpoints de autenticación (registro y login)
// ----------------------------------------------------------------------------
//  * POST /api/auth/registro  -> crea una cuenta nueva
//  * POST /api/auth/login     -> verifica credenciales y devuelve un JWT
//
// Las contraseñas se almacenan únicamente como hash (bcrypt). Al registrarse
// se devuelve el token directamente para que el usuario quede autenticado.
// ============================================================================

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const pool = require('../db');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'mascotacare_secreto_desarrollo';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Número de rondas para generar el hash (a mayor número, más seguro y lento).
const BCRYPT_SALT_ROUNDS = 10;

const router = Router();

// Genera un JWT con los datos esenciales del usuario.
function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ---------------------------------------------------------------------------
// REGISTRO
// ---------------------------------------------------------------------------
router.post('/registro', async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    // --- Validación de campos (reglas de negocio del lado servidor) ---
    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }
    if (typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(correo)) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Comprueba que el correo no esté ya registrado.
    const existe = await pool.query('SELECT id FROM Usuario WHERE correo = $1', [correo.toLowerCase()]);
    if (existe.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este correo.' });
    }

    // Calcula el hash de la contraseña (nunca lo guardamos en texto plano).
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Inserta el nuevo usuario y devolvemos su registro completo.
    const resultado = await pool.query(
      `INSERT INTO Usuario (nombre, correo, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, correo`,
      [nombre.trim(), correo.toLowerCase(), passwordHash]
    );
    const usuario = resultado.rows[0];

    // Responde 201 con el usuario y su token de sesión.
    res.status(201).json({ usuario, token: firmarToken(usuario) });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { correo, password } = req.body;

    // --- Validación mínima de entrada ---
    if (!correo || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }

    // Busca al usuario por su correo.
    const resultado = await pool.query(
      'SELECT id, nombre, correo, password_hash FROM Usuario WHERE correo = $1',
      [correo.toLowerCase()]
    );

    if (resultado.rowCount === 0) {
      // Respuesta genérica para no revelar qué campos son incorrectos.
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const usuario = resultado.rows[0];

    // Compara la contraseña ingresada contra el hash almacenado.
    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    // Construye el objeto público (sin el hash) y firma el token.
    const usuarioPublico = { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo };
    res.json({ usuario: usuarioPublico, token: firmarToken(usuarioPublico) });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;