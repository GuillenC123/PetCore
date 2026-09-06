const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// La prueba recorre las rutas HTTP reales, sustituyendo únicamente PostgreSQL.
const consultas = [];
let resultados = [];
const dbPath = require.resolve('../src/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  query: async (sql, parametros) => {
    consultas.push({ sql, parametros });
    return resultados.shift() || { rowCount: 1, rows: [{ id: '1' }] };
  },
} };

test('validación de las rutas HTTP', async (t) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.usuario = { id: '1' }; next(); });
  for (const recurso of ['auth', 'mascotas', 'citas', 'recordatorios']) {
    app.use(`/${recurso}`, require(`../src/routes/${recurso}.routes`));
  }
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const enviar = (metodo, ruta, body) => fetch(url + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const mascota = { nombre: 'Luna', raza: 'Mestiza', especie: 'Perro', edad: '3 años' };
  const cita = { titulo: 'Control', mascota_id: '1', fecha_hora: '2026-09-06T10:30:00-05:00' };
  const registro = { nombre: 'Ana', correo: 'ana@example.com', password: '123456' };
  const invalidos = [
    ['POST', '/auth/registro', { ...registro, nombre: ' '.repeat(5) }],
    ['POST', '/auth/registro', { ...registro, nombre: 'a'.repeat(121) }],
    ['POST', '/auth/registro', { ...registro, password: 123456 }],
    ['POST', '/auth/registro', { ...registro, password: '🔐'.repeat(19) }],
    ['POST', '/auth/login', { correo: ['ana@example.com'], password: '123456' }],
    ['POST', '/auth/login', { correo: 'sin-correo', password: '123456' }],
    ['POST', '/auth/login', {}],
    ['POST', '/mascotas', []],
    ['POST', '/mascotas', undefined],
    ['POST', '/mascotas', { ...mascota, nombre: {} }],
    ['POST', '/mascotas', { ...mascota, edad: 3 }],
    ['POST', '/mascotas', { ...mascota, raza: ' ' }],
    ['POST', '/mascotas', { ...mascota, especie: 'a'.repeat(61) }],
    ['POST', '/mascotas', { ...mascota, imagen: 'a'.repeat(501) }],
    ['PUT', '/mascotas/1', { estado: '' }],
    ['PUT', '/mascotas/1', { nombre: null }],
    ['PUT', '/mascotas/1', {}],
    ['PUT', '/mascotas/1', { usuario_id: 2 }],
    ['PUT', '/mascotas/1', { imagen: null }],
    ['GET', '/mascotas/no-es-id'],
    ['DELETE', '/mascotas/-1'],
    ['DELETE', '/citas/1.5'],
    ['PUT', '/recordatorios/9223372036854775808', { completado: true }],
    ['GET', '/citas?mascota_id='],
    ['GET', '/citas?mascota_id=1&mascota_id=2'],
    ['GET', '/recordatorios?solo_pendientes=si'],
    ['POST', '/citas', { ...cita, mascota_id: true }],
    ['POST', '/citas', { ...cita, mascota_id: 9007199254740992 }],
    ['POST', '/citas', { ...cita, fecha_hora: '2026-02-30T10:30:00Z' }],
    ['POST', '/citas', { ...cita, fecha_hora: '2026-09-06T24:00:00Z' }],
    ['POST', '/citas', { ...cita, fecha_hora: '2026-09-06T10:30:00' }],
    ['PUT', '/citas/1', { fecha_hora: 123 }],
    ['PUT', '/citas/1', { estado: false }],
    ['PUT', '/recordatorios/1', { completado: 'false' }],
    ['PUT', '/recordatorios/1', { completado: null }],
    ['PUT', '/recordatorios/1', { vence_en: '2025-02-29' }],
    ['PUT', '/recordatorios/1', { descripcion: 'a'.repeat(301) }],
  ];
  for (const [indice, [metodo, ruta, body]] of invalidos.entries()) {
    await t.test(`rechaza entrada inválida ${indice + 1}: ${metodo} ${ruta}`, async () => {
      consultas.length = 0;
      const respuesta = await enviar(metodo, ruta, body);
      assert.equal(respuesta.status, 400);
      assert.equal(typeof (await respuesta.json()).error, 'string');
      assert.equal(consultas.length, 0, 'No debe consultar la BD con entradas inválidas');
    });
  }

  await t.test('normaliza textos y conserva edad textual e imagen opcional', async () => {
    consultas.length = 0;
    const respuesta = await enviar('POST', '/mascotas', { ...mascota, nombre: ' Luna ', imagen: null });
    assert.equal(respuesta.status, 201);
    assert.deepEqual(consultas[0].parametros, ['1', 'Luna', 'Mestiza', 'Perro', '3 años', 'saludable', null]);
  });
  await t.test('conserva IDs BIGINT sin perder precisión', async () => {
    consultas.length = 0;
    assert.equal((await enviar('GET', '/citas?mascota_id=9223372036854775807')).status, 200);
    assert.equal(consultas[0].parametros[1], '9223372036854775807');
  });
  await t.test('acepta false y fechas bisiestas en actualizaciones parciales', async () => {
    consultas.length = 0;
    assert.equal((await enviar('PUT', '/recordatorios/1', { completado: false, vence_en: '2028-02-29' })).status, 200);
    assert.equal(consultas[0].parametros[5], false);
    assert.equal(consultas[0].parametros[4], '2028-02-29');
  });
  await t.test('valida la propiedad de la mascota al crear citas', async () => {
    resultados = [{ rowCount: 0, rows: [] }];
    assert.equal((await enviar('POST', '/citas', cita)).status, 400);
    assert.equal((await enviar('POST', '/citas', cita)).status, 201);
  });
  await t.test('devuelve conflicto si el UPDATE no permite reabrir una cita existente', async () => {
    consultas.length = 0;
    resultados = [{ rowCount: 0, rows: [] }, { rowCount: 1, rows: [{ id: '1' }] }];
    assert.equal((await enviar('PUT', '/citas/1', { estado: 'pendiente' })).status, 409);
    assert.match(consultas[0].sql, /AND \(estado NOT IN/);
    resultados = [{ rowCount: 0, rows: [] }, { rowCount: 0, rows: [] }];
    assert.equal((await enviar('PUT', '/citas/1', { estado: 'pendiente' })).status, 404);
  });
  await t.test('normaliza el correo y acepta una contraseña de 72 bytes', async () => {
    consultas.length = 0;
    resultados = [{ rowCount: 0, rows: [] }];
    assert.equal((await enviar('POST', '/auth/registro', {
      ...registro, correo: ' ANA@example.com ', password: 'á'.repeat(36),
    })).status, 201);
    assert.equal(consultas[0].parametros[0], 'ana@example.com');
  });
});
