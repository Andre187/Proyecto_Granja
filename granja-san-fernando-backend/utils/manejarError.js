// Responde al cliente sin filtrar detalles internos de MySQL (nombres de tablas/columnas,
// sintaxis SQL, mensajes del driver). El error real se registra en el servidor, pero SIN el
// texto SQL completo (error.sql), porque puede incluir valores como hashes de contraseña.
//
// Excepción: cuando el error viene de un SIGNAL SQLSTATE '45000' lanzado por un trigger
// de la base de datos (ej. "la cantidad vendida supera la existencia disponible"), ese
// mensaje SÍ está pensado para mostrarse al usuario -- es una validación de negocio, no
// un detalle técnico -- así que se muestra tal cual.
function registrarError(error) {
  console.error(error.code || error.name, '|', error.sqlMessage || error.message, '\n', error.stack);
}

// Errores de datos de MySQL que son culpa de lo enviado (400), no del servidor (500)
const ERRORES_DE_DATOS = {
  ER_NO_REFERENCED_ROW_2: 'Uno de los datos seleccionados no existe',
  ER_DATA_TOO_LONG: 'Un dato supera la longitud permitida',
  ER_WARN_DATA_OUT_OF_RANGE: 'Un número está fuera del rango permitido',
  ER_TRUNCATED_WRONG_VALUE: 'Un dato tiene un formato inválido',
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: 'Un dato tiene un formato inválido',
  ER_CHECK_CONSTRAINT_VIOLATED: 'La operación dejaría un valor inválido (por ejemplo, existencia negativa)',
};

function manejarError(res, error, mensaje = 'No se pudo completar la operación') {
  registrarError(error);

  if (error.sqlState === '45000' && error.sqlMessage) {
    return res.status(400).json({ error: error.sqlMessage });
  }

  if (ERRORES_DE_DATOS[error.code]) {
    return res.status(400).json({ error: ERRORES_DE_DATOS[error.code] });
  }

  res.status(500).json({ error: mensaje });
}

module.exports = { manejarError, registrarError };
