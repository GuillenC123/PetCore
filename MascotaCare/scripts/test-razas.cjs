const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { crearReact, crearCargador } = require('./helpers/react-cargador.cjs');
const flush = () => new Promise((resolve) => setImmediate(resolve));
const respuesta = (datos, status = 200) => new Response(JSON.stringify(datos), { status });
const catalogo = (especie, razas) => ({ especie, razas, idioma: 'es', fuente: 'Prueba', urlFuente: 'https://example.com', actualizadoEn: new Date().toISOString(), desactualizado: false });

async function main() {
  const hooks = crearReact();
  const cargar = crearCargador(hooks.react);
  const { filtrarRazas, RAZA_MESTIZA } = cargar('src/utils/razas.ts');
  assert.deepEqual(filtrarRazas(['Pastor alemán', 'Siamés', 'Persa'], ' ALEMAN '), ['Pastor alemán']);
  assert.deepEqual(filtrarRazas(['Pastor alemán', 'Siamés'], 'siames'), ['Siamés']);
  const { useRazas } = cargar('src/hooks/use-razas.ts');
  const api = cargar('src/services/api.ts');
  const render = (especie) => hooks.render(() => useRazas(especie));
  const fetchAnterior = global.fetch;
  try {
    let resolverPerros;
    global.fetch = async (url) => {
      if (url.includes('Perro')) return new Promise((resolve) => { resolverPerros = resolve; });
      return respuesta({ error: 'No disponible' }, 503);
    };
    assert.equal(render('Perro').cargando, true);
    assert.equal(render('Gato').cargando, true);
    await flush(); await flush();
    assert.equal(render('Gato').error, true);
    // Un proveedor lento de perros no reemplaza el catálogo del gato.
    resolverPerros(respuesta(catalogo('Perro', ['Beagle'])));
    await flush(); await flush();
    assert.equal(render('Gato').catalogo, undefined);
    global.fetch = async () => respuesta(catalogo('Gato', ['Persa']));
    render('Gato').reintentar(); render('Gato');
    await flush(); await flush();
    assert.deepEqual(render('Gato').catalogo.razas, ['Persa']);
    assert.equal(render('Otro').cargando, false);
    global.fetch = async () => respuesta(catalogo('Gato', ['Persa']));
    await assert.rejects(api.apiGetRazas('Perro'), (error) => error.tipo === 'respuesta');
    global.fetch = async () => respuesta({ ...catalogo('Perro', ['German Shepherd']), idioma: 'en' });
    await assert.rejects(api.apiGetRazas('Perro'), (error) => error.tipo === 'respuesta');
  } finally { hooks.unmount(); global.fetch = fetchAnterior; }

  // Selector real: búsqueda, mestizo y escritura manual incluso sin catálogo.
  const react = crearReact();
  const modulo = { exports: {} };
  let errorCarga = false;
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/BreedField.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', codigo)((nombre) => {
    if (nombre === 'react') return react.react;
    if (nombre === 'react-native') return { StyleSheet: { create: (v) => v }, Platform: { OS: 'web' },
      ActivityIndicator: 'ActivityIndicator', FlatList: 'FlatList', KeyboardAvoidingView: 'KeyboardAvoidingView',
      Modal: 'Modal', Pressable: 'Pressable', Text: 'Text', View: 'View' };
    if (nombre === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (nombre === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (nombre === '@/constants/theme') return { AppColors: {} };
    if (nombre === './FormInput') return { __esModule: true, default: 'FormInput' };
    if (nombre === '@/utils/razas') return { filtrarRazas, RAZA_MESTIZA, RAZA_DESCONOCIDA: 'Desconocida' };
    if (nombre === '@/hooks/use-razas') return { useRazas: () => ({ cargando: false, error: errorCarga,
      catalogo: errorCarga ? undefined : catalogo('Perro', ['Beagle', 'Pastor alemán']), reintentar() {} }) };
    if (nombre === '@/context/AppearanceContext') return { useAppColors: () => ({}) };
  return require(nombre);
  }, modulo, modulo.exports);
  const props = { especie: 'Perro', value: '', onChange: (valor) => { props.value = valor; } };
  const mostrar = () => react.render(() => modulo.exports.default(props));
  function encontrar(elemento, tipo) {
    if (!elemento || typeof elemento !== 'object') return [];
    if (Array.isArray(elemento)) return elemento.flatMap((hijo) => encontrar(hijo, tipo));
    return [...(elemento.type === tipo ? [elemento] : []), ...encontrar(elemento.props?.children, tipo)];
  }
  let vista = mostrar();
  encontrar(vista, 'Pressable')[0].props.onPress();
  vista = mostrar();
  assert.equal(encontrar(vista, 'Modal')[0].props.visible, true);
  const buscar = encontrar(vista, 'FormInput').find((input) => input.props.label === 'Buscar raza');
  buscar.props.onChangeText('aleman');
  assert.deepEqual(encontrar(mostrar(), 'FlatList')[0].props.data, ['Pastor alemán']);
  const especiales = encontrar(mostrar(), 'Pressable').filter((boton) => boton.props.accessibilityRole === 'radio');
  especiales[0].props.onPress();
  assert.equal(props.value, RAZA_MESTIZA);
  assert.equal(encontrar(mostrar(), 'Modal')[0].props.visible, false);
  errorCarga = true;
  encontrar(mostrar(), 'Pressable')[0].props.onPress();
  const sinRed = encontrar(mostrar(), 'Pressable').filter((boton) => boton.props.accessibilityRole === 'radio');
  assert.equal(sinRed.length, 3);
  sinRed[2].props.onPress();
  const manual = encontrar(mostrar(), 'FormInput').find((input) => input.props.label === 'Escribe la raza');
  manual.props.onChangeText('Raza propia');
  assert.equal(props.value, 'Raza propia');
  props.especie = 'Otro';
  assert.equal(mostrar().type, 'FormInput');
  assert.equal(mostrar().props.value, 'Raza propia');
  console.log('OK: catálogo por especie, búsqueda, reintento, cancelación, mestizo y raza manual.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
