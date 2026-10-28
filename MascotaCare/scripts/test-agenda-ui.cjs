const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { crearReact, crearCargador } = require('./helpers/react-cargador.cjs');

const hooks = crearReact();
const cargar = crearCargador(hooks.react);
const ahora = new Date(2026,9,27,12).getTime();
const fecha = (dia,hora) => new Date(2026,9,dia,hora).toISOString();
const acciones = [];
const datos = {
  mascotas: [{id:1,nombre:'Luna',imagen:null},{id:2,nombre:'Milo',imagen:null}],
  citas: [
    {id:1,mascota_id:1,titulo:'Visita vencida',fecha_hora:fecha(26,10),estado:'programado'},
    {id:2,mascota_id:1,titulo:'Visita futura',fecha_hora:fecha(27,18),estado:'programado'},
  ],
  tratamientos: [{id:3,mascota_id:1,medicamento:'Toma futura',indicaciones:'Indicaciones',tomas:[{fecha_hora:fecha(27,19),estado:'pendiente'}]}],
  recordatorios: [{id:4,mascota_id:2,titulo:'Cuidados de Milo',descripcion:'Detalle',vence_en:fecha(28,9),completado:false}],
  marcarToma: (...args) => acciones.push(['toma',...args]),
  tacharRecordatorio: (...args) => acciones.push(['recordatorio',...args]),
  completarCita: (id) => acciones.push(['visita',id]), cancelarCita() {},
};
const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components/CareAgenda.tsx'),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
}).outputText;
const modulo = {exports:{}};
new Function('require','module','exports',codigo)((nombre)=>{
  if(nombre==='react') return hooks.react;
  if(nombre==='react-native') return {StyleSheet:{create:v=>v},Alert:{alert(){}},Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',View:'View'};
  if(nombre==='expo-router') return {router:{push:destino=>acciones.push(['navegar',destino])}};
  if(nombre==='@expo/vector-icons') return {Ionicons:'Icon'};
  if(nombre==='@/constants/theme') return {AppColors:{}};
  if(nombre==='@/context/AuthContext') return {useAuth:()=>datos};
  if(nombre==='@/hooks/use-ahora') return {useAhora:()=>ahora};
  if(nombre==='@/hooks/use-accion-guardado') return {useAccionGuardado:()=>({guardando:false,ejecutar:fn=>fn()})};
  if(nombre==='./AdaptiveLayout') return {AdaptiveColumns:'AdaptiveColumns'};
  if(nombre==='./SaveFeedback'||nombre==='./PetImage') return {__esModule:true,default:nombre};
  if(nombre.startsWith('@/utils/')) return cargar(`src/utils/${nombre.slice(8)}.ts`);
  if (nombre === '@/context/AppearanceContext') return { useAppColors: () => ({}) };
  return require(nombre);
},modulo,modulo.exports);
function expandir(nodo) {
  if(!nodo||typeof nodo!=='object') return nodo;
  if(Array.isArray(nodo)) return nodo.map(expandir);
  if(typeof nodo.type==='function') return expandir(nodo.type(nodo.props));
  return {...nodo,props:{...nodo.props,children:expandir(nodo.props?.children)}};
}
const render = () => expandir(hooks.render(()=>modulo.exports.default({initialFilter:'Todos'})));
function buscar(nodo,predicado) {
  if(!nodo||typeof nodo!=='object') return [];
  if(Array.isArray(nodo)) return nodo.flatMap(n=>buscar(n,predicado));
  return [...(predicado(nodo)?[nodo]:[]),...buscar(nodo.props?.children,predicado)];
}
function texto(nodo) {
  if(typeof nodo==='string'||typeof nodo==='number') return String(nodo);
  if(Array.isArray(nodo)) return nodo.map(texto).join('');
  return nodo&&typeof nodo==='object'?texto(nodo.props?.children):'';
}
const boton = (vista,label) => buscar(vista,n=>n.type==='Pressable'&&texto(n)===label)[0];
let vista=render();
assert.match(texto(vista),/Vencidos/);
assert.match(texto(vista),/Mañana/);
boton(vista,'Marcar realizada').props.onPress();
assert.deepEqual(acciones.at(-1),['visita',1]);
assert.equal(boton(vista,'Administrada').props.disabled,true);
boton(vista,'Completar').props.onPress();
assert.deepEqual(acciones.at(-1),['recordatorio',4,true]);
boton(vista,'Medicamentos').props.onPress();
vista=render();
assert.match(texto(vista),/1 cuidado pendiente/);
assert.ok(!texto(vista).includes('Visita futura'));
boton(vista,'Milo').props.onPress();
assert.match(texto(render()),/Sin cuidados para estos filtros/);
boton(render(),'Restablecer').props.onPress();
vista=render();
assert.match(texto(vista),/2 cuidados pendientes/);
assert.match(texto(vista),/Visita futura/);
assert.ok(!texto(vista).includes('Visita vencida'));
console.log('OK: agenda por días, filtros combinados, restablecer y acciones según horario.');
