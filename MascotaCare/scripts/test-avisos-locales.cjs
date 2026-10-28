const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {crearReact,crearAlmacenamiento}=require('./helpers/react-cargador.cjs');
function load(file,resolver,extra={}){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.resolve(file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',...Object.keys(extra),code)(resolver,mod,mod.exports,...Object.values(extra));return mod.exports}
function pure(file){return load(file,n=>n.startsWith('.')?pure(path.resolve(path.dirname(file),n+'.ts')):require(n))}
const flush=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)}};
(async()=>{
 const u=pure('src/utils/avisos-locales.ts'),{crearSincronizadorAvisos}=pure('src/services/sincronizar-avisos.ts');
 const now=Date.now(),future=new Date(now+3600000).toISOString(),later=new Date(now+7200000).toISOString();
 const pets=[{id:'9223372036854775807',nombre:'Milo'}];
 const citas=[{id:1,mascota_id:pets[0].id,titulo:'Control',fecha_hora:future,estado:'programado'}, {id:2,fecha_hora:future,estado:'cancelado'}, {id:3,titulo:'Pasado',fecha_hora:new Date(now-1000).toISOString(),estado:'programado'}];
 const meds=[{id:5,mascota_id:pets[0].id,medicamento:'Dosis',indicaciones:'',tomas:[{fecha_hora:later,estado:'pendiente'},{fecha_hora:future,estado:'administrada'}]}];
 const reminders=[{id:6,mascota_id:pets[0].id,titulo:'Cita duplicada',cita_id:1,vence_en:future,completado:false},{id:7,titulo:'Agua',vence_en:later,completado:false},{id:8,titulo:'Terminado',vence_en:future,completado:true},{id:9,titulo:'Sin fecha',vence_en:null,completado:false}];
 const expected=u.crearAvisosLocales('api:1',pets,citas,meds,reminders,now);
 assert.equal(expected.length,3);assert.match(expected[0].title,/Milo/);assert.equal(u.leerDestinoAviso(expected[0].data,'api:1'),'cita-1');
 assert.equal(u.leerDestinoAviso(expected[1].data,'api:1'),expected[1].data.clave);
 assert.equal(u.leerDestinoAviso(expected[0].data,'api:2'),null);assert.equal(u.leerDestinoAviso({...expected[0].data,clave:'../../perfil'},'api:1'),null);
 assert.equal(u.propietarioAvisos(1,true),'demo:1');
 const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);const day=`${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
 const dateOnly=u.crearAvisosLocales('api:1',[],[],[],[{id:1,titulo:'Día',vence_en:day,completado:false}],now);assert.equal(new Date(dateOnly[0].fecha).getHours(),9);
 const many=Array.from({length:70},(_,i)=>({id:i,titulo:'Cuidado',vence_en:new Date(now+100000+i*1000).toISOString(),completado:false}));assert.equal(u.crearAvisosLocales('api:1',[],[],[],many,now).length,50);
 const scheduled=new Map(),calls=[];scheduled.set('ajeno',{identifier:'ajeno',content:{data:{}}});
 let failure=false,gate=null;
 const sync=crearSincronizadorAvisos({listar:async()=>[...scheduled.values()],cancelar:async id=>{calls.push(['cancel',id]);scheduled.delete(id)},programar:async a=>{if(gate){const g=gate;gate=null;await g.promise}if(failure)throw Error('fallo');calls.push(['add',a.identifier]);scheduled.set(a.identifier,{identifier:a.identifier,content:{data:a.data}})},limpiarEntregados:async()=>{}});
 await sync('api:1',expected);assert.equal(scheduled.size,4);const count=calls.length;await sync('api:1',expected);assert.equal(calls.length,count);
 const edited=expected.map((a,i)=>i? a:{...a,fecha:now+10800000,data:{...a.data,firma:'editado'}});await sync('api:1',edited);assert.equal(calls.length,count+2);
 scheduled.set('petcore:prueba:api:1',{identifier:'petcore:prueba:api:1',content:{data:{petcore:true,owner:'api:1',pruebaHasta:Date.now()+15000}}});
 await sync('api:1',edited,undefined,true);assert.equal(scheduled.size,5);
 await sync('api:1',edited);assert.equal(scheduled.size,4);
 await sync('api:1',null);assert.equal(scheduled.size,4); // recuperación conserva la misma cuenta
 await sync('api:2',null);assert.equal(scheduled.size,1); // cambio de cuenta elimina avisos antiguos
 failure=true;await assert.rejects(sync('api:1',expected));failure=false;await sync('api:1',expected);assert.equal(scheduled.size,4);
 await sync(null,[]);assert.equal(scheduled.size,1);assert.ok(scheduled.has('ajeno'));
 const held=deferred();gate=held;const pending=sync('api:1',expected);await flush();const logout=sync(null,[]);held.resolve();
 // resolver la promesa retenida de la programación anterior
 await Promise.all([pending,logout]);assert.equal(scheduled.size,1);
 // El proveedor real conecta preferencias, datos, permisos y apertura segura.
 const h=crearReact(),storage=crearAlmacenamiento(),syncs=[],routes=[];
 let auth={usuario:{id:1},modoDemo:false,mascotas:pets,citas,tratamientos:meds,recordatorios:reminders,estadoDatos:{datosDisponibles:true}};
 let listener=null,requests=0;
 const notifications={setNotificationHandler:()=>{},addNotificationResponseReceivedListener:fn=>{listener=fn;return {remove(){}}},getLastNotificationResponseAsync:async()=>null,clearLastNotificationResponseAsync:async()=>{}};
 const mod=load('src/context/LocalNotificationsContext.tsx',n=>{
  if(n==='react')return h.react;
  if(n==='react-native')return {Platform:{OS:'android'},AppState:{currentState:'active',addEventListener:()=>({remove(){}})}};
  if(n==='expo-router')return {router:{push:r=>routes.push(r)}};
  if(n==='expo-notifications')return notifications;
  if(n==='@react-native-async-storage/async-storage')return {__esModule:true,default:storage};
  if(n==='./AuthContext')return {useAuth:()=>auth};
  if(n==='@/services/permisos')return {consultarPermiso:async()=> 'permitido',solicitarPermiso:async()=>{requests++;return 'permitido'}};
  if(n==='@/services/avisos-dispositivo')return {sincronizarAvisosDispositivo:async(owner,list)=>{syncs.push([owner,list]);return list?.length??0}};
  if(n==='@/utils/avisos-locales')return u;
  if(n==='@/utils/agenda')return pure('src/utils/agenda.ts');
  return require(n);
 },{setInterval:()=>1,clearInterval:()=>{}});
 const render=()=>h.render(()=>mod.LocalNotificationsProvider({children:null})).props.value;
 render();await flush();assert.equal(render().habilitado,false);assert.equal(requests,0);
 await render().cambiar(true);render();await flush();assert.equal(render().habilitado,true);assert.equal(requests,1);assert.equal(storage.valores.get('petcore.avisos:api:1'),'true');assert.equal(syncs.at(-1)[1].length,3);
 listener({notification:{request:{identifier:expected[0].identifier,content:{data:expected[0].data}}}});render();assert.equal(routes.at(-1).pathname,'/cuidado');assert.equal(routes.at(-1).params.clave,'cita-1');
 listener({notification:{request:{identifier:'extra',content:{data:{...expected[0].data,owner:'api:2'}}}}});render();assert.equal(routes.length,1);
 await render().cambiar(false);render();assert.deepEqual(syncs.at(-1)[1],[]);
 auth={...auth,usuario:null};render();assert.equal(syncs.at(-1)[0],null);assert.deepEqual(syncs.at(-1)[1],[]);
 h.unmount();
 // Adaptador Expo real: trigger de fecha, canal, entrega y limpieza selectiva.
 const nativeScheduled=[],dismissed=[],nativeRequests=[];
 const nativeNotifications={SchedulableTriggerInputTypes:{DATE:'date'},getAllScheduledNotificationsAsync:async()=>nativeScheduled,
  cancelScheduledNotificationAsync:async()=>{},scheduleNotificationAsync:async request=>{nativeRequests.push(request)},
  getPresentedNotificationsAsync:async()=>[
   {request:{identifier:expected[0].identifier,content:{data:expected[0].data}}},
   {request:{identifier:'petcore:otra',content:{data:{petcore:true,owner:'api:2'}}}},
   {request:{identifier:'externa',content:{data:{}}}},
  ],dismissNotificationAsync:async id=>dismissed.push(id)};
 const adapter=load('src/services/avisos-dispositivo.ts',n=>n==='react-native'?{Platform:{OS:'android'}}:n==='./permisos'?{CANAL_CUIDADOS:'cuidados',prepararCanal:async()=>{}}:n==='./sincronizar-avisos'?{crearSincronizadorAvisos}:n==='expo-notifications'?nativeNotifications:require(n));
 await adapter.sincronizarAvisosDispositivo('api:1',expected,new Set(expected.map(x=>x.identifier)));
 assert.equal(nativeRequests.length,3);assert.equal(nativeRequests[0].trigger.type,'date');assert.equal(nativeRequests[0].trigger.delivery,'bestEffort');assert.equal(nativeRequests[0].trigger.date.getTime(),expected[0].fecha);assert.equal(nativeRequests[0].trigger.channelId,'cuidados');
 assert.deepEqual(dismissed,['petcore:otra']);
 console.log('OK: agenda futura, duplicados, fechas locales, límite, edición, cancelación, logout concurrente, aislamiento, reintento, permisos, preferencias y apertura del cuidado.');
})().catch(e=>{console.error(e);process.exitCode=1});
