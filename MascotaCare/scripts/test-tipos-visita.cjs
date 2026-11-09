const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { crearReact, crearCargador } = require('./helpers/react-cargador.cjs');

const cargar = crearCargador(crearReact().react);
const { TIPOS_VISITA, esTipoVisita, etiquetaTipoVisita } = cargar('src/utils/tipos-visita.ts');
const { crearAgenda } = cargar('src/utils/agenda.ts');
const { crearHistorial } = cargar('src/utils/historial.ts');
const { crearAvisosLocales } = cargar('src/utils/avisos-locales.ts');
const { prepararDatosCache } = cargar('src/utils/cache.ts');
const api = cargar('src/services/api.ts');
const ahora = new Date(2026, 10, 8, 12).getTime();
const mascota = { id: 1, nombre: 'Luna', raza: 'Mestiza', especie: 'Perro', edad: '3 años', imagen: null, estado: 'saludable' };
const citaBase = { id: 10, mascota_id: 1, titulo: 'Visita', fecha_hora: new Date(ahora + 86400000).toISOString(), doctor: null, clinica: null, estado: 'programado' };

function componenteCarnet(citas, citaId) {
  const hooks = crearReact();
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/components/VaccineRecord.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)((name) => {
    if (name === 'react') return hooks.react;
    if (name === 'react-native') return { StyleSheet: { create: value => value }, View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', Image: 'Image' };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === '@/context/AppearanceContext') return { useAppColors: () => ({}) };
    if (name === '@/context/AuthContext') return { useAuth: () => ({ citas }) };
    if (name === '@/context/HealthEditContext') return { useFormularioSalud: () => ({ descartar: fn => fn() }) };
    if (name === '@/hooks/use-ahora') return { useAhora: () => ahora };
    if (name.startsWith('@/utils/')) return cargar(`src/utils/${name.slice(8)}.ts`);
    if (name.startsWith('./')) return { __esModule: true, default: name };
    return require(name);
  }, mod, mod.exports);
  const render = () => hooks.render(() => mod.exports.default({ mascota, citaId }));
  return { render, unmount: hooks.unmount };
}
function buscar(nodo, predicate) {
  if (!nodo || typeof nodo !== 'object') return [];
  if (Array.isArray(nodo)) return nodo.flatMap(value => buscar(value, predicate));
  return [...(predicate(nodo) ? [nodo] : []), ...buscar(nodo.props?.children, predicate)];
}

(async () => {
  assert.equal(TIPOS_VISITA.length, 6);
  assert.equal(esTipoVisita('vacunacion'), true);
  assert.equal(esTipoVisita('enfermo'), false);
  assert.equal(esTipoVisita(null), false);
  const fetchOriginal = global.fetch;
  try {
    for (const { value, label } of TIPOS_VISITA) {
      const cita = { ...citaBase, tipo_visita: value };
      const datos = { mascotas: [mascota], citas: [cita], recordatorios: [] };
      const copia = prepararDatosCache(datos);
      assert.equal(copia.citas[0].tipo_visita, value);
      assert.equal(crearAgenda(copia.citas, [], [])[0].tipo_visita, value);
      assert.equal(crearHistorial(mascota, [{ ...cita, estado: 'completado', fecha_hora: new Date(ahora - 1000).toISOString() }], [], ahora)[0].tipo, label);
      const avisos = crearAvisosLocales('api:1', [mascota], [cita], [], [], ahora);
      assert.equal(avisos[0].title, `${value === 'otro' ? 'Visita veterinaria' : label} · Luna`);
      global.fetch = async (_url, opciones) => {
        assert.equal(JSON.parse(opciones.body).tipo_visita, value);
        return new Response(JSON.stringify({ cita, mascota, recordatorio: { id: 20, mascota_id: 1, cita_id: 10, titulo: 'Visita', descripcion: '', tipo: 'cita', vence_en: cita.fecha_hora, completado: false } }));
      };
      const respuesta = await api.apiCrearCita('token', { ...cita, titulo: label });
      assert.equal(respuesta.cita.tipo_visita, value);
      assert.equal(respuesta.mascota.estado, 'saludable');
    }
    assert.equal(prepararDatosCache({ mascotas: [mascota], citas: [citaBase], recordatorios: [] }).citas[0].tipo_visita, undefined);
    assert.equal(etiquetaTipoVisita(undefined), 'Visita veterinaria');
    assert.throws(() => prepararDatosCache({ mascotas: [mascota], citas: [{ ...citaBase, tipo_visita: 'inventado' }], recordatorios: [] }));
    global.fetch = async () => new Response(JSON.stringify([{ ...citaBase, tipo_visita: 'inventado' }]));
    await assert.rejects(api.apiGetCitas('token'), error => error.tipo === 'respuesta');
  } finally { global.fetch = fetchOriginal; }

  // Un enlace solo prepara la aplicación de una visita realizada de esa mascota.
  const realizada = { ...citaBase, estado: 'completado', tipo_visita: 'vacunacion', fecha_hora: new Date(ahora - 86400000).toISOString() };
  for (const tipo of ['vacunacion', 'desparasitacion']) {
    const fixture = componenteCarnet([{ ...realizada, tipo_visita: tipo }], '10');
    const editor = buscar(fixture.render(), node => typeof node.type === 'function' && node.type.name === 'Formulario')[0];
    assert.ok(editor);
    assert.equal(editor.props.edicion.tipoInicial, tipo === 'vacunacion' ? 'vacuna' : 'desparasitacion');
    assert.equal(editor.props.edicion.visitaOrigen.id, 10);
    assert.equal(editor.props.edicion.datos?.nombre, undefined);
    editor.props.cerrar(false);
    assert.equal(buscar(fixture.render(), node => typeof node.type === 'function' && node.type.name === 'Formulario').length, 0);
    fixture.unmount();
  }
  for (const cita of [{ ...realizada, mascota_id: 2 }, { ...realizada, estado: 'programado' }, { ...realizada, tipo_visita: 'control_preventivo' }, { ...realizada, fecha_hora: '2099-01-01T00:00:00Z' }]) {
    const fixture = componenteCarnet([cita], '10');
    assert.equal(buscar(fixture.render(), node => typeof node.type === 'function' && node.type.name === 'Formulario').length, 0);
    fixture.unmount();
  }
  console.log('OK: seis tipos en API/caché/agenda/historial/avisos, compatibilidad y carnet desde visita validada sin aplicación automática.');
})().catch(error => { console.error(error); process.exitCode = 1; });
