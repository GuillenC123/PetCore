const FUENTES = {
  Perro: { clase: 'Q39367' },
  Gato: { clase: 'Q43577' },
};

function nombreRaza(valor) {
  if (typeof valor !== 'string' || !valor.trim() || valor.length > 120 || valor.includes('\0')) {
    throw new Error('Nombre de raza inválido.');
  }
  const nombre = valor.trim().replace(/\s+/g, ' ');
  return nombre.charAt(0).toLocaleUpperCase('es') + nombre.slice(1);
}

function razasEnEspanol(datos) {
  if (!Array.isArray(datos?.results?.bindings)) {
    throw new Error('Catálogo en español inválido.');
  }
  // Comprueba también el idioma de la respuesta: nunca usa una etiqueta inglesa
  // como sustituto si una raza no tiene nombre en español.
  return datos.results.bindings.filter((fila) => fila?.nombre?.['xml:lang'] === 'es')
    .map((fila) => nombreRaza(fila.nombre.value));
}

/** Caché compartida por especie, con una sola consulta externa simultánea. */
function crearCatalogoRazas({ transporte = fetch, ahora = Date.now, ttl = 24 * 60 * 60 * 1000, espera = 6000 } = {}) {
  const cache = new Map();
  const pendientes = new Map();
  const fallos = new Map();
  async function consultar(url, signal) {
    const respuesta = await transporte(url, { signal, headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'PetCore/1.0 (local pet-care application; breed catalog)',
    } });
    if (!respuesta.ok) throw new Error('El proveedor de razas no está disponible.');
    return respuesta.json();
  }
  async function descargar(especie) {
    const signal = AbortSignal.timeout(espera);
    // La clase procede de una lista fija; nunca se inserta texto del usuario.
    const query = `SELECT DISTINCT ?raza ?nombre WHERE {
      ?raza wdt:P31/wdt:P279* wd:${FUENTES[especie].clase}; rdfs:label ?nombre.
      FILTER(LANG(?nombre) = "es")
    } ORDER BY LCASE(?nombre) LIMIT 1000`;
    const url = `https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: 'json' })}`;
    const nombres = razasEnEspanol(await consultar(url, signal));
    const razas = [...new Set(nombres)].sort((a, b) => a.localeCompare(b, 'es'));
    if (!razas.length || razas.length > 1000) throw new Error('Catálogo de razas vacío o inválido.');
    return { especie, razas, idioma: 'es', fuente: 'Wikidata (español)', urlFuente: 'https://www.wikidata.org/wiki/Wikidata:Data_access/es',
      actualizadoEn: new Date(ahora()).toISOString(), desactualizado: false };
  }
  async function obtener(especie) {
    if (!Object.hasOwn(FUENTES, especie)) throw new Error('Especie no admitida.');
    const anterior = cache.get(especie);
    if (anterior && ahora() - Date.parse(anterior.actualizadoEn) < ttl) return anterior;
    // Un fallo no provoca una llamada externa en cada apertura del formulario.
    if (fallos.get(especie) > ahora()) {
      if (anterior) return { ...anterior, desactualizado: true };
      throw new Error('No se pudo cargar el catálogo de razas.');
    }
    if (pendientes.has(especie)) return pendientes.get(especie);
    const consulta = descargar(especie).then((datos) => {
      cache.set(especie, datos); fallos.delete(especie); return datos;
    }).catch(() => {
      fallos.set(especie, ahora() + 60000);
      if (anterior) return { ...anterior, desactualizado: true };
      throw new Error('No se pudo cargar el catálogo de razas.');
    }).finally(() => pendientes.delete(especie));
    pendientes.set(especie, consulta);
    return consulta;
  }
  return { obtener };
}

module.exports = { crearCatalogoRazas, catalogoRazas: crearCatalogoRazas() };
