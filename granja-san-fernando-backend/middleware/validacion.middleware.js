const { validationResult } = require('express-validator');

// Se coloca después de las reglas de validación en cualquier ruta.
// Si algún campo no cumplió las reglas, corta la petición aquí con un mensaje claro.
function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      error: errores.array()[0].msg, // el primer error, para mostrarlo directo en pantalla
      detalles: errores.array(), // la lista completa, por si se necesita mostrar varios
    });
  }
  next();
}

module.exports = { validar };