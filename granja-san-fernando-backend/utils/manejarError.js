// Responde al cliente sin filtrar detalles internos de MySQL (nombres de tablas/columnas,
// sintaxis SQL, mensajes del driver). El error real siempre se registra en el servidor.
//
// Excepción: cuando el error viene de un SIGNAL SQLSTATE '45000' lanzado por un trigger
// de la base de datos (ej. "la cantidad vendida supera la existencia disponible"), ese
// mensaje SÍ está pensado para mostrarse al usuario -- es una validación de negocio, no
// un detalle técnico -- así que se muestra tal cual.
function manejarError(res, error, mensaje = 'No se pudo completar la operación') {
  console.error(error);

  if (error.sqlState === '45000' && error.sqlMessage) {
    return res.status(400).json({ error: error.sqlMessage });
  }

  res.status(500).json({ error: mensaje });
}

module.exports = { manejarError };
