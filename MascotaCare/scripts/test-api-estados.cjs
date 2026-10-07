const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Simula únicamente React Native y el ciclo de hooks. Servicio HTTP, adaptación
// de IDs, hook de carga y contexto se ejecutan desde sus archivos reales.
const native = {
  Platform: { select: (opciones) => opciones.default },
  StyleSheet: { create: (estilos) => estilos },
  View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
};

function crearReact() {
  const slots = [];
  let indice = 0;
  const iguales = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(inicial) {
      const posicion = indice++;
      if (!slots[posicion]) {
        const slot = { valor: typeof inicial === 'function' ? inicial() : inicial };
        slot.set = (valor) => { slot.valor = typeof valor === 'function' ? valor(slot.valor) : valor; };
        slots[posicion] = slot;
      }
      return [slots[posicion].valor, slots[posicion].set];
    },
    useRef(inicial) {
      const posicion = indice++;
      return slots[posicion] ?? (slots[posicion] = { current: inicial });
    },
    useCallback(fn, deps) {
      const posicion = indice++;
      if (!iguales(slots[posicion]?.deps, deps)) slots[posicion] = { deps, fn };
      return slots[posicion].fn;
    },
    useEffect(fn, deps) {
      const posicion = indice++;
      if (!iguales(slots[posicion]?.deps, deps)) {
        slots[posicion]?.cleanup?.();
        slots[posicion] = { deps, cleanup: fn() };
      }
    },
  };
  return {
    react,
    render: (fn) => { indice = 0; return fn(); },
    unmount: () => slots.forEach((slot) => slot.cleanup?.()),
  };
}

function crearCargador(react) {
  const cache = new Map();
  function cargar(archivo) {
    const absoluto = path.resolve(__dirname, '..', archivo);
    if (cache.has(absoluto)) return cache.get(absoluto).exports;
    const modulo = { exports: {} };
    cache.set(absoluto, modulo);
    const js = ts.transpileModule(fs.readFileSync(absoluto, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const resolver = (nombre) => {
      if (nombre === 'react') return react;
      if (nombre === 'react-native') return native;
      if (nombre.endsWith('.css')) return {};
      if (nombre.startsWith('@/') || nombre.startsWith('.')) {
        const base = nombre.startsWith('@/') ? path.resolve(__dirname, '..', 'src', nombre.slice(2)) : path.resolve(path.dirname(absoluto), nombre);
        return cargar(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
      }
      return require(nombre);
    };
    new Function('require', 'module', 'exports', js)(resolver, modulo, modulo.exports);
    return modulo.exports;
  }
  return cargar;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
function diferido() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const GRANDE = '9223372036854775807';
function datos(token = 'A') {
  const id = token === 'B' ? '12' : GRANDE;
  return {
    mascotas: [{ id, nombre: token, raza: 'Mestiza', especie: 'Perro', edad: '2 años', estado: 'saludable', imagen: null }],
    citas: [{ id: '6', mascota_id: id, titulo: 'Visita', fecha_hora: '2028-01-01T12:00:00Z', doctor: null, clinica: null, estado: 'programado' }],
    recordatorios: [{ id: '7', mascota_id: id, titulo: 'Alimento', descripcion: null, tipo: 'alimento', vence_en: '2028-01-01', completado: false }],
  };
}
const respuesta = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

async function main() {
  const fetchOriginal = global.fetch;
  const envOriginal = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = ' http://petcore.test:4000/api/// ';
  try {
    let load = crearCargador(crearReact().react);
    let api = load('src/services/api.ts');
    assert.equal(api.API_URL, 'http://petcore.test:4000/api');
    const pet = load('src/utils/identificadores.ts');
    assert.equal(pet.normalizarIdentificador('12'), 12);
    assert.equal(pet.normalizarIdentificador(GRANDE), GRANDE);
    assert.throws(() => pet.normalizarIdentificador(Number(GRANDE)));
    assert.throws(() => pet.normalizarIdentificador('9223372036854775808'));

    const solicitudes = [];
    let modo = 'ok';
    global.fetch = async (url, opciones) => {
      const recurso = url.split('/').at(-1);
      solicitudes.push({ recurso, token: opciones.headers.Authorization });
      if (modo === 'error' && recurso === 'recordatorios') return respuesta({ error: 'Consulta temporalmente fallida.' }, 503);
      return respuesta(modo === 'vacio' ? [] : datos()[recurso]);
    };
    const obtenidos = await api.apiGetDatos('A');
    assert.equal(obtenidos.mascotas[0].id, GRANDE);
    assert.equal(obtenidos.citas[0].mascota_id, GRANDE);
    assert.equal(obtenidos.recordatorios[0].id, 7);
    assert.equal(pet.buscarPorId(obtenidos.mascotas, GRANDE), obtenidos.mascotas[0]);
    assert.ok(solicitudes.every((s) => s.token === 'Bearer A'));
    assert.deepEqual(solicitudes.map((s) => s.recurso).sort(), ['citas', 'mascotas', 'recordatorios']);

    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(api.apiGetMascotas('A'), (e) => e.tipo === 'red' && api.esErrorDeRed(e));
    global.fetch = async () => respuesta({ error: 'No autorizado.' }, 401);
    await assert.rejects(api.apiLogin('ana.garcia@email.com', '123456'), (e) => e.tipo === 'http' && e.status === 401 && !api.esErrorDeRed(e));
    global.fetch = async () => new Response('JSON roto');
    await assert.rejects(api.apiGetMascotas('A'), (e) => e.tipo === 'respuesta');
    global.fetch = async () => respuesta({ lista: [] });
    await assert.rejects(api.apiGetMascotas('A'), (e) => e.tipo === 'respuesta');
    global.fetch = async () => respuesta([{ ...datos().mascotas[0], id: Number(GRANDE) }]);
    await assert.rejects(api.apiGetMascotas('A'), (e) => e.tipo === 'respuesta');
    global.fetch = async (_url, opciones) => {
      if (opciones.signal.aborted) throw new DOMException('Cancelada', 'AbortError');
      return new Promise((_resolve, reject) => opciones.signal.addEventListener('abort', () => reject(new DOMException('Cancelada', 'AbortError'))));
    };
    const cancelado = new AbortController();
    cancelado.abort();
    await assert.rejects(api.apiGetMascotas('A', cancelado.signal), (e) => e.tipo === 'cancelada');
    const timeoutOriginal = global.setTimeout;
    try {
      global.setTimeout = (fn) => timeoutOriginal(fn, 0);
      await assert.rejects(api.apiGetMascotas('A'), (e) => e.tipo === 'tiempo' && !api.esErrorDeRed(e));
    } finally { global.setTimeout = timeoutOriginal; }

    // El hook entrega todas las listas juntas, deduplica y permite reintentar.
    const hooks = crearReact();
    load = crearCargador(hooks.react);
    const { useCargaDatos } = load('src/hooks/use-carga-datos.ts');
    const entregas = [];
    const aplicar = (valor) => entregas.push(valor);
    const renderHook = () => hooks.render(() => useCargaDatos(aplicar));
    const fixture = async (url, opciones) => {
      const recurso = url.split('/').at(-1);
      if (modo === 'error' && recurso === 'recordatorios') return respuesta({ error: 'Consulta temporalmente fallida.' }, 503);
      return respuesta(modo === 'vacio' ? [] : datos(opciones.headers.Authorization.slice(7))[recurso]);
    };
    global.fetch = fixture;
    modo = 'error';
    const inicio = renderHook().iniciarCarga('A');
    assert.equal(renderHook().estadoDatos.estado, 'cargando');
    assert.equal(renderHook().estadoDatos.datosDisponibles, false);
    await inicio;
    assert.equal(renderHook().estadoDatos.estado, 'error');
    assert.match(renderHook().estadoDatos.error, /temporalmente/);
    assert.equal(entregas.length, 0);
    modo = 'ok';
    const reintento = renderHook().cargarDatos();
    assert.equal(renderHook().cargarDatos(), reintento);
    await reintento;
    assert.equal(entregas.length, 1);
    assert.equal(renderHook().estadoDatos.estado, 'listo');
    modo = 'error';
    await renderHook().cargarDatos();
    assert.equal(renderHook().estadoDatos.datosDisponibles, true);
    assert.equal(entregas.length, 1);
    modo = 'vacio';
    await renderHook().cargarDatos();
    assert.deepEqual(entregas.at(-1), { mascotas: [], citas: [], recordatorios: [] });
    assert.equal(renderHook().estadoDatos.estado, 'listo');

    // El servidor simulado ignora abort para probar también la invalidación lógica.
    const atrasadas = [];
    modo = 'ok';
    global.fetch = (url, opciones) => {
      if (opciones.headers.Authorization === 'Bearer A') {
        const espera = diferido();
        atrasadas.push(() => espera.resolve(respuesta(datos('A')[url.split('/').at(-1)])));
        return espera.promise;
      }
      return fixture(url, opciones);
    };
    const anterior = renderHook().iniciarCarga('A');
    await flush();
    await renderHook().iniciarCarga('B');
    const entregasAntes = entregas.length;
    atrasadas.splice(0).forEach((resolver) => resolver());
    await anterior;
    assert.equal(entregas.length, entregasAntes);
    assert.equal(entregas.at(-1).mascotas[0].id, 12);
    const trasLogout = renderHook().iniciarCarga('A');
    await flush();
    renderHook().reiniciarCarga();
    atrasadas.splice(0).forEach((resolver) => resolver());
    await trasLogout;
    assert.equal(entregas.length, entregasAntes);
    assert.equal(renderHook().estadoDatos.estado, 'inicial');
    const trasUnmount = renderHook().iniciarCarga('A');
    await flush();
    hooks.unmount();
    atrasadas.splice(0).forEach((resolver) => resolver());
    await trasUnmount;
    assert.equal(entregas.length, entregasAntes);

    // Integración de autenticación real con consulta fallida: no entra en demo.
    let autenticacion = 'ok';
    let autenticarTarde;
    const solicitudesContexto = [];
    global.fetch = async (url, opciones) => {
      solicitudesContexto.push(url);
      if (url.endsWith('/auth/login') || url.endsWith('/auth/registro')) {
        if (autenticacion === 'red') throw new TypeError('Failed to fetch');
        if (autenticacion === 'http') return respuesta({ error: 'Credenciales incorrectas.' }, 401);
        if (autenticacion === 'tardia') return autenticarTarde.promise;
        return respuesta({ usuario: { id: '3', nombre: 'Usuario real', correo: 'real@email.com' }, token: 'REAL' });
      }
      return respuesta({ error: 'Datos no disponibles.' }, 503);
    };
    const provider = crearReact();
    load = crearCargador(provider.react);
    const { AuthProvider } = load('src/context/AuthContext.tsx');
    const contexto = () => provider.render(() => AuthProvider({ children: null })).props.value;
    await contexto().login('ana.garcia@email.com', '123456');
    await flush();
    assert.equal(contexto().usuario.nombre, 'Usuario real');
    assert.equal(contexto().modoDemo, false);
    assert.equal(contexto().estadoDatos.estado, 'error');
    assert.deepEqual(contexto().mascotas, []);
    assert.equal(solicitudesContexto.filter((url) => url.endsWith('/auth/login')).length, 1);
    assert.equal(solicitudesContexto.length, 4);
    await contexto().registro('Usuario real', 'real@email.com', '123456');
    await flush();
    assert.equal(contexto().usuario.nombre, 'Usuario real');
    assert.equal(contexto().estadoDatos.estado, 'error');
    contexto().logout();
    autenticacion = 'http';
    await assert.rejects(contexto().login('ana.garcia@email.com', '123456'), /Credenciales/);
    assert.equal(contexto().usuario, null);
    autenticacion = 'red';
    await assert.rejects(contexto().login('otra@email.com', '123456'), /servidor/);
    assert.equal(contexto().usuario, null);
    await contexto().login('ana.garcia@email.com', '123456');
    assert.equal(contexto().modoDemo, true);
    assert.equal(contexto().estadoDatos.estado, 'listo');
    assert.equal(contexto().mascotas[0].nombre, 'Luna');
    contexto().logout();
    autenticacion = 'tardia';
    autenticarTarde = diferido();
    const loginTardio = contexto().login('real@email.com', '123456');
    contexto().logout();
    autenticarTarde.resolve(respuesta({ usuario: { id: '3', nombre: 'Anterior', correo: 'real@email.com' }, token: 'ANTERIOR' }));
    await loginTardio;
    assert.equal(contexto().usuario, null);
    provider.unmount();

    // La interfaz conserva el navegador montado, oculto y fuera de accesibilidad durante la carga.
    const { default: DataLoadState } = load('src/components/DataLoadState.tsx');
    const props = { estado: { estado: 'cargando', error: null, datosDisponibles: false }, modoDemo: false, reintentar: async () => {}, salir: () => {}, children: 'contenido' };
    let arbol = DataLoadState(props);
    assert.equal(arbol.props.children[1].props.style.display, 'none');
    assert.equal(arbol.props.children[1].props.accessibilityElementsHidden, true);
    arbol = DataLoadState({ ...props, estado: { estado: 'listo', error: null, datosDisponibles: true } });
    assert.equal(arbol.props.children[1].props.accessibilityElementsHidden, false);
    arbol = DataLoadState({ ...props, activo: false });
    assert.equal(arbol.props.children[1].props.accessibilityElementsHidden, false);

    // También comprueba fetch y JSON sobre HTTP real con un servidor local de prueba.
    const http = require('node:http');
    const peticionesHttp = [];
    const server = http.createServer((req, res) => {
      peticionesHttp.push({ url: req.url, autorizacion: req.headers.authorization });
      const recurso = req.url.split('/').at(-1);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Connection', 'close');
      res.end(JSON.stringify(recurso === 'login'
        ? { usuario: { id: '3', nombre: 'HTTP', correo: 'http@email.com' }, token: 'HTTP' }
        : datos()[recurso]));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      global.fetch = fetchOriginal;
      process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${server.address().port}/api`;
      const apiHttp = crearCargador(crearReact().react)('src/services/api.ts');
      const sesionHttp = await apiHttp.apiLogin('http@email.com', '123456');
      const datosHttp = await apiHttp.apiGetDatos(sesionHttp.token);
      assert.equal(datosHttp.mascotas[0].id, GRANDE);
      assert.equal(datosHttp.citas[0].mascota_id, GRANDE);
      assert.equal(peticionesHttp.length, 4);
      assert.ok(peticionesHttp.slice(1).every((p) => p.autorizacion === 'Bearer HTTP'));
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    delete process.env.EXPO_PUBLIC_API_URL;
    assert.equal(crearCargador(crearReact().react)('src/services/api.ts').API_URL, 'http://localhost:4000/api');
    const seleccionarPlataforma = native.Platform.select;
    try {
      native.Platform.select = (opciones) => opciones.android;
      assert.equal(crearCargador(crearReact().react)('src/services/api.ts').API_URL, 'http://10.0.2.2:4000/api');
    } finally { native.Platform.select = seleccionarPlataforma; }
    console.log('OK: HTTP local, API, URL, BIGINT, selección, errores HTTP/red/respuesta/tiempo, carga atómica, vacío, reintento, concurrencia, sesiones, demo y estados visibles.');
  } finally {
    global.fetch = fetchOriginal;
    if (envOriginal === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = envOriginal;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
