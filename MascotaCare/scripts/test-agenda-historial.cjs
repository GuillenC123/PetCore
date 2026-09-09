const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function cargar(archivo, resolver) {
  const mod = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  new Function('require', 'module', 'exports', codigo)(resolver ?? (nombre => cargar(`src/utils/${nombre.replace('./', '')}.ts`)), mod, mod.exports);
  return mod.exports;
}
const agenda = cargar('src/utils/agenda.ts');
const historial = cargar('src/utils/historial.ts');
const ahora = new Date(2026, 8, 9, 12).getTime();
const iso = (dia, hora = 10) => new Date(2026, 8, dia, hora).toISOString();
const citas = [
  {id:1,mascota_id:1,titulo:'Visita',fecha_hora:iso(9),estado:'programado'},
  {id:2,mascota_id:2,titulo:'Otra mascota',fecha_hora:iso(10),estado:'programado'},
  {id:3,mascota_id:1,titulo:'Realizada',fecha_hora:iso(8),estado:'completado'},
  {id:4,mascota_id:1,titulo:'Cancelada',fecha_hora:iso(9),estado:'cancelado'},
];
const tratamientos = [{id:1,mascota_id:1,medicamento:'Medicamento',indicaciones:'Indicaciones',inicio:'08/09/2026',duracion_dias:2,horarios:['10:00'],tomas:[
  {fecha_hora:iso(8),estado:'administrada'}, {fecha_hora:iso(9),estado:'pendiente'},
]}];
const recordatorios = [
  {id:1,cita_id:1,mascota_id:1,titulo:'Aviso de visita',vence_en:iso(9),completado:false},
  {id:2,mascota_id:1,titulo:'Recordatorio',vence_en:iso(13),completado:false},
  {id:3,mascota_id:1,titulo:'Semana siguiente',vence_en:iso(14),completado:false},
  {id:4,mascota_id:1,titulo:'Sin fecha',vence_en:null,completado:false},
];
const eventos = agenda.crearAgenda(citas,tratamientos,recordatorios);
assert.equal(eventos.length,5);
assert.equal(agenda.filtrarAgenda(eventos,'Hoy',1,ahora).length,2);
assert.equal(agenda.filtrarAgenda(eventos,'Vencidos',1,ahora).length,2);
assert.equal(agenda.filtrarAgenda(eventos,'Esta semana',1,ahora).length,3);
assert.equal(agenda.filtrarAgenda(eventos,'Todos',2,ahora).length,1);
assert.equal(agenda.crearAgenda(citas,tratamientos,[{...recordatorios[0],vence_en:iso(10)}]).filter(e=>e.tipo==='recordatorio').length,1);
const mascota = {id:1,observaciones:[{id:1,tipo:'observacion',titulo:'Nota',descripcion:'Detalles',fecha:iso(7)}],
  carnet:[{id:1,tipo:'vacuna',nombre:'Vacuna',fecha_aplicacion:'06/09/2026',proxima_fecha:'06/10/2026',comprobante:'file:///foto.jpg'}],
  adjuntos_historial:{'cita-3':[{uri:'file:///consulta.pdf',nombre:'Consulta.pdf',mime:'application/pdf'}]},
};
const linea = historial.crearHistorial(mascota,citas,tratamientos,ahora);
assert.equal(linea.length,4);
assert.ok(!linea.some(e=>e.clave==='cita-1'));
assert.equal(linea.find(e=>e.clave==='cita-3').adjuntos.length,1);
assert.equal(linea.find(e=>e.clave==='carnet-1').adjuntos[0].uri,'file:///foto.jpg');
assert.ok(linea.every((e,i)=>i===0 || Date.parse(linea[i-1].fecha)>=Date.parse(e.fecha)));
assert.throws(()=>historial.validarObservacion({tipo:'observacion',titulo:'Nota',descripcion:'Detalles',fecha:iso(10)},ahora));
const estados = [null,null,false,[mascota,{id:2}],citas,recordatorios,tratamientos];
let indice=0;
const react={createContext:()=>({Provider:'Provider'}),useState:()=>{const n=indice++;return [estados[n],valor=>{estados[n]=typeof valor==='function'?valor(estados[n]):valor;}];},useRef:valor=>({current:valor}),useCallback:fn=>fn,createElement:(_t,p)=>p};
const {AuthProvider}=cargar('src/context/AuthContext.tsx',nombre=>nombre==='react'?react:nombre==='@/utils/historial'?historial:{});
const ctx=AuthProvider({children:null}).value;
// Usa una visita pasada respecto al reloj real para probar su transición.
estados[4][0].fecha_hora='2020-01-01T10:00:00Z';
ctx.completarCita(1);
assert.equal(estados[4][0].estado,'completado');
assert.equal(estados[5][0].completado,true);
ctx.adjuntarHistorial(1,'cita-1',[{uri:'file:///nuevo.pdf',nombre:'Nuevo.pdf',mime:'application/pdf'}]);
assert.equal(estados[3][0].adjuntos_historial['cita-1'].length,1);
assert.equal(estados[3][1].adjuntos_historial,undefined);
ctx.agregarObservacion(1,{tipo:'consulta',titulo:'Consulta previa',descripcion:'Observaciones',fecha:'2020-01-01T00:00:00Z'});
assert.equal(estados[3][0].observaciones.length,2);
console.log('OK: agenda unificada, duplicados, filtros, historial, adjuntos y consultas realizadas.');
