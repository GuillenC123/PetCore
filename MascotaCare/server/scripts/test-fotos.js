// Prueba contra PostgreSQL real con una API y cuenta temporales propias.
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const net = require('node:net');
const assert = require('node:assert/strict');
const path = require('node:path');
const pool = require('../src/db');

async function main() {
  const reserva = net.createServer();
  await new Promise((resolve) => reserva.listen(0, '127.0.0.1', resolve));
  const puerto = reserva.address().port;
  await new Promise((resolve) => reserva.close(resolve));
  const servidor = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], {
    env: { ...process.env, PORT: String(puerto) }, stdio: 'ignore', windowsHide: true,
  });
  const origen = `http://127.0.0.1:${puerto}/api`;
  const correo = `foto-${randomUUID()}@example.com`;
  let usuarioId;
  let token;
  async function solicitar(ruta, metodo = 'GET', datos) {
    const respuesta = await fetch(`${origen}${ruta}`, {
      method: metodo, signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(datos === undefined ? {} : { body: JSON.stringify(datos) }),
    });
    const cuerpo = await respuesta.json();
    assert.ok(respuesta.ok, `${metodo} ${ruta}: ${respuesta.status} ${cuerpo.error ?? ''}`);
    return cuerpo;
  }
  try {
    let listo = false;
    for (let intento = 0; intento < 50; intento++) {
      try { await solicitar('/estado'); listo = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
    }
    assert.ok(listo, 'No inició la API temporal.');
    const cuenta = await solicitar('/auth/registro', 'POST', { nombre: 'Prueba Fotos', correo, password: randomUUID() });
    usuarioId = cuenta.usuario.id; token = cuenta.token;
    // Fixture de transporte: comprueba almacenamiento y recuperación del contenido.
    const imagen = 'data:image/jpeg;base64,/9j/2Q==';
    await solicitar('/auth/perfil', 'PUT', { nombre: 'Prueba Fotos', correo, imagen });
    assert.equal((await pool.query('SELECT imagen FROM Usuario WHERE id = $1', [usuarioId])).rows[0].imagen, imagen);
    const mascota = await solicitar('/mascotas', 'POST', { nombre: 'Luna', raza: 'Mestiza', especie: 'Perro', edad: '2 años', imagen });
    assert.equal((await solicitar('/mascotas'))[0].imagen, imagen);
    await solicitar(`/mascotas/${mascota.id}`, 'PUT', { imagen: null });
    assert.equal((await solicitar('/mascotas'))[0].imagen, null);
    await solicitar(`/mascotas/${mascota.id}`, 'PUT', { imagen });
    assert.equal((await solicitar('/mascotas'))[0].imagen, imagen);
    await solicitar('/auth/perfil', 'PUT', { nombre: 'Prueba Fotos', correo, imagen: null });
    assert.equal((await pool.query('SELECT imagen FROM Usuario WHERE id = $1', [usuarioId])).rows[0].imagen, null);
    console.log('OK: fotos de perfil y mascota guardadas, recuperadas y eliminadas en PostgreSQL real.');
  } finally {
    servidor.kill();
    // Solo se eliminan las filas de la cuenta aleatoria creada por esta prueba.
    if (usuarioId) {
      await pool.query('DELETE FROM Mascota WHERE usuario_id = $1', [usuarioId]);
      await pool.query('DELETE FROM Usuario WHERE id = $1 AND correo = $2', [usuarioId, correo]);
    }
    await pool.end();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
