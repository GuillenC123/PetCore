const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function cargar(archivo, resolver) {
  const mod = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require','module','exports',js)(resolver ?? (nombre => cargar(`src/utils/${nombre.replace('./','')}.ts`)),mod,mod.exports);
  return mod.exports;
}
const util = cargar('src/utils/fecha-selector.ts');
const fecha = new Date(2028, 1, 9, 8, 5);
assert.equal(util.formatearSelector(fecha,'date'),'09/02/2028');
assert.equal(util.formatearSelector(fecha,'time'),'08:05');
assert.equal(util.valorWeb('09/02/2028','date'),'2028-02-09');
assert.equal(util.desdeWeb('2028-02-09','date'),'09/02/2028');
assert.equal(util.desdeWeb('','date'),'');
assert.equal(util.valorWeb('','time'),'');
assert.equal(util.valorSelector('29/02/2028','date').getDate(),29);
assert.equal(util.valorSelector('08:05','time').getHours(),8);
assert.equal(util.valorSelector('08:05','time').getMinutes(),5);
assert.equal(util.valorSelector('','date',fecha),fecha);
const { default: WebField } = cargar('src/components/DateTimeField.web.tsx', nombre => nombre === '@/utils/fecha-selector' ? util : require(nombre));
let valor;
const props = {mode:'date',value:'09/02/2028',label:'Fecha',onChange:v=>{valor=v;}};
const arbol = WebField(props);
const input = arbol.props.children[0];
assert.equal(input.props.type,'date');
assert.equal(input.props.value,'2028-02-09');
input.props.onChange({target:{value:'2028-03-01'}});
assert.equal(valor,'01/03/2028');
arbol.props.children[1].props.onClick();
assert.equal(valor,'');
const hora = WebField({...props,mode:'time',value:'08:05'}).props.children[0];
assert.equal(hora.props.type,'time');
hora.props.onChange({target:{value:'09:06'}});
assert.equal(valor,'09:06');
console.log('OK: formato automatico, fechas locales, bisiestos, seleccion web y borrado.');
