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
const util = cargar('src/utils/carnet.ts');
const ahora = new Date(2028, 2, 1, 12);
const datos = { tipo: 'vacuna', nombre: 'Vacuna registrada', fecha_aplicacion: '29/02/2028', proxima_fecha: '01/03/2028', comprobante: 'file:///comprobante.jpg' };
assert.equal(util.validarCarnet(datos, ahora.getTime()), undefined);
for (const cambio of [{ nombre: '' }, { fecha_aplicacion: '31/02/2028' }, { fecha_aplicacion: '02/03/2028' }, { proxima_fecha: '28/02/2028' }, { proxima_fecha: '29/02/2028' }, { fecha_aplicacion: null, proxima_fecha: null }]) {
  assert.ok(util.validarCarnet({ ...datos, ...cambio }, ahora.getTime()));
}
assert.equal(util.validarCarnet({ ...datos, fecha_aplicacion: null }, ahora.getTime()), undefined);
assert.equal(util.validarCarnet({ ...datos, proxima_fecha: null }, ahora.getTime()), undefined);
assert.equal(util.estadoProximo('01/03/2028', ahora), 'Pr\u00f3ximo');
assert.equal(util.estadoProximo('29/02/2028', ahora), 'Vencido');
const historial = [{ ...datos, id: 1 }, { ...datos, id: 2, anterior_id: 1, fecha_aplicacion: '01/03/2028', proxima_fecha: '01/04/2028' }];
assert.deepEqual(util.pendientesCarnet(historial).map(r => r.id), [2]);
assert.equal(historial.filter(r => r.fecha_aplicacion).length, 2);
const estados = [null, null, false, [{ id: 1 }, { id: 2 }], [], [], []];
let indice = 0;
const refs = [];
let refIndice = 0;
const react = {
  createContext: () => ({ Provider: 'Provider' }),
  useState: () => { const n = indice++; return [estados[n], valor => { estados[n] = typeof valor === 'function' ? valor(estados[n]) : valor; }]; },
  useRef: valor => { const n = refIndice++; return refs[n] ?? (refs[n] = { current: valor }); },
  useCallback: fn => fn, createElement: (_tipo, props) => props,
};
const { AuthProvider } = cargar('src/context/AuthContext.tsx', nombre => nombre === 'react' ? react : nombre === '@/utils/carnet' ? util : nombre === '@/utils/citas' ? cargar('src/utils/citas.ts') : {});
function contexto() { indice = 0; refIndice = 0; return AuthProvider({ children: null }).value; }
const pasado = { ...datos, fecha_aplicacion: '01/01/2020', proxima_fecha: '01/02/2020' };
assert.throws(() => contexto().guardarCarnet(99, pasado));
contexto().guardarCarnet(1, pasado);
const id = estados[3][0].carnet[0].id;
assert.equal(estados[3][1].carnet, undefined);
assert.equal(estados[3][0].carnet[0].comprobante, datos.comprobante);
contexto().guardarCarnet(1, { ...pasado, fecha_aplicacion: '01/02/2020', proxima_fecha: null, anterior_id: id });
assert.equal(estados[3][0].carnet.length, 2);
assert.equal(util.pendientesCarnet(estados[3][0].carnet).length, 0);
assert.throws(() => contexto().guardarCarnet(1, { ...pasado, fecha_aplicacion: '01/03/2020', proxima_fecha: null, anterior_id: id }));
contexto().guardarCarnet(1, { ...pasado, comprobante: null }, id);
assert.equal(estados[3][0].carnet[0].comprobante, null);
console.log('OK: fechas, estados, historial, siguiente aplicacion, foto y aislamiento por mascota.');
