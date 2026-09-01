// ============================================================================
// index.js - Punto de entrada de la API MascotaCare
// ----------------------------------------------------------------------------
// Configura Express, CORS, el parseo de JSON (con límite) y registra las rutas
// de los distintos recursos. Las rutas que requieren sesión usan el middleware
// de autenticación (authMiddleware).
// ============================================================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authMiddleware = require('./middleware/auth');

const authRouter = require('./routes/auth.routes');
const mascotasRouter = require('./routes/mascotas.routes');
const citasRouter = require('./routes/citas.routes');
const recordatoriosRouter = require('./routes/recordatorios.routes');

// Carga las variables de entorno desde "server/.env".
dotenv.config();

const app = express();

// Middlewares globales.
app.use(cors()); // Permite peticiones desde la app (Expo) y el navegador.
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

// Manejador de errores 404 para rutas inexistentes.
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Puerto del servidor (por defecto 4000).
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`MascotaCare API escuchando en http://localhost:${PORT}`);
});