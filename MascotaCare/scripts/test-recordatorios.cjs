const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function cargar(archivo, resolver = require) {
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(resolver, modulo, modulo.exports);
  return modulo.exports;
}

const util = cargar('src/utils/recordatorios.ts');
const { obtenerProximasCitas } = cargar('src/utils/citas.ts');
const ahora = new Date(2028, 0, 31, 12).getTime();
const base = { id: 1, titulo: 'Control', tipo: 'general', mascota_id: null, completado: false, vence_en: new Date(ahora).toISOString() };
assert.equal(util.fechaRecordatorio('sin fecha'), null);
assert.equal(util.fechaRecordatorio('2028-01-31').getDate(), 31);
assert.equal(util.estadoRecordatorio(base, ahora), 'Vencido');
assert.equal(util.estadoRecordatorio({ ...base, completado: true }, ahora), 'Completado');
assert.equal(util.estadoRecordatorio({ ...base, vence_en: null }, ahora), 'Sin fecha');
assert.equal(util.estadoRecordatorio({ ...base, vence_en: new Date(ahora + 3600000).toISOString() }, ahora), 'Hoy');
const mensual = util.completarRecordatorio({ ...base, repeticion: 'mensual' }, true, ahora);
assert.equal(new Date(mensual.vence_en).getDate(), 29);
assert.equal(mensual.completado, false);
const marzo = util.completarRecordatorio(mensual, true, new Date(mensual.vence_en).getTime());
assert.equal(new Date(marzo.vence_en).getDate(), 31);
assert.equal(util.completarRecordatorio(base, true, ahora).completado, true);
for (const repeticion of ['diaria', 'semanal']) {
  const proximo = util.completarRecordatorio({ ...base, repeticion }, true, ahora + 40 * 86400000);
  assert.ok(new Date(proximo.vence_en).getTime() > ahora + 40 * 86400000);
}
assert.deepEqual(util.ordenarRecordatorios([
  { ...base, id: 3, completado: true }, { ...base, id: 2, vence_en: null }, base,
]).map(r => r.id), [1, 2, 3]);
assert.deepEqual(obtenerProximasCitas([
  { id: 1, estado: 'programado', fecha_hora: new Date(ahora + 2000).toISOString() },
  { id: 2, estado: 'programado', fecha_hora: new Date(ahora - 2000).toISOString() },
  { id: 3, estado: 'confirmado', fecha_hora: new Date(ahora + 1000).toISOString() },
  { id: 4, estado: 'cancelado', fecha_hora: new Date(ahora + 1000).toISOString() },
  { id: 5, estado: 'completado', fecha_hora: new Date(ahora + 1000).toISOString() },
], ahora).map(c => c.id), [3, 1]);

// Comprueba las mutaciones del contexto con un almacén de hooks en memoria.
const estados = [null, null, false, [{ id: 10, nombre: 'Luna' }], [], []];
let indice = 0;
const react = {
  createContext: () => ({ Provider: 'Provider' }),
  useState: () => { const n = indice++; return [estados[n], valor => { estados[n] = typeof valor === 'function' ? valor(estados[n]) : valor; }]; },
  useRef: valor => ({ current: valor }), useCallback: fn => fn,
  createElement: (_tipo, props) => props,
};
const { AuthProvider } = cargar('src/context/AuthContext.tsx', nombre => nombre === 'react' ? react : nombre === '@/utils/recordatorios' ? util : {});
const contexto = AuthProvider({ children: null }).value;
const futuro = new Date(Date.now() + 86400000).toISOString();
const datos = { titulo: 'Alimento', descripcion: null, tipo: 'alimento', mascota_id: 10, vence_en: futuro, repeticion: 'diaria' };
assert.throws(() => contexto.guardarRecordatorio({ ...datos, titulo: '' }));
assert.throws(() => contexto.guardarRecordatorio({ ...datos, mascota_id: 999 }));
contexto.guardarRecordatorio(datos);
const id = estados[5][0].id;
assert.equal(estados[5][0].mascota_nombre, 'Luna');
contexto.guardarRecordatorio({ ...datos, titulo: 'Nuevo alimento' }, id);
assert.equal(estados[5].length, 1);
assert.equal(estados[5][0].titulo, 'Nuevo alimento');
const aplazado = new Date(Date.now() + 2 * 86400000).toISOString();
contexto.posponerRecordatorio(id, aplazado);
assert.equal(estados[5][0].vence_en, aplazado);
contexto.tacharRecordatorio(id, true);
assert.equal(estados[5][0].completado, false);
assert.ok(new Date(estados[5][0].vence_en) > new Date(aplazado));
assert.ok(estados[5][0].ultima_realizacion);
console.log('OK: crear, editar, posponer, repetir, vencimientos y filtro de próximas citas.');
