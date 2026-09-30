const pool = require('../db');

// Ejecuta fn(conexion) en una conexión que lleva marcado quién hace el cambio (@actor_id).
// Los triggers de auditoría de la BD leen esa variable para registrar el autor. Si los triggers
// aún no la usan (migración pendiente), la variable simplemente se ignora.
async function conActor(req, fn) {
  const conexion = await pool.getConnection();
  try {
    await conexion.query('SET @actor_id = ?', [req.usuario.id_usuario]);
    return await fn(conexion);
  } finally {
    try { await conexion.query('SET @actor_id = NULL'); } catch (e) { /* la conexión se libera igual */ }
    conexion.release();
  }
}

module.exports = { conActor };
