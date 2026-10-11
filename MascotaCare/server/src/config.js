const dotenv = require('dotenv');

dotenv.config();

function valorRequerido(entorno, nombre) {
  const valor = entorno[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno obligatoria ${nombre}.`);
  return valor;
}

function puertoValido(valor) {
  if (valor === undefined || valor === '') return 4000;
  const puerto = Number(valor);
  if (!Number.isSafeInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }
  return puerto;
}

function origenesPermitidos(valor = '') {
  const origenes = valor.split(',').map((origen) => origen.trim()).filter(Boolean);
  if (origenes.includes('*')) {
    throw new Error('CORS_ORIGINS no puede contener "*". Declara los orígenes permitidos explícitamente.');
  }
  return origenes.map((origen) => {
    let url;
    try {
      url = new URL(origen);
    } catch {
      throw new Error(`CORS_ORIGINS contiene un origen inválido: ${origen}.`);
    }
    if (url.origin !== origen) {
      throw new Error(`CORS_ORIGINS no admite rutas: ${origen}.`);
    }
    return origen;
  });
}

/** Lee y valida la configuración antes de aceptar solicitudes. */
function obtenerConfiguracion(entorno = process.env) {
  const databaseUrl = valorRequerido(entorno, 'DATABASE_URL');
  try {
    const protocolo = new URL(databaseUrl).protocol;
    if (protocolo !== 'postgres:' && protocolo !== 'postgresql:') throw new Error('protocolo');
  } catch {
    throw new Error('DATABASE_URL debe ser una URL de PostgreSQL válida.');
  }

  const jwtSecret = valorRequerido(entorno, 'JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }

  return {
    databaseUrl,
    jwtSecret,
    jwtExpiresIn: entorno.JWT_EXPIRES_IN?.trim() || '7d',
    port: puertoValido(entorno.PORT),
    corsOrigins: origenesPermitidos(entorno.CORS_ORIGINS),
  };
}

module.exports = { obtenerConfiguracion };
