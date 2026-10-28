const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),pkg=path.join(root,'node_modules/expo-notifications');
function graph(entry,platform){
 const seen=new Set();
 function resolve(base){for(const ext of [`.${platform}.js`,'.native.js','.js','.ts']){if(fs.existsSync(base+ext))return base+ext}if(fs.existsSync(base)&&fs.statSync(base).isFile())return base;throw Error('No se resolvió '+base)}
 function visit(file){if(seen.has(file))return;seen.add(file);const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  for(const node of source.statements){if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))continue;
   if(node.isTypeOnly||node.importClause?.isTypeOnly||!node.moduleSpecifier)continue;
   const spec=node.moduleSpecifier.text;
   if(spec.startsWith('expo-notifications/build/'))visit(resolve(path.join(pkg,spec.slice('expo-notifications/'.length))));
   else if(spec==='expo-notifications')visit(resolve(path.join(pkg,'build/index')));
   else if(spec.startsWith('.'))visit(resolve(path.resolve(path.dirname(file),spec)));
  }
 }
 visit(entry);return seen;
}
for(const platform of ['android','ios']){
 const files=[...graph(path.join(root,'src/services/notificaciones-locales-api.ts'),platform)];
 assert.ok(files.some(file=>file.endsWith('NotificationPermissions.js')));
 assert.ok(files.some(file=>file.endsWith('scheduleNotificationAsync.js')));
 assert.ok(files.some(file=>file.endsWith('NotificationsEmitter.js')));
 assert.ok(!files.some(file=>/TopicSubscription|topicSubscription|PushToken|ServerRegistration|registerTask/.test(file)),`${platform}: se cargó una función remota`);
 assert.ok(!files.includes(path.join(pkg,'build/index.js')));
}
// Control: la misma revisión reproduce la dependencia problemática del índice.
assert.ok([...graph(path.join(pkg,'build/index.js'),'android')].some(file=>file.endsWith('TopicSubscriptionModule.android.js')));
for(const file of ['src/services/permisos.ts','src/services/avisos-dispositivo.ts','src/context/LocalNotificationsContext.tsx']){
 const text=fs.readFileSync(path.join(root,file),'utf8');assert.ok(!text.includes("import('expo-notifications')"),file);
}
console.log('OK: las funciones locales de Android/iOS no cargan el módulo remoto ausente en Expo Go; el índice original reproduce la dependencia.');
