// Las pruebas antiguas aíslan las reglas del contexto. El flujo real se prueba
// por separado en test-api-estados.cjs con el hook y los servicios reales.
exports.useCargaDatos = (aplicarDatos) => ({
  estadoDatos: { estado: 'listo', error: null, datosDisponibles: true },
  cargarDatos: async () => {},
  iniciarCarga: async (_token, demo) => { if (demo) aplicarDatos(demo); },
  reiniciarCarga: () => {},
});
