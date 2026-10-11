const { test } = require('node:test');
const assert = require('node:assert/strict');

const { obtenerConfiguracion } = require('../src/config');

const entornoValido = {
  DATABASE_URL: 'postgres://usuario:password@localhost:5432/mascotacare_test',
  JWT_SECRET: 'secreto-de-prueba-con-al-menos-treinta-y-dos-caracteres',
};

test('requiere DATABASE_URL y JWT_SECRET seguros', () => {
  assert.throws(() => obtenerConfiguracion({ ...entornoValido, DATABASE_URL: '' }), /DATABASE_URL/);
  assert.throws(() => obtenerConfiguracion({ ...entornoValido, JWT_SECRET: '' }), /JWT_SECRET/);
  assert.throws(() => obtenerConfiguracion({ ...entornoValido, JWT_SECRET: 'demasiado-corto' }), /32 caracteres/);
});

test('valida URL, puerto y lista de orígenes CORS', () => {
  assert.throws(() => obtenerConfiguracion({ ...entornoValido, DATABASE_URL: 'mysql://localhost/db' }), /PostgreSQL/);
  assert.throws(() => obtenerConfiguracion({ ...entornoValido, PORT: '0' }), /PORT/);
  assert.throws(() => obtenerConfiguracion({ ...entornoValido, CORS_ORIGINS: '*' }), /no puede contener/);
  assert.deepEqual(obtenerConfiguracion({
    ...entornoValido, PORT: '4001', CORS_ORIGINS: 'http://localhost:8081,https://petcore.example',
  }), {
    databaseUrl: entornoValido.DATABASE_URL,
    jwtSecret: entornoValido.JWT_SECRET,
    jwtExpiresIn: '7d',
    port: 4001,
    corsOrigins: ['http://localhost:8081', 'https://petcore.example'],
  });
});
