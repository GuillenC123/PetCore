// ============================================================================
// db.js - Pool de conexiones a PostgreSQL
// ----------------------------------------------------------------------------
// Usamos `pg.Pool` para reutilizar conexiones a la base de datos "MascotaCare".
// Las credenciales de conexión provienen de las variables de entorno
// (dotenv), nunca se escriben hardcodeadas en el código.
// ============================================================================

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Carga las variables definidas en el archivo "server/.env".
dotenv.config();

// Configura el pool de conexiones a partir de la variable DATABASE_URL.
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    // Valor por defecto local (para que el servidor funcione sin .env).
    'postgres://postgres:danieladm123@localhost:5432/MascotaCare',
});

// Exporta el pool para ser usado por los módulos de rutas.
module.exports = pool;