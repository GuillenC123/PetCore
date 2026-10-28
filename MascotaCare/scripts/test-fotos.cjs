const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { crearReact, crearCargador } = require('./helpers/react-cargador.cjs');

async function main() {
  // Selector cancelado, conversión portable y liberación de recursos.
  let seleccion = { canceled: true };
  let transformaciones = [];
  let liberar = 0;
  const modulo = { exports: {} };
  const contexto = {
    crop: (valor) => transformaciones.push(valor), resize: (valor) => transformaciones.push(valor),
    renderAsync: async () => ({ saveAsync: async () => ({ base64: '/9j/2Q==' }), release: () => liberar++ }),
    release: () => liberar++,
  };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/fotos.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', codigo)((nombre) => nombre === 'react-native' ? {Platform:{OS:'android'}} : nombre === 'expo-image-picker'
    ? { launchImageLibraryAsync: async () => seleccion, launchCameraAsync: async () => seleccion, requestCameraPermissionsAsync: async () => ({granted:true}) }
    : { ImageManipulator: { manipulate: () => contexto }, SaveFormat: { JPEG: 'jpeg' } }, modulo, modulo.exports);
  assert.equal(await modulo.exports.seleccionarFoto(), null);
  assert.equal(liberar, 0);
  seleccion = { canceled: false, assets: [{ uri: 'file:///temporal', width: 2000, height: 1000 }] };
  assert.equal(await modulo.exports.seleccionarFoto(), 'data:image/jpeg;base64,/9j/2Q==');
  assert.deepEqual(transformaciones, [{ originX: 500, originY: 0, width: 1000, height: 1000 }, { width: 512, height: 512 }]);
  assert.equal(liberar, 2);

  transformaciones = [];
  assert.equal(await modulo.exports.seleccionarFoto('camara'), 'data:image/jpeg;base64,/9j/2Q==');
  assert.equal(transformaciones.length, 2);
  transformaciones = [];
  await modulo.exports.seleccionarFoto('camara', false);
  assert.deepEqual(transformaciones, [{width:1280}]);
  seleccion = {canceled:true};
  assert.equal(await modulo.exports.seleccionarFoto('camara'), null);

  // Contexto y cliente HTTP reales: guardar, quitar y conservar foto ante fallo.
  const hooks = crearReact();
  const cargar = crearCargador(hooks.react);
  const { AuthProvider } = cargar('src/context/AuthContext.tsx');
  const render = () => hooks.render(() => AuthProvider({ children: null })).props.value;
  let mascota = { id: 1, nombre: 'Luna', raza: 'Mestiza', especie: 'Perro', edad: '2 años', estado: 'saludable', imagen: null };
  let usuario = { id: 1, nombre: 'Ana', correo: 'ana@example.com', imagen: null };
  let falla = false;
  const fetchAnterior = global.fetch;
  const imagen = 'data:image/jpeg;base64,/9j/2Q==';
  const responder = (valor, status = 200) => new Response(JSON.stringify(valor), { status });
  try {
    global.fetch = async (url, opciones) => {
      if (url.endsWith('/login')) return responder({ usuario, token: 'REAL' });
      if (opciones.method === 'PUT') {
        if (falla) return responder({ error: 'Fallo al guardar' }, 503);
        const datos = JSON.parse(opciones.body);
        if (url.endsWith('/perfil')) { usuario = { ...usuario, ...datos }; return responder({ usuario, token: 'REAL' }); }
        mascota = { ...mascota, ...datos }; return responder(mascota);
      }
      return responder(url.endsWith('/mascotas') ? [mascota] : []);
    };
    await render().login(usuario.correo, '123456');
    await render().cargarDatos();
    await render().actualizarFotoMascota(1, imagen);
    assert.equal(render().mascotas[0].imagen, imagen);
    falla = true;
    await assert.rejects(render().actualizarFotoMascota(1, null), /Fallo al guardar/);
    assert.equal(render().mascotas[0].imagen, imagen);
    falla = false;
    await render().actualizarFotoMascota(1, null);
    assert.equal(render().mascotas[0].imagen, null);
    await render().actualizarPerfil({ nombre: usuario.nombre, correo: usuario.correo, imagen });
    assert.equal(render().usuario.imagen, imagen);
    render().logout();
    await render().login(usuario.correo, '123456');
    assert.equal(render().usuario.imagen, imagen);
  } finally { global.fetch = fetchAnterior; hooks.unmount(); }
  console.log('OK: selección, conversión, fotos de mascotas y perfil, errores y nuevo acceso.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
