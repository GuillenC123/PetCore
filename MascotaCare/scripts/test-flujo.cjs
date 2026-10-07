const assert = require('node:assert/strict');
const { crearReact, crearCargador, crearAlmacenamiento } = require('./helpers/react-cargador.cjs');

// Ejecuta servicios, contexto, hook y presentación reales. Solo sustituye
// transporte HTTP, dispositivo y ciclo de hooks, sin necesitar PostgreSQL.
const flush = () => new Promise((resolve) => setImmediate(resolve));
function diferido() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const respuesta = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const destino = { usuarioId: 1, origen: 'api' };
const clave = 'petcore:cache:v1:api:usuario:1';
const vacio = () => ({ mascotas: [], citas: [], recordatorios: [] });
const datos = (nombre = 'Luna') => ({
  mascotas: [{ id: 1, nombre, raza: 'Mestiza', especie: 'Perro', edad: '2 años', estado: 'saludable', imagen: null }],
  citas: [{ id: 2, mascota_id: 1, titulo: 'Control', fecha_hora: '2025-01-01T12:00:00Z', doctor: null, clinica: null, estado: 'programado' }],
  recordatorios: [{ id: 3, mascota_id: 1, titulo: 'Alimento', descripcion: null, tipo: 'alimento', vence_en: '2028-01-01', completado: false }],
});
const consulta = (valor) => async (url) => respuesta(valor[url.split('/').at(-1)]);

function hook(almacenamiento = crearAlmacenamiento()) {
  const hooks = crearReact();
  const cargar = crearCargador(hooks.react, almacenamiento);
  const { useCargaDatos } = cargar('src/hooks/use-carga-datos.ts');
  const entregas = [];
  const aplicar = (valor) => entregas.push(valor);
  const render = () => hooks.render(() => useCargaDatos(aplicar));
  const iniciar = (usuario = 1, demo) => {
    render().iniciarCarga('REAL', usuario, demo);
    return render().cargarDatos();
  };
  return { render, iniciar, entregas, cargar, almacenamiento, unmount: hooks.unmount };
}

async function recuperacionYReintentos() {
  const h = hook();
  const storage = h.cargar('src/services/storage.ts');
  const inicial = await storage.guardarCache(destino, datos('Guardada'));
  const escriturasAntes = h.almacenamiento.llamadas.filter((l) => l.tipo === 'guardar').length;
  const esperarRed = diferido();
  let consultas = 0;
  global.fetch = async () => { consultas++; await esperarRed.promise; throw new TypeError('Failed to fetch'); };
  const carga = h.iniciar();
  assert.equal(h.render().estadoDatos.estado, 'recuperando');
  await flush();
  assert.equal(h.render().estadoDatos.estado, 'cargando');
  assert.equal(h.render().estadoDatos.procedencia, 'cache');
  assert.equal(h.render().estadoDatos.actualizadoEn, inicial.actualizadoEn);
  assert.equal(h.entregas.at(-1).mascotas[0].nombre, 'Guardada');
  assert.equal(h.render().estadoDatos.datosDisponibles, true);
  assert.equal(h.almacenamiento.llamadas.filter((l) => l.tipo === 'guardar').length, escriturasAntes);
  esperarRed.resolve();
  await carga;
  assert.equal(h.render().estadoDatos.estado, 'error');
  assert.equal(h.render().estadoDatos.procedencia, 'cache');
  assert.equal(h.render().estadoDatos.datosDisponibles, true);
  assert.deepEqual((await storage.leerCache(destino)).cache, inicial);

  global.fetch = consulta(datos('Actualizada'));
  const setOriginal = h.almacenamiento.setItem;
  h.almacenamiento.setItem = async () => { throw new Error('Sin espacio'); };
  await h.render().cargarDatos();
  assert.equal(h.entregas.at(-1).mascotas[0].nombre, 'Actualizada');
  assert.equal(h.render().estadoDatos.estado, 'listo');
  assert.equal(h.render().estadoDatos.procedencia, 'api');
  assert.equal(h.render().estadoDatos.error, null);
  assert.match(h.render().estadoDatos.errorCache, /guardar/);
  assert.equal(h.render().estadoDatos.guardandoCache, false);
  h.almacenamiento.setItem = setOriginal;
  global.fetch = async () => { throw new Error('Guardar copia no debe consultar API'); };
  await h.render().reintentarGuardado();
  assert.equal(h.render().estadoDatos.errorCache, null);
  assert.equal((await storage.leerCache(destino)).cache.datos.mascotas[0].nombre, 'Actualizada');
  assert.equal(consultas, 3);
  h.unmount();

  // Nuevo árbol y nuevos módulos, mismo dispositivo: se reutiliza la copia.
  const reinicio = hook(h.almacenamiento);
  const redTrasReinicio = diferido();
  global.fetch = async () => { await redTrasReinicio.promise; throw new TypeError('Failed to fetch'); };
  const restauracion = reinicio.iniciar();
  await flush();
  assert.equal(reinicio.entregas.at(-1).mascotas[0].nombre, 'Actualizada');
  assert.equal(reinicio.render().estadoDatos.procedencia, 'cache');
  redTrasReinicio.resolve();
  await restauracion;
  assert.equal(reinicio.render().estadoDatos.datosDisponibles, true);
  reinicio.unmount();
}

async function vaciosYCopiasInvalidas() {
  const h = hook();
  const storage = h.cargar('src/services/storage.ts');
  await storage.guardarCache(destino, vacio());
  const red = diferido();
  global.fetch = async (url) => { await red.promise; return consulta(datos())(url); };
  const carga = h.iniciar();
  await flush();
  assert.equal(h.render().estadoDatos.datosDisponibles, false, 'No mostrar vacío durante la consulta inicial');
  red.resolve();
  await carga;
  global.fetch = consulta(vacio());
  await h.render().cargarDatos();
  assert.deepEqual(h.entregas.at(-1), vacio());
  assert.deepEqual((await storage.leerCache(destino)).cache.datos, vacio());
  assert.equal(h.render().estadoDatos.datosDisponibles, true);
  h.unmount();

  for (const tipo of ['ausente', 'corrupta', 'incompatible', 'lectura']) {
    const prueba = hook();
    if (tipo === 'corrupta') prueba.almacenamiento.valores.set(clave, '{JSON incompleto');
    if (tipo === 'incompatible') prueba.almacenamiento.valores.set(clave, JSON.stringify({ version: 2 }));
    if (tipo === 'lectura') prueba.almacenamiento.getItem = async () => { throw new Error('Dispositivo falló'); };
    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await prueba.iniciar();
    assert.equal(prueba.render().estadoDatos.estado, 'error');
    assert.equal(prueba.render().estadoDatos.datosDisponibles, false);
    assert.equal(prueba.entregas.length, 0);
    assert.equal(prueba.almacenamiento.llamadas.some((l) => l.tipo === 'guardar'), false);
    assert.equal(Boolean(prueba.render().estadoDatos.errorCache), tipo !== 'ausente');
    global.fetch = consulta(datos());
    await prueba.render().cargarDatos();
    assert.equal(prueba.render().estadoDatos.estado, 'listo');
    assert.equal(prueba.render().estadoDatos.errorCache, null);
    assert.equal(prueba.entregas.at(-1).mascotas[0].nombre, 'Luna');
    prueba.unmount();
  }
}

async function sesionesYOperacionesPendientes() {
  const h = hook();
  const storage = h.cargar('src/services/storage.ts');
  await storage.guardarCache(destino, datos('Usuario uno'));
  const lectura = diferido();
  const getOriginal = h.almacenamiento.getItem;
  h.almacenamiento.getItem = async (key) => {
    if (key === clave) await lectura.promise;
    return getOriginal(key);
  };
  let peticiones = 0;
  global.fetch = async (url) => { peticiones++; return consulta(datos('Usuario dos'))(url); };
  const anterior = h.iniciar();
  await flush();
  await h.iniciar(2);
  lectura.resolve();
  await anterior;
  assert.equal(h.entregas.length, 1);
  assert.equal(h.entregas[0].mascotas[0].nombre, 'Usuario dos');
  assert.equal(peticiones, 3, 'La sesión anterior no debe consultar después de leer');

  // Logout durante una escritura: no resucita datos ni avisos de la sesión.
  const escritura = diferido();
  const setOriginal = h.almacenamiento.setItem;
  h.almacenamiento.setItem = async (key, valor) => { await escritura.promise; return setOriginal(key, valor); };
  const guardado = h.render().reintentarGuardado();
  await flush();
  assert.equal(h.render().estadoDatos.guardandoCache, true);
  h.render().reiniciarCarga();
  h.render();
  escritura.resolve();
  await guardado;
  assert.equal(h.render().estadoDatos.estado, 'inicial');
  assert.equal(h.render().estadoDatos.guardandoCache, false);
  h.unmount();

  // Demo y cuenta real pueden compartir ID, pero nunca la copia.
  const demo = hook();
  await demo.cargar('src/services/storage.ts').guardarCache(destino, datos('Cuenta real'));
  global.fetch = async () => { throw new Error('Demo no consulta endpoints protegidos'); };
  await demo.iniciar(1, datos('Demostración'));
  assert.equal(demo.render().estadoDatos.procedencia, 'demo');
  assert.equal(demo.entregas.at(-1).mascotas[0].nombre, 'Demostración');
  assert.equal(JSON.parse(demo.almacenamiento.valores.get(clave)).datos.mascotas[0].nombre, 'Cuenta real');
  assert.equal(demo.almacenamiento.valores.has('petcore:cache:v1:demo:usuario:1'), true);
  demo.unmount();
}

async function contextoYMutaciones() {
  const hooks = crearReact();
  const almacenamiento = crearAlmacenamiento();
  const cargar = crearCargador(hooks.react, almacenamiento);
  const { AuthProvider } = cargar('src/context/AuthContext.tsx');
  const contexto = () => hooks.render(() => AuthProvider({ children: null })).props.value;
  let remoto = datos();
  let redPendiente = null;
  let fallarPut = false;
  let gets = 0, puts = 0;
  global.fetch = async (url, opciones) => {
    if (url.endsWith('/auth/login')) return respuesta({ usuario: { id: 1, nombre: 'Ana', correo: 'ana@example.com' }, token: 'REAL' });
    if (opciones.method === 'PUT') {
      puts++;
      if (fallarPut) return respuesta({ error: 'No disponible' }, 503);
      return respuesta({ ...datos().recordatorios[0], completado: JSON.parse(opciones.body).completado });
    }
    gets++;
    if (redPendiente) return redPendiente(url);
    return consulta(remoto)(url);
  };
  await contexto().login('ana@example.com', '123456');
  await contexto().cargarDatos();
  assert.equal(contexto().hayCambiosLocales, false);
  const storage = cargar('src/services/storage.ts');

  // Un GET en vuelo anterior al PUT no deshace la confirmación del servidor.
  const liberarGet = diferido();
  redPendiente = async (url) => { await liberarGet.promise; return consulta(datos())(url); };
  const actualizacion = contexto().cargarDatos();
  await flush();
  await contexto().tacharRecordatorio(3, true);
  assert.equal(contexto().recordatorios[0].completado, true);
  assert.equal((await storage.leerCache(destino)).cache.datos.recordatorios[0].completado, true);
  liberarGet.resolve();
  await actualizacion;
  assert.equal(contexto().recordatorios[0].completado, true);
  assert.equal((await storage.leerCache(destino)).cache.datos.recordatorios[0].completado, true);
  assert.equal(contexto().hayCambiosLocales, false);
  redPendiente = null;

  fallarPut = true;
  await assert.rejects(contexto().tacharRecordatorio(3, false), /estado anterior/);
  assert.equal(contexto().recordatorios[0].completado, true);
  fallarPut = false;
  const setOriginal = almacenamiento.setItem;
  almacenamiento.setItem = async () => { throw new Error('Sin espacio'); };
  await contexto().tacharRecordatorio(3, false);
  assert.equal(contexto().recordatorios[0].completado, false, 'PUT confirmado sigue visible aunque falle la copia');
  assert.match(contexto().estadoDatos.errorCache, /guardar/);
  almacenamiento.setItem = setOriginal;
  const solicitudesAntes = { gets, puts };
  await contexto().reintentarGuardado();
  assert.deepEqual({ gets, puts }, solicitudesAntes);
  assert.equal((await storage.leerCache(destino)).cache.datos.recordatorios[0].completado, false);

  // Mutaciones locales durante actualización se conservan solo en memoria.
  const liberarLocales = diferido();
  redPendiente = async (url) => { await liberarLocales.promise; return consulta(datos('Nombre remoto'))(url); };
  const refresco = contexto().cargarDatos();
  await flush();
  contexto().actualizarPesoMascota(1, 8);
  const nueva = contexto().agregarMascota({ ...datos().mascotas[0], nombre: 'Local' });
  contexto().agregarCita({ mascota_id: 1, motivo: 'Consulta local', fecha_hora: '2029-01-01T12:00:00Z' });
  contexto().posponerRecordatorio(3, '2029-01-01T12:00:00Z');
  contexto().completarCita(2);
  contexto().actualizarPerfil({ nombre: 'Perfil local', correo: 'local@example.com' });
  liberarLocales.resolve();
  await refresco;
  assert.equal(contexto().hayCambiosLocales, true);
  assert.equal(contexto().mascotas.find((m) => m.id === 1).peso, 8);
  assert.equal(contexto().mascotas.some((m) => m.id === nueva.id), true);
  assert.equal(contexto().citas.find((c) => c.id === 2).estado, 'completado');
  assert.equal(contexto().recordatorios.find((r) => r.id === 3).vence_en, '2029-01-01T12:00:00.000Z');
  assert.equal(contexto().usuario.nombre, 'Perfil local');
  const copia = (await storage.leerCache(destino)).cache;
  assert.equal(copia.datos.mascotas.length, 1);
  assert.equal(copia.datos.mascotas[0].nombre, 'Nombre remoto');
  assert.equal(copia.datos.mascotas[0].peso, undefined);
  assert.equal(copia.datos.citas.length, 1);
  assert.equal(copia.datos.citas[0].estado, 'programado');
  assert.equal(copia.datos.recordatorios[0].vence_en, '2028-01-01');
  assert.equal(copia.token, undefined);
  assert.equal(copia.usuario, undefined);

  // Incluso ante respuesta vacía, las ediciones locales conservan sus padres.
  redPendiente = null;
  remoto = vacio();
  await contexto().cargarDatos();
  assert.deepEqual((await storage.leerCache(destino)).cache.datos, vacio());
  assert.equal(contexto().mascotas.length, 2);
  assert.equal(contexto().citas.length, 2);
  assert.equal(contexto().recordatorios.length, 2);
  contexto().logout();
  assert.equal(contexto().hayCambiosLocales, false);
  assert.deepEqual(contexto().mascotas, []);
  assert.deepEqual(contexto().citas, []);
  assert.deepEqual(contexto().recordatorios, []);
  assert.equal(almacenamiento.valores.has(clave), true, 'Logout conserva copia para el próximo acceso');
  hooks.unmount();
}

function interfaz() {
  const cargar = crearCargador(crearReact().react);
  const { default: DataLoadState } = cargar('src/components/DataLoadState.tsx');
  const elementos = (nodo) => Array.isArray(nodo) ? nodo.flatMap(elementos)
    : nodo && typeof nodo === 'object' ? [nodo, ...elementos(nodo.props?.children)] : [];
  const textos = (nodo) => Array.isArray(nodo) ? nodo.map(textos).join(' ')
    : nodo && typeof nodo === 'object' ? textos(nodo.props?.children) : typeof nodo === 'string' ? nodo : '';
  let reintentos = 0, guardados = 0;
  const props = {
    estado: { estado: 'error', error: 'Fallo de red', datosDisponibles: true, procedencia: 'cache', actualizadoEn: '2026-09-01T12:00:00Z', errorCache: 'Falló la copia', guardandoCache: false },
    modoDemo: false, hayCambiosLocales: true, children: 'Pantalla',
    reintentar: async () => { reintentos++; }, reintentarGuardado: async () => { guardados++; }, salir: () => {},
  };
  let arbol = DataLoadState(props);
  assert.match(textos(arbol), /Datos guardados en este dispositivo/);
  assert.match(textos(arbol), /2026/);
  assert.match(textos(arbol), /Fallo de red/);
  assert.match(textos(arbol), /ediciones locales/);
  assert.equal(arbol.props.children[1].props.accessibilityElementsHidden, false);
  let botones = elementos(arbol).filter((e) => e.type === 'Pressable');
  botones.find((b) => textos(b) === 'Reintentar').props.onPress();
  botones.find((b) => textos(b) === 'Guardar copia').props.onPress();
  assert.equal(reintentos, 1);
  assert.equal(guardados, 1);
  arbol = DataLoadState({ ...props, estado: { ...props.estado, estado: 'cargando' } });
  assert.match(textos(arbol), /Buscando cambios/);
  botones = elementos(arbol).filter((e) => e.type === 'Pressable');
  assert.ok(botones.every((b) => b.props.disabled));
  arbol = DataLoadState({ ...props, estado: { ...props.estado, estado: 'recuperando', datosDisponibles: false } });
  assert.match(textos(arbol), /Recuperando tus datos/);
  assert.equal(arbol.props.children[1].props.style.display, 'none');
  assert.equal(arbol.props.children[1].props.accessibilityElementsHidden, true);
}

async function main() {
  const fetchOriginal = global.fetch;
  try {
    await recuperacionYReintentos();
    await vaciosYCopiasInvalidas();
    await sesionesYOperacionesPendientes();
    await contextoYMutaciones();
    interfaz();
    console.log('OK: recuperación y reinicio, API/caché/demo, fallos y reintentos, vacío, aislamiento de sesiones, lectura/escritura tardías, PUT frente a GET, ediciones locales y avisos visibles.');
  } finally { global.fetch = fetchOriginal; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
