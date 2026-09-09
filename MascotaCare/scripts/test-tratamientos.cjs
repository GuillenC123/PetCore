const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function cargar(archivo, resolver) {
  const mod = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  new Function('require', 'module', 'exports', codigo)(resolver ?? (nombre => cargar(`src/utils/${nombre.replace('./', '')}.ts`)), mod, mod.exports);
  return mod.exports;
}
const util = cargar('src/utils/tratamientos.ts');
const datos = { mascota_id: 1, medicamento: 'Medicamento registrado', indicaciones: 'Indicaciones transcritas', inicio: '28/02/2028', duracion_dias: 3, horarios: ['20:00', '08:00'] };
const t = util.crearTratamiento(datos, 1);
assert.equal(t.tomas.length, 6);
assert.equal(new Date(t.tomas[0].fecha_hora).getHours(), 8);
assert.equal(new Date(t.tomas[2].fecha_hora).getDate(), 29);
assert.equal(new Date(t.tomas[4].fecha_hora).getMonth(), 2);
assert.ok(t.tomas.every(toma => toma.estado === 'pendiente'));
for (const cambio of [{ medicamento: '' }, { indicaciones: '' }, { inicio: '31/02/2028' }, { duracion_dias: 0 }, { duracion_dias: 1.5 }, { duracion_dias: 366 }, { horarios: [] }, { horarios: ['24:00'] }, { horarios: ['08:00', '08:00'] }]) {
  assert.throws(() => util.crearTratamiento({ ...datos, ...cambio }, 2));
}
const fecha = t.tomas[0].fecha_hora;
const ahora = new Date(fecha).getTime() + 1000;
assert.throws(() => util.registrarToma(t, fecha, 'administrada', ahora - 2000));
assert.throws(() => util.registrarToma(t, 'inexistente', 'administrada', ahora));
const administrado = util.registrarToma(t, fecha, 'administrada', ahora);
assert.equal(administrado.tomas[0].estado, 'administrada');
assert.equal(administrado.tomas[0].registrada_en, new Date(ahora).toISOString());
assert.equal(t.tomas[0].estado, 'pendiente');
assert.equal(administrado.tomas[1].estado, 'pendiente');
assert.equal(util.registrarToma(t, fecha, 'omitida', ahora).tomas[0].estado, 'omitida');
const deshecho = util.registrarToma(administrado, fecha, 'pendiente', ahora);
assert.equal(deshecho.tomas[0].estado, 'pendiente');
assert.equal(deshecho.tomas[0].registrada_en, undefined);

// Verifica asociación a mascota, actualización y limpieza de sesión.
const estados = [null, null, false, [{ id: 1 }, { id: 2 }], [], [], []];
let indice = 0;
const react = {
  createContext: () => ({ Provider: 'Provider' }),
  useState: () => { const n = indice++; return [estados[n], valor => { estados[n] = typeof valor === 'function' ? valor(estados[n]) : valor; }]; },
  useRef: valor => ({ current: valor }), useCallback: fn => fn,
  createElement: (_tipo, props) => props,
};
const { AuthProvider } = cargar('src/context/AuthContext.tsx', nombre => nombre === 'react' ? react : nombre === '@/utils/tratamientos' ? util : {});
let contexto = AuthProvider({ children: null }).value;
assert.throws(() => contexto.agregarTratamiento({ ...datos, mascota_id: 99 }));
contexto.agregarTratamiento({ ...datos, inicio: '01/01/2020' });
assert.equal(estados[6].length, 1);
assert.equal(estados[6][0].mascota_id, 1);
indice = 0;
contexto = AuthProvider({ children: null }).value;
contexto.marcarToma(estados[6][0].id, estados[6][0].tomas[0].fecha_hora, 'administrada');
assert.equal(estados[6][0].tomas[0].estado, 'administrada');
assert.equal(estados[6][0].tomas[1].estado, 'pendiente');
contexto.logout();
assert.equal(estados[6].length, 0);
console.log('OK: horarios, duracion, bisiestos, estados de tomas, aislamiento por mascota y cierre de sesion.');
