const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/db');
(async () => {
 try {
  await pool.query(fs.readFileSync(path.join(__dirname, '../db/migrations/001-ficha-salud.sql'), 'utf8'));
  console.log('Migración de ficha de salud aplicada.');
 } catch (error) { console.error(error.message); process.exitCode = 1; }
 finally { await pool.end(); }
})();
