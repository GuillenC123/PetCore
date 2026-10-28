const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Ejecuta la barra real con el contrato de Expo Router SDK 58.
// Verifica navegación, cancelación del evento y variante de tablet.
const modulo = { exports: {} };
let lateral = false;
const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/(tabs)/_layout.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', codigo)((nombre) => {
  if (nombre === 'expo-router') return { Tabs: Object.assign(() => null, { Screen: () => null }) };
  if (nombre === 'react-native') return { StyleSheet: { create: (valor) => valor }, Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View' };
  if (nombre === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
  if (nombre === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
  if (nombre === '@/constants/theme') return { AppColors: {} };
  if (nombre === '@/hooks/use-tablet-layout') return { useTabletLayout: () => ({ sidebar: lateral }) };
  if (nombre === '@/context/AppearanceContext') return { useAppColors: () => ({}) };
  return require(nombre);
}, modulo, modulo.exports);

const rutas = ['index', 'mascotas', 'citas', 'perfil'].map((name) => ({ key: `${name}-key`, name }));
const etiquetas = ['Inicio', 'Ficha de salud', 'Agenda', 'Perfil'];
const descriptors = Object.fromEntries(rutas.map((ruta, i) => [ruta.key, { options: { title: etiquetas[i] }, route: ruta }]));
function botones(elemento) {
  if (!elemento || typeof elemento !== 'object') return [];
  if (Array.isArray(elemento)) return elemento.flatMap(botones);
  return [...(elemento.type === 'Pressable' ? [elemento] : []), ...botones(elemento.props?.children)];
}
for (const sidebar of [false, true]) {
  lateral = sidebar;
  const destinos = [], eventos = [];
  let prevenir = false;
  const layout = modulo.exports.default();
  assert.equal(layout.props.screenOptions.tabBarPosition, sidebar ? 'left' : 'bottom');
  const elementoBarra = layout.props.tabBar({ state: { index: 0, routes: rutas }, descriptors,
    emitter: { emit: (evento) => { eventos.push(evento); return { defaultPrevented: prevenir }; } },
    navigateToTab: (clave) => destinos.push(clave), insets: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  const barra = elementoBarra.type(elementoBarra.props);
  const controles = botones(barra);
  assert.deepEqual(controles.map((b) => b.props.accessibilityLabel), etiquetas);
  controles[0].props.onPress();
  assert.deepEqual(destinos, []);
  controles[1].props.onPress();
  assert.deepEqual(destinos, ['mascotas-key']);
  prevenir = true;
  controles[2].props.onPress();
  assert.deepEqual(destinos, ['mascotas-key']);
  controles[3].props.onLongPress();
  assert.equal(eventos.at(-1).type, 'tabLongPress');
  assert.equal(eventos.at(-1).target, 'perfil-key');
}
console.log('OK: cuatro pestañas, navegación SDK 58, eventos y tablet.');
