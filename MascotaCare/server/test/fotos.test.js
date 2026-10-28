const { test } = require('node:test');
const assert = require('node:assert/strict');
const { esFoto } = require('../src/validation/fotos');

test('valida contenido, formato y tamaño de fotos', () => {
  const imagen = (bytes) => `data:image/jpeg;base64,${bytes.toString('base64')}`;
  assert.equal(esFoto('https://example.com/foto.jpg'), true);
  assert.equal(esFoto(imagen(Buffer.from([255, 216, 255, 217]))), true);
  assert.equal(esFoto('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(esFoto('data:image/jpeg;base64,aG9sYQ=='), false);
  assert.equal(esFoto('data:image/jpeg;base64,/9j/2Q='), false);
  assert.equal(esFoto('data:image/jpeg;base64,'), false);
  assert.equal(esFoto(123), false);
  const limite = Buffer.alloc(512 * 1024);
  limite[0] = 255; limite[1] = 216;
  limite[limite.length - 2] = 255; limite[limite.length - 1] = 217;
  assert.equal(esFoto(imagen(limite)), true);
  assert.equal(esFoto(imagen(Buffer.concat([limite, Buffer.from([0])]))), false);
});
