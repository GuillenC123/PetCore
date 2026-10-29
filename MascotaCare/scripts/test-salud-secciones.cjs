const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { crearReact, crearCargador } = require('./helpers/react-cargador.cjs');

function cargarComponente(archivo, resolver) {
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', codigo)(resolver, modulo, modulo.exports);
  return modulo.exports;
}
function encontrar(nodo, tipo) {
  if (!nodo || typeof nodo !== 'object') return [];
  if (Array.isArray(nodo)) return nodo.flatMap((hijo) => encontrar(hijo, tipo));
  return [...(nodo.type === tipo ? [nodo] : []), ...encontrar(nodo.props?.children, tipo)];
}
const ahora = new Date(2026,9,27,12).getTime();
const cargar = crearCargador(crearReact().react);
const { SECCIONES_SALUD, esSeccionSalud, resumenesSalud } = cargar('src/utils/secciones-salud.ts');
const mascota = { id: '9223372036854775807', nombre: 'Milo', especie: 'Gato', raza: 'Mestizo', edad: '2 años', imagen: null, estado: 'saludable',
  registros_peso: [{fecha:'2026-10-25',peso:4.2},{fecha:'2026-10-20',peso:4.1}], carnet: [], observaciones: [],
};
assert.equal(esSeccionSalud('peso'), true);
assert.equal(esSeccionSalud('../perfil'), false);
assert.equal(esSeccionSalud(undefined), false);
assert.equal(SECCIONES_SALUD.length, 5);
const resumen = resumenesSalud(mascota, [], [], ahora);
assert.match(resumen.peso, /4[.,]2 kg.*25\/10\/2026/);
assert.equal(resumen.historial,'Sin eventos registrados');
assert.equal(resumen.tratamientos,'Sin tratamientos registrados');
assert.equal(mascota.registros_peso[0].fecha,'2026-10-25');
const conDatos = resumenesSalud({ ...mascota, carnet:[{id:1,tipo:'vacuna',nombre:'Vacuna',fecha_aplicacion:null,proxima_fecha:'29/10/2026',comprobante:null}],
  observaciones:[{id:1,tipo:'observacion',titulo:'Control de salud',descripcion:'Nota',fecha:new Date(2026,9,26).toISOString()}] },
  [{id:1,mascota_id:mascota.id,medicamento:'Medicación',inicio:'27/10/2026',duracion_dias:1,horarios:['09:00','18:00'],indicaciones:'Indicaciones',tomas:[{fecha_hora:new Date(2026,9,27,9).toISOString(),estado:'administrada'},{fecha_hora:new Date(2026,9,27,18).toISOString(),estado:'pendiente'}]}], [], ahora);
assert.match(conDatos.vacunas,/29\/10\/2026/);
assert.equal(conDatos.tratamientos,'1 tratamiento activo');
assert.match(conDatos.historial,/Medicación/);

// La portada solo contiene cinco accesos, todos conservan el ID BIGINT.
const destinos = [];
const { default: Portada } = cargarComponente('src/components/HealthRecord.tsx', (nombre) => {
  if(nombre==='@/components/AnimatedSection') return {__esModule:true,default:'AnimatedSection'};
  if(nombre==='@/components/AnimatedPressable') return {__esModule:true,default:'Pressable'};
  if(nombre==='expo-router') return {router:{push:(ruta)=>destinos.push(ruta)}};
  if(nombre==='@expo/vector-icons') return {Ionicons:'Icon'};
  if(nombre==='react-native') return {StyleSheet:{create:v=>v},Pressable:'Pressable',Text:'Text',View:'View'};
  if(nombre==='@/context/AuthContext') return {useAuth:()=>({tratamientos:[],citas:[]})};
  if(nombre==='@/hooks/use-ahora') return {useAhora:()=>ahora};
  if(nombre==='@/constants/theme') return {AppColors:{}};
  if(nombre==='./AdaptiveLayout') return {AdaptiveColumns:'AdaptiveColumns'};
  if(nombre==='./PetImage'||nombre==='./PetHealthStatus') return {__esModule:true,default:nombre};
  if(nombre.startsWith('@/utils/')) return cargar(`src/utils/${nombre.slice(8)}.ts`);
  if (nombre === '@/context/AppearanceContext') return { useAppColors: () => ({}) };
  return require(nombre);
});
const accesos = encontrar(Portada({mascota}),'Pressable');
assert.equal(accesos.length,5);
accesos.forEach((acceso)=>acceso.props.onPress());
assert.deepEqual(destinos.map((d)=>d.params.seccion),['datos','peso','vacunas','tratamientos','historial']);
assert.ok(destinos.every((d)=>d.pathname==='/salud/[seccion]'&&d.params.mascotaId===mascota.id));

// Protección real: conservar, descartar, bloqueo durante guardado y navegación lateral.
const h = crearReact();
const react = {...h.react,useMemo:(factory,deps)=>h.react.useCallback(factory,deps)()};
let protegido, alSalir, desactivaciones=0;
const { HealthEditProvider } = cargarComponente('src/context/HealthEditContext.tsx',(nombre)=>{
  if(nombre==='react') return react;
  if(nombre==='expo-router') return {usePreventRemove:(valor,callback)=>{protegido=valor;alSalir=callback;return ()=>desactivaciones++;}};
  if(nombre==='react-native') return {StyleSheet:{create:v=>v},Modal:'Modal',Pressable:'Pressable',Text:'Text',View:'View'};
  if(nombre==='@/constants/theme') return {AppColors:{}};
  if (nombre === '@/context/AppearanceContext') return { useAppColors: () => ({}) };
  return require(nombre);
});
const render = ()=>h.render(()=>HealthEditProvider({children:null}));
const contexto = ()=>render().props.value;
const modal = ()=>encontrar(render(),'Modal')[0];
contexto().actualizar('editor',{sucio:true,ocupado:false});render();
assert.equal(protegido,true);
let repeticiones=0;
alSalir({repeat:()=>repeticiones++});
assert.equal(modal().props.visible,true);
encontrar(modal(),'Pressable')[0].props.onPress();render();
assert.equal(protegido,true);
assert.equal(repeticiones,0);
alSalir({repeat:()=>repeticiones++});
encontrar(modal(),'Pressable')[1].props.onPress();render();
assert.equal(protegido,false);
assert.equal(repeticiones,1);
h.unmount();

const h2 = crearReact();
const react2 = {...h2.react,useMemo:(factory,deps)=>h2.react.useCallback(factory,deps)()};
const {HealthEditProvider: Provider2} = cargarComponente('src/context/HealthEditContext.tsx',(nombre)=>{
  if(nombre==='react') return react2;
  if(nombre==='expo-router') return {usePreventRemove:(valor,callback)=>{protegido=valor;alSalir=callback;return ()=>desactivaciones++;}};
  if(nombre==='react-native') return {StyleSheet:{create:v=>v},Modal:'Modal',Pressable:'Pressable',Text:'Text',View:'View'};
  if(nombre==='@/constants/theme') return {AppColors:{}};
  if (nombre === '@/context/AppearanceContext') return { useAppColors: () => ({}) };
  return require(nombre);
});
const render2=()=>h2.render(()=>Provider2({children:null}));
let navegaciones=0;
render2().props.value.actualizar('editor',{sucio:true,ocupado:true});
render2().props.value.navegar(()=>navegaciones++);
assert.equal(navegaciones,0);
alSalir({repeat:()=>repeticiones++});
assert.equal(encontrar(render2(),'Modal')[0].props.visible,false);
render2().props.value.actualizar('editor',{sucio:true,ocupado:false});
render2().props.value.navegar(()=>navegaciones++);
assert.equal(navegaciones,0);
encontrar(render2(),'Pressable')[1].props.onPress();render2();
assert.equal(navegaciones,1);
assert.equal(protegido,false);
assert.equal(desactivaciones,1);
h2.unmount();
console.log('OK: resúmenes, cinco rutas por mascota, cambios sin guardar y navegación protegida.');
