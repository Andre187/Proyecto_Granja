const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verificarToken, soloSuperAdmin } = require('../middleware/auth.middleware');
const { manejarError } = require('../utils/manejarError');
const { conActor } = require('../utils/actor');
const { validarParametroId } = require('../utils/validadores');
const { esContrasenaSegura, MENSAJE_CONTRASENA_SEGURA } = require('../utils/contrasenaSegura');

const router = express.Router();

router.use(verificarToken, soloSuperAdmin);
validarParametroId(router);

// Escribe marcando quién hace el cambio (auditoría) y responde 404 si la cuenta no existe
async function actualizarUsuario(req, res, sql, parametros, mensaje) {
  const [resultado] = await conActor(req, (conexion) => conexion.query(sql, parametros));
  if (resultado.affectedRows === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  res.json({ mensaje });
}

// Lista TODOS los usuarios, incluyendo administradores y al propio superadministrador
router.get('/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id_usuario, u.usuario, u.nombre, u.apellido, u.rol, u.activo, u.id_trabajador, t.nombre AS trabajador_nombre
      FROM USUARIOS u
      LEFT JOIN TRABAJADORES t ON t.id_trabajador = u.id_trabajador
      ORDER BY FIELD(u.rol, 'superadministrador', 'administrador', 'operador'), u.usuario
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

// El superadministrador puede desactivar/reactivar cualquier cuenta,
// incluyendo administradores, sin las restricciones del módulo normal
// (esta es justamente la vía de emergencia sin candados).
router.put('/usuarios/:id/desactivar', async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.usuario.id_usuario) {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
    }
    await actualizarUsuario(req, res, 'UPDATE USUARIOS SET activo = 0 WHERE id_usuario = ?', [req.params.id], 'Usuario desactivado correctamente');
  } catch (error) {
    manejarError(res, error);
  }
});

router.put('/usuarios/:id/reactivar', async (req, res) => {
  try {
    await actualizarUsuario(req, res, 'UPDATE USUARIOS SET activo = 1 WHERE id_usuario = ?', [req.params.id], 'Usuario reactivado correctamente');
  } catch (error) {
    manejarError(res, error);
  }
});

// Resetea la contraseña de cualquier usuario, sin restricción de rol
router.put('/usuarios/:id/password', async (req, res) => {
  try {
    const { contrasena } = req.body;
    if (!esContrasenaSegura(contrasena)) {
      return res.status(400).json({ error: MENSAJE_CONTRASENA_SEGURA });
    }
    const hash = await bcrypt.hash(contrasena, 10);
    await actualizarUsuario(req, res, 'UPDATE USUARIOS SET contrasena = ? WHERE id_usuario = ?', [hash, req.params.id], 'Contraseña actualizada correctamente');
  } catch (error) {
    manejarError(res, error);
  }
});

// Cambia el rol de cualquier usuario, incluyendo ascender/descender de superadministrador
router.put('/usuarios/:id/rol', async (req, res) => {
  try {
    const { rol } = req.body;
    if (!['administrador', 'operador', 'superadministrador'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (parseInt(req.params.id) === req.usuario.id_usuario && rol !== 'superadministrador') {
      return res.status(400).json({ error: 'No puedes quitarte a ti mismo el rol de superadministrador' });
    }
    await actualizarUsuario(req, res, 'UPDATE USUARIOS SET rol = ? WHERE id_usuario = ?', [rol, req.params.id], 'Rol actualizado correctamente');
  } catch (error) {
    manejarError(res, error);
  }
});

// Registro de auditoría de cambios en usuarios
router.get('/auditoria', async (req, res) => {
  try {
    let rows;
    try {
      // Con la migración sql/02 la bitácora incluye quién hizo el cambio y qué cambió
      [rows] = await pool.query(`
        SELECT a.*, u.usuario AS actor
        FROM AUDITORIA_USUARIOS a
        LEFT JOIN USUARIOS u ON u.id_usuario = a.id_actor
        ORDER BY a.fecha_hora DESC, a.id_auditoria DESC LIMIT 100
      `);
    } catch (error) {
      if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
      [rows] = await pool.query('SELECT * FROM AUDITORIA_USUARIOS ORDER BY fecha_hora DESC LIMIT 100');
    }
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

module.exports = router;