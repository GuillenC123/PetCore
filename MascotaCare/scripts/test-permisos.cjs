const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file,resolve){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(resolve,module,module.exports);return module.exports}
(async()=>{
 let os='android',requested=0,settings=0,imports=0;const events=[];
 let permission={granted:false,canAskAgain:true,status:'undetermined'};
 const native={Platform:{get OS(){return os}},Linking:{openSettings:async()=>settings++}};
 const picker={getCameraPermissionsAsync:async()=>permission,requestCameraPermissionsAsync:async()=>{requested++;return permission}};
 // Ejecuta el adaptador real de Expo: en Android el puente recibe android.
 const sdk=load('node_modules/expo-notifications/src/NotificationPermissions.ts',n=>n==='expo'
  ? {Platform:native.Platform,PermissionStatus:{GRANTED:'granted'},UnavailabilityError:Error}
  : n==='./NotificationPermissionsModule' ? {__esModule:true,default:{getPermissionsAsync:async()=>permission,requestPermissionsAsync:async options=>{assert.deepEqual(options,{},'Android debe recibir un objeto de opciones, no undefined');events.push('solicitar');return permission}}} : require(n));
 const notifications={AndroidImportance:{HIGH:4},getPermissionsAsync:async()=>permission,setNotificationChannelAsync:async()=>events.push('canal'),requestPermissionsAsync:sdk.requestPermissionsAsync};
 const p=load('src/services/permisos.ts',n=>n==='react-native'?native:n==='expo-image-picker'?picker:n==='@/services/notificaciones-locales-api'?(imports++,notifications):require(n));
 assert.equal(await p.consultarPermiso('camara'),'pendiente');assert.equal(requested,0);
 assert.equal(await p.solicitarPermiso('camara'),'pendiente');assert.equal(requested,1);
 permission={granted:false,canAskAgain:true,status:'denied'};assert.equal(await p.solicitarPermiso('camara'),'denegado');
 permission={granted:false,canAskAgain:false,status:'denied'};const before=requested;assert.equal(await p.solicitarPermiso('camara'),'bloqueado');assert.equal(requested,before);
 await p.abrirAjustesPermisos();assert.equal(settings,1);
 permission={granted:true,canAskAgain:true,status:'granted'};assert.equal(await p.solicitarPermiso('camara'),'permitido');assert.equal(requested,before);
 assert.equal(p.estadoPermiso({granted:false,canAskAgain:true,status:'denied',ios:{status:3}}),'permitido');
 permission={granted:false,canAskAgain:true,status:'undetermined'};await p.solicitarPermiso('notificaciones');assert.deepEqual(events,['canal','solicitar']);
 os='web';const previous=imports;assert.equal(await p.solicitarPermiso('notificaciones'),'no_disponible');assert.equal(await p.consultarPermiso('camara'),'no_disponible');assert.equal(imports,previous);
 os='android';let launches=0;
 const fotos=load('src/services/fotos.ts',n=>n==='react-native'?native:n==='./permisos'?{solicitarPermiso:async()=> 'bloqueado',PermisoCamaraError:p.PermisoCamaraError}:n==='expo-image-picker'?{launchCameraAsync:async()=>launches++}:{});
 await assert.rejects(fotos.seleccionarFoto('camara'),e=>e instanceof p.PermisoCamaraError&&e.bloqueado);assert.equal(launches,0);
 console.log('OK: permisos concedidos, rechazo, bloqueo, Ajustes, canal Android, autorización provisional y alternativa web.');
})().catch(e=>{console.error(e);process.exitCode=1});
