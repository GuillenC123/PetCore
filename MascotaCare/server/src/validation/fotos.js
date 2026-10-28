const { campo } = require('./reglas');

const MAX_BYTES = 512 * 1024;
function esFoto(valor) {
  if (typeof valor !== 'string') return false;
  // Compatibilidad con las imágenes de mascotas existentes.
  if (!valor.startsWith('data:')) return valor.length <= 500 && !valor.includes('\0');
  const prefijo = 'data:image/jpeg;base64,';
  if (!valor.startsWith(prefijo) || valor.length > prefijo.length + 4 * Math.ceil(MAX_BYTES / 3)) return false;
  const base64 = valor.slice(prefijo.length);
  if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return false;
  const contenido = Buffer.from(base64, 'base64');
  return contenido.length >= 4 && contenido.length <= MAX_BYTES && contenido.toString('base64') === base64 &&
    contenido[0] === 0xff && contenido[1] === 0xd8 &&
    contenido[contenido.length - 2] === 0xff && contenido[contenido.length - 1] === 0xd9;
}

const foto = campo(esFoto, 'Selecciona una foto JPEG válida de hasta 512 KB.', { nullable: true });
module.exports = { foto, esFoto };
