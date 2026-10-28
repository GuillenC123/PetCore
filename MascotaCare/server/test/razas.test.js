const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { crearCatalogoRazas } = require('../src/services/razas');
const { crearRouterRazas } = require('../src/routes/razas.routes');

const respuesta = (datos) => ({ ok: true, json: async () => datos });
const etiquetas = (...nombres) => ({ results: { bindings: nombres.map((value) => ({ nombre: { type: 'literal', 'xml:lang': 'es', value } })) } });
const perros = etiquetas('golden retriever', 'pastor alemán', 'beagle');

test('usa nombres españoles de la fuente, normaliza iniciales y ordena el catálogo', async () => {
  const catalogo = crearCatalogoRazas({ transporte: async () => respuesta(perros) });
  const datos = await catalogo.obtener('Perro');
  assert.deepEqual(datos.razas, ['Beagle', 'Golden retriever', 'Pastor alemán']);
  assert.equal(datos.fuente, 'Wikidata (español)');
  assert.equal(datos.idioma, 'es');
  assert.equal(datos.desactualizado, false);
  await assert.rejects(catalogo.obtener('Otro'), /Especie/);
});

test('consulta la clase de gatos con filtro exclusivo de español y elimina duplicados', async () => {
  const urls = [];
  const catalogo = crearCatalogoRazas({ transporte: async (url) => {
    urls.push(url);
    return respuesta(etiquetas('persa', 'siamés', 'persa'));
  } });
  assert.deepEqual((await catalogo.obtener('Gato')).razas, ['Persa', 'Siamés']);
  assert.equal(urls.length, 1);
  const url = new URL(urls[0]);
  assert.equal(url.origin, 'https://query.wikidata.org');
  assert.match(url.searchParams.get('query'), /wd:Q43577/);
  assert.match(url.searchParams.get('query'), /LANG\(\?nombre\) = "es"/);
  assert.equal(url.searchParams.get('format'), 'json');
});

test('descarta etiquetas inglesas sin traducir ni inventar nombres', async () => {
  const datos = etiquetas('pastor alemán', 'Maine Coon');
  datos.results.bindings.push({ nombre: { 'xml:lang': 'en', value: 'German Shepherd' } });
  const catalogo = crearCatalogoRazas({ transporte: async () => respuesta(datos) });
  assert.deepEqual((await catalogo.obtener('Perro')).razas, ['Maine Coon', 'Pastor alemán']);
  const soloIngles = crearCatalogoRazas({ transporte: async () => respuesta({ results: { bindings: [
    { nombre: { 'xml:lang': 'en', value: 'German Shepherd' } },
  ] } }) });
  await assert.rejects(soloIngles.obtener('Perro'), /No se pudo/);
});

test('comparte consultas simultáneas y reutiliza caché sin mezclar especies', async () => {
  let llamadas = 0;
  let resolver;
  const catalogo = crearCatalogoRazas({ transporte: async (url) => {
    llamadas++;
    if (new URL(url).searchParams.get('query').includes('Q39367')) { await new Promise((resolve) => { resolver = resolve; }); return respuesta(perros); }
    return respuesta(etiquetas('persa'));
  } });
  const primera = catalogo.obtener('Perro');
  const segunda = catalogo.obtener('Perro');
  resolver();
  assert.deepEqual(await primera, await segunda);
  await catalogo.obtener('Perro');
  assert.equal(llamadas, 1);
  assert.deepEqual((await catalogo.obtener('Gato')).razas, ['Persa']);
  assert.equal(llamadas, 2);
});

test('conserva caché vencida ante fallos y limita reintentos al proveedor', async () => {
  let ahora = 0, llamadas = 0, falla = false;
  const catalogo = crearCatalogoRazas({ ahora: () => ahora, ttl: 1000, transporte: async () => {
    llamadas++;
    if (falla) throw new Error('Sin conexión');
    return respuesta(perros);
  } });
  await catalogo.obtener('Perro');
  ahora = 1001; falla = true;
  const copia = await catalogo.obtener('Perro');
  assert.equal(copia.desactualizado, true);
  assert.deepEqual(copia.razas, ['Beagle', 'Golden retriever', 'Pastor alemán']);
  await catalogo.obtener('Perro');
  assert.equal(llamadas, 2);
  ahora += 60001; falla = false;
  assert.equal((await catalogo.obtener('Perro')).desactualizado, false);
  assert.equal(llamadas, 3);
});

test('rechaza catálogos vacíos, formatos inválidos y fallos HTTP', async () => {
  for (const datos of [etiquetas(), { results: { bindings: null } }, { status: 'error' }]) {
    const catalogo = crearCatalogoRazas({ transporte: async () => respuesta(datos) });
    await assert.rejects(catalogo.obtener('Perro'), /No se pudo/);
  }
  for (const datos of [etiquetas(123), etiquetas('a'.repeat(121)), etiquetas('')]) {
    const catalogo = crearCatalogoRazas({ transporte: async () => respuesta(datos) });
    await assert.rejects(catalogo.obtener('Gato'), /No se pudo/);
  }
  const http = crearCatalogoRazas({ transporte: async () => ({ ok: false }) });
  await assert.rejects(http.obtener('Gato'), /No se pudo/);
});

test('aplica tiempo de espera a consultas externas', async () => {
  const catalogo = crearCatalogoRazas({ espera: 10, transporte: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Tiempo agotado')), { once: true });
  }) });
  const mantenerActivo = setTimeout(() => {}, 1000);
  try { await assert.rejects(catalogo.obtener('Perro'), /No se pudo/); }
  finally { clearTimeout(mantenerActivo); }
});

test('endpoint público: catálogo, validación de especie y caída del proveedor', async (t) => {
  const catalogo = crearCatalogoRazas({ transporte: async (url) => new URL(url).searchParams.get('query').includes('Q39367') ? respuesta(perros) : { ok: false } });
  const app = express();
  app.use('/api/razas', crearRouterRazas(catalogo));
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  t.after(() => new Promise((resolve) => servidor.close(resolve)));
  const url = `http://127.0.0.1:${servidor.address().port}/api/razas`;
  assert.equal((await fetch(url)).status, 400);
  assert.equal((await fetch(`${url}?especie=Otro`)).status, 400);
  assert.equal((await fetch(`${url}?especie=Perro&especie=Gato`)).status, 400);
  const correcto = await fetch(`${url}?especie=Perro`);
  assert.equal(correcto.status, 200);
  assert.equal((await correcto.json()).fuente, 'Wikidata (español)');
  assert.equal((await fetch(`${url}?especie=Gato`)).status, 503);
});
