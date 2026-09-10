const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function cargar(archivo, resolver) {
  const modulo = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  new Function('require', 'module', 'exports', js)(resolver ?? (nombre => cargar(`src/utils/${nombre.replace('./', '')}.ts`)), modulo, modulo.exports);
  return modulo.exports;
}

async function main() {
  const { estadosSalud } = cargar('src/utils/estados-salud.ts');
  const ahora = new Date(2026, 8, 9, 12).getTime();
  const mascota = { id: 1, estado: 'malestar', carnet: [{ id: 1, tipo: 'vacuna', nombre: 'Vacuna', fecha_aplicacion: '01/01/2026', proxima_fecha: '08/09/2026' }] };
  const tratamientos = [{ id: 1, mascota_id: 1, tomas: [{ fecha_hora: new Date(2026,8,9,8).toISOString() }, { fecha_hora: new Date(2026,8,10,8).toISOString() }] }];
  const estados = estadosSalud(mascota, tratamientos, ahora);
  assert.equal(estados.salud, 'Malestar');
  assert.equal(estados.enTratamiento, true);
  assert.equal(estados.vacunaPendiente, true);
  assert.equal(estados.vacunaVencida, true);
  assert.equal(estadosSalud({ ...mascota, id: 2, carnet: [] }, tratamientos, ahora).enTratamiento, false);
  assert.equal(estadosSalud(mascota, tratamientos, new Date(2026,8,11).getTime()).enTratamiento, false);
  assert.equal(estadosSalud({id:1,estado:'malestar',cuidados_registrados:['vacuna_pendiente']}, [], ahora).vacunaPendiente,true);

  const memoria = [null, 'token', true, [{id:1,estado:'vacuna_pendiente'}], [], [{ id: 1, completado: false }], []];
  let indice = 0, indiceRef = 0;
  const refs = [];
  const react = {
    createContext: () => ({Provider:'Provider'}),
    useState: () => { const n = indice++; return [memoria[n], valor => { memoria[n] = typeof valor === 'function' ? valor(memoria[n]) : valor; }]; },
    useRef: valor => { const n = indiceRef++; return refs[n] ?? (refs[n] = {current:valor}); },
    useCallback: fn => fn, createElement: (_t, props) => props,
  };
  let intentos = 0, fallar = true, resolver;
  const api = { apiTacharRecordatorio: async () => { intentos++; if (fallar) throw new Error('Fallo de red'); if (resolver === 'esperar') await new Promise(resolve => {resolver = resolve;}); } };
  const { AuthProvider } = cargar('src/context/AuthContext.tsx', nombre => nombre === 'react' ? react : nombre === '@/services/api' ? api : nombre.startsWith('@/utils/') ? cargar(`src/utils/${nombre.slice(8)}.ts`) : {});
  const contexto = () => { indice = 0; indiceRef = 0; return AuthProvider({children:null}).value; };
  let ctx = contexto();
  await assert.rejects(ctx.tacharRecordatorio(1,true), /No se pudo guardar/);
  assert.equal(memoria[5][0].completado,false);
  fallar = false;
  await ctx.tacharRecordatorio(1,true);
  assert.equal(memoria[5][0].completado,true);
  assert.equal(intentos,2);
  resolver = 'esperar';
  const pendiente = ctx.tacharRecordatorio(1,false);
  await assert.rejects(ctx.tacharRecordatorio(1,false), /se est/);
  resolver(); await pendiente;
  assert.equal(memoria[5][0].completado,false);
  ctx.agregarCita({mascota_id:1,motivo:'Malestar',fecha_hora:new Date(Date.now()+86400000).toISOString()});
  assert.equal(memoria[3][0].estado_salud,'malestar');
  assert.ok(memoria[3][0].cuidados_registrados.includes('vacuna_pendiente'));
  // Una respuesta tardía no cambia los datos de otra sesión.
  ctx = contexto(); resolver = 'esperar';
  const tardio = ctx.tacharRecordatorio(1,true);
  ctx.logout(); memoria[5] = [{id:1,completado:false}];
  resolver(); await tardio;
  assert.equal(memoria[5][0].completado,false);

  const {crearAgenda} = cargar('src/utils/agenda.ts');
  const tareas = crearAgenda([], [{id:1,mascota_id:1,medicamento:'Med',indicaciones:'Indicaciones',tomas:[{fecha_hora:new Date(ahora).toISOString(),estado:'pendiente'}]}], []);
  assert.equal(tareas[0].tipo,'medicamento');
  const {AppColors} = cargar('src/constants/theme.ts', nombre => nombre === 'react-native' ? {Platform:{select:o=>o.default}} : {});
  const luminancia = hex => {
    const rgb = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  for(const [fg,bg] of [[AppColors.primaryDark,'#FFFFFF'],[AppColors.textSecondary,'#FFFFFF'],[AppColors.success,AppColors.successSoft],[AppColors.danger,AppColors.dangerSoft],[AppColors.info,AppColors.infoSoft]]) {
    const a=luminancia(fg),b=luminancia(bg); assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5);
  }
  console.log('OK: fallo y reintento, concurrencia, cambio de sesión, estados simultáneos, tomas en agenda y contraste.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
