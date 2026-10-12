const { conActor } = require('./actor');

// Activa o desactiva una cuenta y mantiene sincronizado a su trabajador vinculado:
// un usuario desactivado no debe seguir figurando como trabajador activo (tareas, pagos),
// y al reactivarlo vuelve a figurar como activo. Todo en una sola transacción.
// Devuelve las filas afectadas de la cuenta (0 si no existe).
async function cambiarEstadoCuenta(req, idUsuario, activo) {
  return conActor(req, async (conexion) => {
    await conexion.beginTransaction();
    try {
      const [resultado] = await conexion.query('UPDATE usuarios SET activo = ? WHERE id_usuario = ?', [activo ? 1 : 0, idUsuario]);
      await conexion.query(
        `UPDATE trabajadores t
         JOIN usuarios u ON u.id_trabajador = t.id_trabajador
         SET t.estado = ?
         WHERE u.id_usuario = ?`,
        [activo ? 'activo' : 'inactivo', idUsuario]
      );
      await conexion.commit();
      return resultado.affectedRows;
    } catch (error) {
      await conexion.rollback();
      throw error;
    }
  });
}

module.exports = { cambiarEstadoCuenta };
