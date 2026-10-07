const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function cargarStorage(almacen) {
  const modulos = new Map();
  function cargar(archivo) {
    const absoluto = path.resolve(__dirname, '..', archivo);
    if (modulos.has(absoluto)) return modulos.get(absoluto).exports;
    const modulo = { exports: {} };
    modulos.set(absoluto, modulo);
    const js = ts.transpileModule(fs.readFileSync(absoluto, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const resolver = (nombre) => {
      if (nombre === '@react-native-async-storage/async-storage') return { __esModule: true, default: almacen };
      if (nombre.startsWith('@/')) return cargar(`src/${nombre.slice(2)}.ts`);
      if (nombre.startsWith('.')) return cargar(path.resolve(path.dirname(absoluto), nombre + '.ts'));
      return require(nombre);
    };
    new Function('require', 'module', 'exports', js)(resolver, modulo, modulo.exports);
    return modulo.exports;
  }
  return cargar('src/services/storage.ts');
}

function memoria() {
  const valores = new Map();
  const llamadas = [];
  return {
    valores, llamadas,
    getItem: async (clave) => { llamadas.push(['leer', clave]); return valores.get(clave) ?? null; },
    setItem: async (clave, valor) => { llamadas.push(['guardar', clave]); valores.set(clave, valor); },
    removeItem: async (clave) => { llamadas.push(['eliminar', clave]); valores.delete(clave); },
    clear: () => { throw new Error('No se debe borrar todo el almacenamiento.'); },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
function diferido() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

const usuario = { usuarioId: 1, origen: 'api' };
const otroUsuario = { usuarioId: 2, origen: 'api' };
const demo = { usuarioId: 1, origen: 'demo' };
const clave = (destino) => `petcore:cache:v1:${destino.origen}:usuario:${destino.usuarioId}`;
const GRANDE = '9223372036854775807';
function datos(nombre = 'Luna', id = '7') {
  return {
    mascotas: [{ id, nombre, raza: 'Mestiza', especie: 'Perro', edad: '2 años', imagen: null, estado: 'saludable' }],
    citas: [{ id: '8', mascota_id: id, titulo: 'Visita', fecha_hora: '2028-02-29T15:30:00-05:00', doctor: null, clinica: 'Veterinaria', estado: 'programado', mascota_nombre: nombre }],
    recordatorios: [{ id: '9', mascota_id: id, titulo: 'Aviso', descripcion: null, tipo: 'cita', vence_en: '2028-02-29', completado: false, cita_id: '8', repeticion: 'semanal', dia_repeticion: 29 }],
  };
}

async function main() {
  const almacen = memoria();
  let storage = cargarStorage(almacen);
  assert.equal(storage.VERSION_CACHE, 1);
  assert.deepEqual(await storage.leerCache(usuario), { estado: 'ausente' });
  const entrada = datos();
  entrada.token = 'no-guardar-token';
  entrada.password = 'no-guardar-password';
  entrada.mascotas[0].token = 'no-guardar-token';
  entrada.mascotas[0].peso = 10;
  const guardada = await storage.guardarCache(usuario, entrada);
  assert.equal(guardada.version, 1);
  assert.equal(guardada.usuarioId, '1');
  assert.equal(guardada.datos.mascotas[0].id, 7);
  assert.equal(guardada.datos.recordatorios[0].cita_id, 8);
  assert.equal(guardada.datos.recordatorios[0].repeticion, 'semanal');
  assert.ok(Number.isFinite(Date.parse(guardada.actualizadoEn)));
  const serializada = almacen.valores.get(clave(usuario));
  assert.ok(!serializada.includes('no-guardar'));
  assert.ok(!Object.hasOwn(guardada.datos.mascotas[0], 'peso'));
  assert.deepEqual(await storage.leerCache({ usuarioId: '1', origen: 'api' }), { estado: 'disponible', cache: guardada });

  // Una instancia nueva no depende de datos guardados en memoria por el servicio.
  storage = cargarStorage(almacen);
  assert.deepEqual((await storage.leerCache(usuario)).cache, guardada);
  await storage.guardarCache(otroUsuario, datos('Milo'));
  await storage.guardarCache(demo, datos('Demo'));
  assert.equal((await storage.leerCache(usuario)).cache.datos.mascotas[0].nombre, 'Luna');
  assert.equal((await storage.leerCache(otroUsuario)).cache.datos.mascotas[0].nombre, 'Milo');
  assert.equal((await storage.leerCache(demo)).cache.datos.mascotas[0].nombre, 'Demo');
  await storage.eliminarCache(usuario);
  assert.equal((await storage.leerCache(usuario)).estado, 'ausente');
  assert.equal((await storage.leerCache(otroUsuario)).estado, 'disponible');
  assert.equal((await storage.leerCache(demo)).estado, 'disponible');
  const destinoGrande = { usuarioId: GRANDE, origen: 'api' };
  await storage.guardarCache(destinoGrande, datos('BIGINT', GRANDE));
  assert.equal((await storage.leerCache(destinoGrande)).cache.datos.citas[0].mascota_id, GRANDE);
  assert.equal((await storage.leerCache(destinoGrande)).cache.usuarioId, GRANDE);

  // Datos corruptos o de otra versión se distinguen y se conservan hasta borrar explícitamente.
  await storage.guardarCache(usuario, datos());
  const original = almacen.valores.get(clave(usuario));
  const corruptas = [
    '{ JSON roto', 'null', '[]',
    JSON.stringify({ ...guardada, version: '1' }),
    JSON.stringify({ ...guardada, usuarioId: '2' }),
    JSON.stringify({ ...guardada, origen: 'demo' }),
    JSON.stringify({ ...guardada, actualizadoEn: '2026-02-30T00:00:00Z' }),
  ];
  for (const contenido of corruptas) {
    almacen.valores.set(clave(usuario), contenido);
    assert.equal((await storage.leerCache(usuario)).estado, 'corrupta');
    assert.equal(almacen.valores.get(clave(usuario)), contenido);
  }
  almacen.valores.set(clave(usuario), JSON.stringify({ version: 2 }));
  assert.deepEqual(await storage.leerCache(usuario), { estado: 'incompatible', version: 2 });
  almacen.valores.set(clave(usuario), original);

  const invalidas = [
    (d) => { d.mascotas = {}; },
    (d) => { d.mascotas[0].id = Number(GRANDE); },
    (d) => { d.mascotas.push({ ...d.mascotas[0], id: 7 }); },
    (d) => { d.mascotas[0].estado = 'desconocido'; },
    (d) => { d.mascotas[0].imagen = 1; },
    (d) => { d.citas[0].fecha_hora = '2027-02-29T10:00:00Z'; },
    (d) => { d.citas[0].doctor = []; },
    (d) => { d.citas[0].mascota_id = 999; },
    (d) => { d.recordatorios[0].completado = 'false'; },
    (d) => { d.recordatorios[0].tipo = 'otro'; },
    (d) => { d.recordatorios[0].vence_en = '2028-02-30'; },
    (d) => { d.recordatorios[0].repeticion = 'cada hora'; },
    (d) => { d.recordatorios[0].dia_repeticion = 32; },
    (d) => { d.recordatorios[0].cita_id = 999; },
  ];
  for (const invalidar of invalidas) {
    const valor = datos();
    invalidar(valor);
    await assert.rejects(storage.guardarCache(usuario, valor), (error) => error instanceof storage.ErrorStorage && error.tipo === 'datos');
    assert.equal(almacen.valores.get(clave(usuario)), original);
    almacen.valores.set(clave(usuario), JSON.stringify({ ...guardada, datos: valor }));
    assert.equal((await storage.leerCache(usuario)).estado, 'corrupta');
    almacen.valores.set(clave(usuario), original);
  }
  const llamadasAntes = almacen.llamadas.length;
  for (const destino of [{ usuarioId: 0, origen: 'api' }, { usuarioId: -1, origen: 'api' }, { usuarioId: Number(GRANDE), origen: 'api' }, { usuarioId: 1, origen: 'otro' }]) {
    await assert.rejects(storage.leerCache(destino), (e) => e.tipo === 'destino');
    await assert.rejects(storage.guardarCache(destino, datos()), (e) => e.tipo === 'destino');
    await assert.rejects(storage.eliminarCache(destino), (e) => e.tipo === 'destino');
  }
  assert.equal(almacen.llamadas.length, llamadasAntes);
  const generales = { mascotas: [], citas: [], recordatorios: [{ id: 1, mascota_id: null, titulo: 'General', descripcion: '', tipo: 'general', vence_en: null, completado: true }] };
  await storage.guardarCache(usuario, generales);
  assert.deepEqual((await storage.leerCache(usuario)).cache.datos, generales);
  await storage.guardarCache(usuario, { mascotas: [], citas: [], recordatorios: [] });
  assert.deepEqual((await storage.leerCache(usuario)).cache.datos, { mascotas: [], citas: [], recordatorios: [] });

  // Fallos de lectura, escritura y borrado mantienen datos previos y no bloquean la cola.
  const fallos = memoria();
  const originales = { getItem: fallos.getItem, setItem: fallos.setItem, removeItem: fallos.removeItem };
  const storageFallos = cargarStorage(fallos);
  await storageFallos.guardarCache(usuario, datos('Anterior'));
  fallos.getItem = async () => { throw new Error('Fallo del dispositivo'); };
  const falloLectura = await storageFallos.leerCache(usuario);
  assert.equal(falloLectura.estado, 'error');
  assert.equal(falloLectura.error.tipo, 'lectura');
  fallos.getItem = originales.getItem;
  fallos.setItem = async () => { throw new Error('Cuota agotada'); };
  await assert.rejects(storageFallos.guardarCache(usuario, datos('Fallida')), (e) => e.tipo === 'escritura');
  fallos.setItem = originales.setItem;
  assert.equal((await storageFallos.leerCache(usuario)).cache.datos.mascotas[0].nombre, 'Anterior');
  fallos.removeItem = async () => { throw new Error('Borrado fallido'); };
  await assert.rejects(storageFallos.eliminarCache(usuario), (e) => e.tipo === 'eliminacion');
  fallos.removeItem = originales.removeItem;
  await storageFallos.guardarCache(usuario, datos('Reintento'));
  assert.equal((await storageFallos.leerCache(usuario)).cache.datos.mascotas[0].nombre, 'Reintento');

  // Captura al solicitar, orden de escrituras y lectura detrás de escrituras pendientes.
  const concurrente = memoria();
  const setOriginal = concurrente.setItem;
  const espera = diferido();
  let escriturasUsuario = 0;
  concurrente.setItem = async (key, valor) => {
    if (key === clave(usuario)) {
      escriturasUsuario++;
      if (escriturasUsuario === 1) await espera.promise;
    }
    return setOriginal(key, valor);
  };
  const cola = cargarStorage(concurrente);
  const primera = cola.guardarCache(usuario, datos('Primera'));
  const entradaSegunda = datos('Segunda');
  const segunda = cola.guardarCache(usuario, entradaSegunda);
  const lectura = cola.leerCache(usuario);
  entradaSegunda.mascotas[0].nombre = 'Mutada después de solicitar';
  let otroTermino = false;
  const otra = cola.guardarCache(otroUsuario, datos('Independiente')).then(() => { otroTermino = true; });
  await flush();
  assert.equal(escriturasUsuario, 1);
  assert.equal(otroTermino, true);
  espera.resolve();
  await Promise.all([primera, segunda, otra]);
  assert.equal((await lectura).cache.datos.mascotas[0].nombre, 'Segunda');
  const destinoMutable = { ...usuario };
  const leerDestino = cola.leerCache(destinoMutable);
  destinoMutable.origen = 'demo';
  assert.equal((await leerDestino).estado, 'disponible');

  // Borrar después de guardar no permite que esa escritura resucite la caché.
  const borrado = memoria();
  const esperaBorrado = diferido();
  const guardarAntes = borrado.setItem;
  borrado.setItem = async (key, valor) => { await esperaBorrado.promise; return guardarAntes(key, valor); };
  const colaBorrado = cargarStorage(borrado);
  const escritura = colaBorrado.guardarCache(usuario, datos());
  const eliminacion = colaBorrado.eliminarCache(usuario);
  const leerEliminada = colaBorrado.leerCache(usuario);
  await flush();
  assert.equal(borrado.llamadas.length, 0);
  esperaBorrado.resolve();
  await Promise.all([escritura, eliminacion]);
  assert.equal((await leerEliminada).estado, 'ausente');
  assert.deepEqual(borrado.llamadas.map(([operacion]) => operacion), ['guardar', 'eliminar', 'leer']);

  // Una escritura fallida no impide que la siguiente, ya en cola, se guarde.
  const recuperable = memoria();
  const setRecuperable = recuperable.setItem;
  let intentos = 0;
  recuperable.setItem = async (key, valor) => {
    if (++intentos === 1) throw new Error('Primer intento fallido');
    return setRecuperable(key, valor);
  };
  const colaRecuperable = cargarStorage(recuperable);
  const resultados = await Promise.allSettled([
    colaRecuperable.guardarCache(usuario, datos('Fallida')),
    colaRecuperable.guardarCache(usuario, datos('Última')),
  ]);
  assert.deepEqual(resultados.map((r) => r.status), ['rejected', 'fulfilled']);
  assert.equal((await colaRecuperable.leerCache(usuario)).cache.datos.mascotas[0].nombre, 'Última');

  // Usa la implementación web real de AsyncStorage con un localStorage de prueba.
  const windowOriginal = global.window;
  const local = new Map();
  try {
    global.window = { localStorage: {
      getItem: (key) => local.get(key) ?? null,
      setItem: (key, valor) => local.set(key, String(valor)),
      removeItem: (key) => local.delete(key),
    } };
    const asyncStorage = require('@react-native-async-storage/async-storage').default;
    const web = cargarStorage(asyncStorage);
    await web.guardarCache(usuario, datos('Web'));
    assert.equal((await cargarStorage(asyncStorage).leerCache(usuario)).cache.datos.mascotas[0].nombre, 'Web');
    await web.eliminarCache(usuario);
    assert.equal((await web.leerCache(usuario)).estado, 'ausente');
  } finally {
    if (windowOriginal === undefined) delete global.window;
    else global.window = windowOriginal;
  }
  console.log('OK: AsyncStorage web, recuperación, usuarios/demo, BIGINT, validación, corrupción/versiones, errores, instantáneas, escrituras en orden y borrado por clave.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
