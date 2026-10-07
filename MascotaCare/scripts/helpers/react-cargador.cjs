const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

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

function crearCargador(react, almacenamiento = crearAlmacenamiento()) {
  const cache = new Map();
  function cargar(archivo) {
    const absoluto = path.resolve(__dirname, '../..', archivo);
    if (cache.has(absoluto)) return cache.get(absoluto).exports;
    const modulo = { exports: {} };
    cache.set(absoluto, modulo);
    const js = ts.transpileModule(fs.readFileSync(absoluto, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const resolver = (nombre) => {
      if (nombre === 'react') return react;
      if (nombre === 'react-native') return native;
      if (nombre === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
      if (nombre === '@react-native-async-storage/async-storage') return { __esModule: true, default: almacenamiento };
      if (nombre.endsWith('.css')) return {};
      if (nombre.startsWith('@/') || nombre.startsWith('.')) {
        const base = nombre.startsWith('@/') ? path.resolve(__dirname, '../..', 'src', nombre.slice(2)) : path.resolve(path.dirname(absoluto), nombre);
        return cargar(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
      }
      return require(nombre);
    };
    new Function('require', 'module', 'exports', js)(resolver, modulo, modulo.exports);
    return modulo.exports;
  }
  return cargar;
}

function crearAlmacenamiento() {
  const valores = new Map();
  const llamadas = [];
  return {
    valores, llamadas,
    async getItem(clave) { llamadas.push({ tipo: 'leer', clave }); return valores.get(clave) ?? null; },
    async setItem(clave, valor) { llamadas.push({ tipo: 'guardar', clave }); valores.set(clave, valor); },
    async removeItem(clave) { llamadas.push({ tipo: 'eliminar', clave }); valores.delete(clave); },
  };
}
module.exports = { crearReact, crearCargador, crearAlmacenamiento, native };

