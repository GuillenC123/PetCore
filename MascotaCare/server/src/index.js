// ============================================================================
// index.js - Punto de entrada de la API MascotaCare
// ----------------------------------------------------------------------------
// Configura Express, CORS, el parseo de JSON (con límite) y registra las rutas
// de los distintos recursos. Las rutas que requieren sesión usan el middleware
// de autenticación (authMiddleware).
// ============================================================================

const express = require('express');
const cors = require('cors');
const { obtenerConfiguracion } = require('./config');

// Fallar antes de cargar rutas o abrir conexiones si falta configuración crítica.
const config = obtenerConfiguracion();
const authMiddleware = require('./middleware/auth');

const authRouter = require('./routes/auth.routes');
const mascotasRouter = require('./routes/mascotas.routes');
const citasRouter = require('./routes/citas.routes');
const recordatoriosRouter = require('./routes/recordatorios.routes');

const app = express();

// Middlewares globales.
app.disable('x-powered-by');
app.use(cors({
  origin(origen, callback) {
    // Las apps nativas no envían Origin; el navegador debe estar en la lista.
    if (!origen || config.corsOrigins.includes(origen)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS.'));
  },
}));
app.use(express.json({ limit: '1mb' })); // Parseo de cuerpos JSON.

// Ruta de salud para comprobar que el servidor está vivo.
app.get('/api/estado', (_req, res) => {
  res.json({ estado: 'ok', nombre: 'MascotaCare API' });
});

// --- Rutas públicas (no requieren token) ---
app.use('/api/auth', authRouter);

// --- Rutas protegidas (requieren token en la cabecera Authorization) ---
app.use('/api/mascotas', authMiddleware, mascotasRouter);
app.use('/api/citas', authMiddleware, citasRouter);
app.use('/api/recordatorios', authMiddleware, recordatoriosRouter);

// Errores del parser JSON también deben poder mostrarse desde services/api.ts.
app.use((err, _req, res, next) => {
  if (err.message === 'Origen no permitido por CORS.') {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo debe contener JSON válido.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la solicitud es demasiado grande.' });
  }
  next(err);
});

// Manejador de errores 404 para rutas inexistentes.
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Puerto del servidor (por defecto 4000).
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`MascotaCare API escuchando en http://localhost:${PORT}`);
});
