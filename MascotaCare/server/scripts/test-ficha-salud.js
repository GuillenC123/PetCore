// Prueba de integración contra la API local y su PostgreSQL.
// Solo crea datos temporales propios y los retira al terminar.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../src/db');
const base = process.env.TEST_API_URL || 'http://127.0.0.1:4000/api';
(async () => {
  let usuario;
  let token;
  async function enviar(ruta, method = 'GET', body, esperado = 200) {
    const res = await fetch(base + ruta, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const datos = await res.json();
    assert.equal(res.status, esperado, JSON.stringify(datos));
    return datos;
  }
  try {
    const sesion = await enviar('/auth/registro', 'POST', {
      nombre: 'Prueba ficha', correo: `ficha-${randomUUID()}@example.com`, password: randomUUID(),
    }, 201);
    usuario = sesion.usuario.id; token = sesion.token;
    const mascota = await enviar('/mascotas', 'POST', {
      nombre: 'Temporal', raza: 'Mestiza', especie: 'Gato', edad: '2 años', sexo: 'hembra', peso: 4.5,
    }, 201);
    assert.equal(mascota.peso, 4.5);
    assert.equal(mascota.sexo, 'hembra');
    assert.equal(mascota.alergias, '');
    assert.equal(mascota.condiciones, '');
    assert.equal(mascota.registros_peso.length, 1);
    const ruta = `/mascotas/${mascota.id}`;
    let guardada = await enviar(ruta, 'PUT', { especie: 'Otro', sexo: 'macho', edad: '3 años', nacimiento: '01/01/2023', alergias: 'Polen', condiciones: '' });
    assert.equal(guardada.peso, 4.5);
    assert.equal(guardada.especie, 'Otro');
    assert.equal(guardada.alergias, 'Polen');
    guardada = await enviar(ruta, 'PUT', { nacimiento: null, edad: '3 años', alergias: '' });
    assert.equal(guardada.nacimiento, null);
    assert.equal(guardada.alergias, '');
    guardada = await enviar(ruta + '/pesos', 'POST', { peso: 3, fecha: '2020-01-01' });
    assert.equal(guardada.peso, 4.5, 'Una fecha antigua no cambia el peso actual');
    await Promise.all([
      enviar(ruta + '/pesos', 'POST', { peso: 3.2, fecha: '2020-01-02' }),
      enviar(ruta + '/pesos', 'POST', { peso: 3.3, fecha: '2020-01-03' }),
    ]);
    guardada = await enviar(ruta + '/pesos', 'POST', { peso: 3.5, fecha: '2020-01-01' });
    assert.equal(guardada.registros_peso.length, 4);
    assert.equal(guardada.registros_peso[0].peso, 3.5);
    guardada = await enviar(ruta, 'PUT', { peso: 5 });
    assert.equal(guardada.peso, 5);
    assert.equal(guardada.registros_peso.length, 4);
    const recargada = (await enviar('/mascotas')).find((m) => m.id === mascota.id);
    assert.deepEqual(recargada, guardada, 'La recarga conserva la ficha y el historial');
    await enviar(ruta + '/pesos', 'POST', { peso: -1, fecha: '2020-01-01' }, 400);
    await enviar('/mascotas/9223372036854775807/pesos', 'POST', { peso: 2, fecha: '2020-01-01' }, 404);
    const otra = await enviar('/mascotas', 'POST', { nombre: 'Sin peso', raza: 'Mestiza', especie: 'Perro', edad: '1 año' }, 201);
    assert.equal(otra.peso, null);
    assert.deepEqual(otra.registros_peso, []);
    console.log('OK: alta, ficha opcional, recarga, peso, correcciones y mediciones concurrentes.');
  } finally {
    if (usuario) {
      await pool.query('DELETE FROM Mascota WHERE usuario_id = $1', [usuario]);
      await pool.query('DELETE FROM Usuario WHERE id = $1', [usuario]);
    }
    await pool.end();
  }
})().catch((err) => { console.error(err); process.exitCode = 1; });
