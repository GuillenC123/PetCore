const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const {crearReact, crearCargador, crearAlmacenamiento} = require('./helpers/react-cargador.cjs');
const palettes = crearCargador(crearReact().react)('src/constants/theme.ts');
const flush = () => new Promise(resolve=>setImmediate(resolve));
function fixture(saved, failWrite=false) {
 const h=crearReact(), storage=crearAlmacenamiento();
 if(saved!==undefined)storage.valores.set('petcore.appearance',saved);
 if(failWrite)storage.setItem=async()=>{throw Error('sin almacenamiento')};
 let system='light';const overrides=[];
 const react={...h.react,useMemo:(fn,deps)=>h.react.useCallback(fn,deps)()};
 const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('src/context/AppearanceContext.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)((n)=>{
  if(n==='react')return react;
  if(n==='react-native')return {Platform:{OS:'android'},Appearance:{setColorScheme:s=>overrides.push(s)}};
  if(n==='expo-system-ui')return {setBackgroundColorAsync:async()=>{}};
  if(n==='@react-native-async-storage/async-storage')return {__esModule:true,default:storage};
  if(n==='@/constants/theme')return palettes;
  if(n==='@/hooks/use-color-scheme')return {useColorScheme:()=>system};
  return require(n);
 },mod,mod.exports);
 return {storage,overrides,unmount:h.unmount,system:s=>{system=s},render:()=>h.render(()=>mod.exports.AppearanceProvider({children:null})).props.value};
}
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
(async()=>{
 const f=fixture('dark');assert.equal(f.render().ready,false);await flush();
 let value=f.render();assert.equal(value.scheme,'dark');assert.equal(value.colors.background,palettes.DarkAppColors.background);
 value.setPreference('light');value=f.render();await flush();assert.equal(value.scheme,'light');assert.equal(f.storage.valores.get('petcore.appearance'),'light');
 value.setPreference('system');f.system('dark');value=f.render();await flush();assert.equal(value.scheme,'dark');assert.equal(f.overrides.at(-1),'auto');
 f.system('light');assert.equal(f.render().scheme,'light');
 value=f.render();value.setPreference('dark');value.setPreference('light');value.setPreference('dark');f.render();await flush();assert.equal(f.storage.valores.get('petcore.appearance'),'dark');
 const reload=fixture(f.storage.valores.get('petcore.appearance'));reload.render();await flush();assert.equal(reload.render().scheme,'dark');
 const invalid=fixture('invalido');invalid.render();await flush();assert.equal(invalid.render().preference,'system');
 const failed=fixture('light',true);failed.render();await flush();failed.render().setPreference('dark');await flush();assert.equal(failed.render().scheme,'dark');assert.equal(failed.render().storageError,true);
 for(const palette of [palettes.AppColors,palettes.DarkAppColors]){
  for(const key of ['text','textSecondary','accent'])assert.ok(contrast(palette[key],palette.surface)>=4.5,`${key} contraste insuficiente`);
  assert.ok(contrast(palette.onPrimary,palette.primaryDark)>=4.5);
  for(const tone of ['success','danger','info','warning','purple','teal','orange'])assert.ok(contrast(palette[tone],palette[tone+'Soft'])>=4.5,`${tone} contraste insuficiente`);
 }
 [f,reload,invalid,failed].forEach(x=>x.unmount());
 console.log('OK: restauración, persistencia, modo del sistema, errores de almacenamiento y contraste en ambos temas.');
})().catch(error=>{console.error(error);process.exitCode=1});
