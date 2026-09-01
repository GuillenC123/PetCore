// ============================================================================
// auth.js - Middleware de autenticación (JWT)
// ----------------------------------------------------------------------------
// Verifica la cabecera "Authorization: Bearer <token>" y, si es válida,
// adjunta la información del usuario (id, nombre, correo) al objeto `req`
// para que los controladores siguientes puedan usarla. Si el token es
// inválido o no existe, responde con 401 y corta la petición.
// ============================================================================

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'mascotacare_secreto_desarrollo';

/**
 * Middleware que protege las rutas que requieren iniciar sesión.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authMiddleware(req, res, next) {
  // Lee el token de la cabecera "Authorization".
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No se proporcionó un token de autenticación.' });
  }

  try {
    // Verifica la firma y la expiración del token.
    const payload = jwt.verify(token, JWT_SECRET);
    // Expone los datos del usuario autenticado al resto de la petición.
    req.usuario = { id: payload.id, nombre: payload.nombre, correo: payload.correo };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = authMiddleware;