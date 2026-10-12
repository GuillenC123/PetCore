// ============================================================================
// db.js - Pool de conexiones a PostgreSQL
// ----------------------------------------------------------------------------
// Usamos `pg.Pool` para reutilizar conexiones a la base de datos "MascotaCare".
// Las credenciales de conexión provienen de las variables de entorno
// (dotenv), nunca se escriben hardcodeadas en el código.
// ============================================================================

const { Pool } = require('pg');
const { obtenerConfiguracion } = require('./config');

// Configura el pool exclusivamente a partir de la variable DATABASE_URL.
const { databaseUrl } = obtenerConfiguracion();
const pool = new Pool({
  connectionString: databaseUrl,
});

// Exporta el pool para ser usado por los módulos de rutas.
module.exports = pool;
