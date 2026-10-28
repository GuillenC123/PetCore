const { Router } = require('express');
const { catalogoRazas } = require('../services/razas');

function crearRouterRazas(catalogo = catalogoRazas) {
  const router = Router();
  router.get('/', async (req, res) => {
    const especie = req.query.especie;
    if (especie !== 'Perro' && especie !== 'Gato') {
      return res.status(400).json({ error: 'Selecciona Perro o Gato para consultar las razas.' });
    }
    try {
      res.json(await catalogo.obtener(especie));
    } catch {
      res.status(503).json({ error: 'No se pudo cargar la lista. Puedes elegir Mestizo / sin raza definida o escribir otra raza.' });
    }
  });
  return router;
}
module.exports = { crearRouterRazas };
