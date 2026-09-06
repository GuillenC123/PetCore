// Valida antes de ejecutar SQL; mantiene { error } compatible con el cliente.
function validar(esquema, { origen = 'body', obligatorios = [], parcial = false } = {}) {
  return (req, res, next) => {
    const datos = req[origen];
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
      return res.status(400).json({ error: 'Se esperaba un objeto JSON.' });
    }

    const errores = {};
    const normalizados = {};
    for (const [nombre, regla] of Object.entries(esquema)) {
      const valor = datos[nombre];
      if (valor === undefined) {
        if (obligatorios.includes(nombre)) errores[nombre] = 'Este campo es obligatorio.';
        continue;
      }
      if (valor === null && regla.nullable) {
        normalizados[nombre] = null;
      } else if (!regla.validar(valor)) {
        errores[nombre] = regla.mensaje;
      } else {
        normalizados[nombre] = regla.normalizar ? regla.normalizar(valor) : valor;
      }
    }

    if (Object.keys(errores).length) {
      const nombre = Object.keys(errores)[0];
      return res.status(400).json({ error: `${nombre}: ${errores[nombre]}`, errores });
    }
    if (parcial && !Object.values(normalizados).some((valor) => valor !== null)) {
      return res.status(400).json({ error: 'Envía al menos un campo editable con un valor.' });
    }

    req[origen] = normalizados;
    next();
  };
}

module.exports = validar;
