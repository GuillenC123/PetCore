/** Reglas de formularios alineadas con server/src/validation y schema.sql. */
export function validarTexto(valor: string, maximo: number, minimo = 1): string | undefined {
  const longitud = [...valor.trim()].length;
  if (valor.includes('\0') || longitud < minimo || longitud > maximo) {
    return `Ingresa entre ${minimo} y ${maximo} caracteres.`;
  }
}

export function validarCorreo(valor: string): string | undefined {
  if (validarTexto(valor, 254) || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(valor.trim())) {
    return 'Ingresa un correo válido de hasta 254 caracteres.';
  }
}

/** Nombre personal: letras Unicode (incluidas tildes y ñ) y espacios. */
export function validarNombrePerfil(valor: string): string | undefined {
  const nombre = valor.normalize('NFC').trim();
  if (validarTexto(nombre, 120, 2)) {
    return 'El nombre es obligatorio y debe tener entre 2 y 120 caracteres.';
  }
  if (!/^\p{L}[\p{L}\p{M} ]*$/u.test(nombre)) {
    return 'El nombre solo puede contener letras, espacios y tildes.';
  }
}

export function validarPassword(valor: string): string | undefined {
  // bcrypt admite hasta 72 bytes; contar caracteres no basta para tildes/emojis.
  const bytes = [...valor].reduce((total, caracter) => {
    const codigo = caracter.codePointAt(0)!;
    return total + (codigo <= 0x7f ? 1 : codigo <= 0x7ff ? 2 : codigo <= 0xffff ? 3 : 4);
  }, 0);
  if (valor.length < 6 || bytes > 72) {
    return 'La contraseña debe tener al menos 6 caracteres y como máximo 72 bytes UTF-8.';
  }
}
