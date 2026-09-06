// Reglas de entrada acordes con los tipos y límites de server/db/schema.sql.
const { Buffer } = require('node:buffer');

const texto = (max, min = 1) => (valor) =>
  typeof valor === 'string' && !valor.includes('\0') &&
  [...valor.trim()].length >= min && [...valor.trim()].length <= max;

function id(valor) {
  if (typeof valor === 'number' && !Number.isSafeInteger(valor)) return false;
  if (typeof valor !== 'string' && typeof valor !== 'number') return false;
  return /^[1-9]\d{0,18}$/.test(String(valor)) && BigInt(valor) <= 9223372036854775807n;
}

function fecha(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return valor.slice(0, 4) !== '0000' && Number.isFinite(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor;
}

function fechaHora(valor) {
  return typeof valor === 'string' && fecha(valor.slice(0, 10)) &&
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(valor) &&
    Number.isFinite(Date.parse(valor));
}

const campo = (validar, mensaje, opciones = {}) => ({ validar, mensaje, ...opciones });
const cadena = (max, min = 1, opciones = {}) => campo(
  texto(max, min), `Debe ser un texto de ${min} a ${max} caracteres.`,
  { normalizar: (valor) => valor.trim(), ...opciones }
);
const enumeracion = (valores) => campo(
  (valor) => valores.includes(valor), `Valores permitidos: ${valores.join(', ')}.`
);
const identificador = campo(id, 'Debe ser un identificador entero positivo válido.');
const correo = campo(
  (valor) => texto(254)(valor) && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(valor.trim()),
  'Ingresa un correo válido de hasta 254 caracteres.',
  { normalizar: (valor) => valor.trim().toLowerCase() }
);
const password = campo(
  (valor) => typeof valor === 'string' && valor.length >= 6 && Buffer.byteLength(valor, 'utf8') <= 72,
  'La contraseña debe tener al menos 6 caracteres y como máximo 72 bytes UTF-8.'
);

module.exports = { campo, cadena, enumeracion, identificador, correo, password, fecha, fechaHora };
