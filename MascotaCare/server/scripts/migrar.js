const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/db');
(async () => {
 try {
  const carpeta = path.join(__dirname, '../db/migrations');
  const migraciones = fs.readdirSync(carpeta).filter((archivo) => /^\d+-.+\.sql$/.test(archivo)).sort();
  for (const migracion of migraciones) {
   await pool.query(fs.readFileSync(path.join(carpeta, migracion), 'utf8'));
   console.log(`Migración aplicada: ${migracion}`);
  }
 } catch (error) { console.error(error.message); process.exitCode = 1; }
 finally { await pool.end(); }
})();
