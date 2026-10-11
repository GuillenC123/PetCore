const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Las rutas cargan la misma configuración que producción, sin depender de .env.
process.env.DATABASE_URL = 'postgres://usuario:password@localhost:5432/mascotacare_test';
process.env.JWT_SECRET = 'secreto-de-prueba-con-al-menos-treinta-y-dos-caracteres';

// La prueba recorre las rutas HTTP reales, sustituyendo únicamente PostgreSQL.
const consultas = [];
let resultados = [];
const consultar = async (sql, parametros) => {
  consultas.push({ sql, parametros });
  if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i.test(sql)) return { rowCount: 0, rows: [] };
  return resultados.shift() || { rowCount: 1, rows: [{ id: '1' }] };
};
const dbPath = require.resolve('../src/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  query: consultar,
  connect: async () => ({ query: consultar, release() {} }),
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
    ['POST', '/mascotas', { ...mascota, peso: -1 }],
    ['POST', '/mascotas', { ...mascota, sexo: 'invalido' }],
    ['POST', '/mascotas', { ...mascota, nacimiento: '31/02/2020' }],
    ['POST', '/mascotas', { ...mascota, alergias: 'a'.repeat(1001) }],
    ['POST', '/mascotas/1/pesos', { peso: null, fecha: '2020-01-01' }],
    ['POST', '/mascotas/1/pesos', { peso: 5, fecha: '2999-01-01' }],
    ['POST', '/mascotas/1/pesos', { peso: 5, fecha: '2020-02-30' }],
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
    assert.deepEqual(consultas[0].parametros, ['1', 'Luna', 'Mestiza', 'Perro', '3 años', 'saludable', null, null, '[]', null, 'desconocido', '', '']);
  });
  await t.test('acepta malestar como estado de mascota', async () => {
    consultas.length = 0;
    const respuesta = await enviar('POST', '/mascotas', { ...mascota, estado: 'malestar' });
    assert.equal(respuesta.status, 201);
    assert.equal(consultas[0].parametros[5], 'malestar');
  });
  await t.test('persiste observaciones clínicas estructuradas sin adjuntos locales', async () => {
    consultas.length = 0;
    const observacion = { id: 1, tipo: 'consulta', titulo: 'Control anual', descripcion: 'Sin hallazgos.', fecha: '2026-01-01T00:00:00.000Z' };
    resultados = [
      { rowCount: 1, rows: [{ datos_salud: { carnet: [], observaciones: [], tratamientos: [] } }] },
      { rowCount: 1, rows: [{ id: '1', datos_salud: { carnet: [], observaciones: [observacion], tratamientos: [] } }] },
    ];
    const respuesta = await enviar('PUT', '/mascotas/1/salud', { observaciones: [observacion] });
    assert.equal(respuesta.status, 200);
    assert.match(consultas[1].sql, /datos_salud = \$3::jsonb/);
    assert.deepEqual(JSON.parse(consultas[1].parametros[2]), { carnet: [], observaciones: [observacion], tratamientos: [] });
  });
  await t.test('conserva IDs BIGINT sin perder precisión', async () => {
    consultas.length = 0;
    assert.equal((await enviar('GET', '/citas?mascota_id=9223372036854775807')).status, 200);
    assert.equal(consultas[0].parametros[1], '9223372036854775807');
  });
  await t.test('acepta false y fechas bisiestas en actualizaciones parciales', async () => {
    consultas.length = 0;
    assert.equal((await enviar('PUT', '/recordatorios/1', { completado: false, vence_en: '2028-02-29T10:30:00Z' })).status, 200);
    assert.equal(consultas[2].parametros[2], '2028-02-29T10:30:00Z');
    assert.equal(consultas[2].parametros[3], false);
  });
  await t.test('crea, repite y elimina recordatorios propios', async () => {
    consultas.length = 0;
    const creado = { id: '20', mascota_id: '1', titulo: 'Medicación', descripcion: null, tipo: 'dosis', vence_en: '2028-02-29T10:30:00.000Z', repeticion: 'diaria', dia_repeticion: 29, completado: false, cita_id: null };
    resultados = [{ rowCount: 1, rows: [{ id: '1' }] }, { rowCount: 1, rows: [creado] }];
    const alta = await enviar('POST', '/recordatorios', { titulo: 'Medicación', mascota_id: '1', tipo: 'dosis', vence_en: '2028-02-29T10:30:00Z', repeticion: 'diaria' });
    assert.equal(alta.status, 201);
    assert.deepEqual(await alta.json(), creado);

    consultas.length = 0;
    const repetido = { ...creado, vence_en: '2028-03-01T10:30:00.000Z', ultima_realizacion: '2028-02-29T12:00:00.000Z' };
    resultados = [{ rowCount: 1, rows: [creado] }, { rowCount: 1, rows: [repetido] }];
    const cambio = await enviar('PUT', '/recordatorios/20', { completado: true });
    assert.equal(cambio.status, 200);
    assert.equal((await cambio.json()).completado, false);
    assert.match(consultas[2].sql, /ultima_realizacion/);

    consultas.length = 0;
    resultados = [{ rowCount: 1, rows: [] }];
    assert.equal((await enviar('DELETE', '/recordatorios/20')).status, 204);
  });
  await t.test('protege la eliminación de recordatorios asociados a citas', async () => {
    consultas.length = 0;
    resultados = [{ rowCount: 0, rows: [] }, { rowCount: 1, rows: [{ cita_id: '10' }] }];
    const respuesta = await enviar('DELETE', '/recordatorios/20');
    assert.equal(respuesta.status, 409);
    assert.match((await respuesta.json()).error, /asociado a una cita/);
  });
  await t.test('valida la propiedad de la mascota al crear citas', async () => {
    resultados = [{ rowCount: 0, rows: [] }];
    assert.equal((await enviar('POST', '/citas', cita)).status, 400);
    assert.equal((await enviar('POST', '/citas', cita)).status, 201);
  });
  await t.test('crea de forma atómica cita, recordatorio y estado malestar', async () => {
    consultas.length = 0;
    const citaCreada = { id: '10', ...cita, estado: 'programado', doctor: null, clinica: null };
    const recordatorioCreado = { id: '11', mascota_id: '1', cita_id: '10', titulo: 'Visita veterinaria', descripcion: 'Control', tipo: 'cita', vence_en: '2026-09-06', completado: false };
    const mascotaActualizada = { id: '1', nombre: 'Luna', raza: 'Mestiza', especie: 'Perro', edad: '3 años', estado: 'malestar', imagen: null };
    resultados = [
      { rowCount: 1, rows: [{ id: '1', nombre: 'Luna' }] },
      { rowCount: 1, rows: [citaCreada] },
      { rowCount: 1, rows: [recordatorioCreado] },
      { rowCount: 1, rows: [mascotaActualizada] },
    ];
    const respuesta = await enviar('POST', '/citas', { ...cita, estado: 'programado' });
    assert.equal(respuesta.status, 201);
    assert.deepEqual(await respuesta.json(), {
      cita: citaCreada, recordatorio: recordatorioCreado, mascota: mascotaActualizada,
    });
    assert.match(consultas[0].sql, /^BEGIN$/);
    assert.match(consultas[1].sql, /FOR UPDATE/);
    assert.match(consultas[3].sql, /INSERT INTO Recordatorio/);
    assert.match(consultas[4].sql, /estado = 'malestar'/);
    assert.match(consultas[5].sql, /^COMMIT$/);
  });
  await t.test('completa de forma atómica una cita pasada y su recordatorio', async () => {
    consultas.length = 0;
    const citaCompletada = { id: '10', mascota_id: '1', titulo: 'Control', fecha_hora: '2020-01-01T12:00:00.000Z', doctor: null, clinica: null, estado: 'completado' };
    const recordatorioCompletado = { id: '11', mascota_id: '1', cita_id: '10', titulo: 'Visita veterinaria', descripcion: 'Control', tipo: 'cita', vence_en: '2020-01-01T12:00:00.000Z', repeticion: 'ninguna', completado: true };
    resultados = [
      { rowCount: 1, rows: [{ id: '10', fecha_hora: citaCompletada.fecha_hora, estado: 'programado' }] },
      { rowCount: 1, rows: [citaCompletada] },
      { rowCount: 1, rows: [recordatorioCompletado] },
    ];
    const respuesta = await enviar('POST', '/citas/10/completar', {});
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), { cita: citaCompletada, recordatorio: recordatorioCompletado });
    assert.match(consultas[0].sql, /^BEGIN$/);
    assert.match(consultas[1].sql, /FOR UPDATE/);
    assert.match(consultas[2].sql, /UPDATE CitaMedica SET estado = 'completado'/);
    assert.match(consultas[3].sql, /UPDATE Recordatorio SET completado = true/);
    assert.match(consultas[4].sql, /^COMMIT$/);
  });
  await t.test('no completa una cita futura', async () => {
    consultas.length = 0;
    resultados = [{ rowCount: 1, rows: [{ id: '10', fecha_hora: '2999-01-01T12:00:00.000Z', estado: 'programado' }] }];
    const respuesta = await enviar('POST', '/citas/10/completar', {});
    assert.equal(respuesta.status, 409);
    assert.match((await respuesta.json()).error, /aún no puede/);
    assert.match(consultas[2].sql, /^ROLLBACK$/);
  });
  await t.test('sincroniza al reprogramar una cita y su recordatorio', async () => {
    consultas.length = 0;
    const citaActualizada = { id: '10', mascota_id: '1', titulo: 'Control actualizado', fecha_hora: '2028-02-29T10:30:00.000Z', doctor: null, clinica: null, estado: 'programado' };
    const recordatorioActualizado = { id: '11', mascota_id: '1', cita_id: '10', titulo: 'Visita veterinaria', descripcion: 'Control actualizado', tipo: 'cita', vence_en: '2028-02-29T10:30:00.000Z', repeticion: 'ninguna', completado: false };
    resultados = [
      { rowCount: 1, rows: [{ id: '10', estado: 'programado' }] },
      { rowCount: 1, rows: [citaActualizada] },
      { rowCount: 1, rows: [recordatorioActualizado] },
    ];
    const respuesta = await enviar('PUT', '/citas/10', { titulo: 'Control actualizado', fecha_hora: '2028-02-29T10:30:00Z' });
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), { ...citaActualizada, recordatorio: recordatorioActualizado });
    assert.match(consultas[1].sql, /FOR UPDATE/);
    assert.match(consultas[3].sql, /UPDATE Recordatorio SET/);
    assert.match(consultas[4].sql, /^COMMIT$/);
  });
  await t.test('cancela una cita y completa su recordatorio asociado', async () => {
    consultas.length = 0;
    const citaCancelada = { id: '10', mascota_id: '1', titulo: 'Control', fecha_hora: '2028-02-29T10:30:00.000Z', doctor: null, clinica: null, estado: 'cancelado' };
    const recordatorioCancelado = { id: '11', mascota_id: '1', cita_id: '10', titulo: 'Visita veterinaria', descripcion: 'Control', tipo: 'cita', vence_en: '2028-02-29T10:30:00.000Z', repeticion: 'ninguna', completado: true };
    resultados = [
      { rowCount: 1, rows: [{ id: '10', estado: 'programado' }] },
      { rowCount: 1, rows: [citaCancelada] },
      { rowCount: 1, rows: [recordatorioCancelado] },
    ];
    const respuesta = await enviar('PUT', '/citas/10', { estado: 'cancelado' });
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), { ...citaCancelada, recordatorio: recordatorioCancelado });
    assert.equal(consultas[3].parametros[4], true);
  });
  await t.test('devuelve conflicto si el UPDATE intenta reabrir una cita existente', async () => {
    consultas.length = 0;
    resultados = [{ rowCount: 1, rows: [{ id: '1', estado: 'completado' }] }];
    assert.equal((await enviar('PUT', '/citas/1', { estado: 'pendiente' })).status, 409);
    assert.match(consultas[1].sql, /FOR UPDATE/);
    resultados = [{ rowCount: 0, rows: [] }];
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
