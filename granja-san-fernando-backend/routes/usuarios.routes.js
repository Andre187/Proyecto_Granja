const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');

const router = express.Router();

const reglasCrearUsuario = [
  body('usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('El usuario solo puede contener letras, números, puntos, guiones y guiones bajos'),
  body('contrasena')
    .isLength({ min: 6, max: 100 }).withMessage('La contraseña debe tener entre 6 y 100 caracteres'),
  body('rol')
    .isIn(['administrador', 'operador']).withMessage('Rol inválido'),
];

router.use(verificarToken, soloAdministrador);

// GET /api/usuarios — el administrador normal nunca ve al superadministrador
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id_usuario, u.usuario, u.rol, u.activo, u.id_trabajador, t.nombre AS trabajador_nombre
      FROM USUARIOS u
      LEFT JOIN TRABAJADORES t ON t.id_trabajador = u.id_trabajador
      WHERE u.rol != 'superadministrador'
      ORDER BY u.id_usuario
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/trabajadores', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.id_trabajador, t.nombre, u.usuario AS vinculado_a
      FROM TRABAJADORES t
      LEFT JOIN USUARIOS u ON u.id_trabajador = t.id_trabajador
      WHERE t.estado = 'activo'
      ORDER BY t.nombre
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', reglasCrearUsuario, validar, async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const { usuario, contrasena, rol } = req.body;

    await conexion.beginTransaction();

    let idTrabajador = null;

    if (rol === 'operador') {
      const [resultTrabajador] = await conexion.query(
        'INSERT INTO TRABAJADORES (nombre, costo_dia, estado) VALUES (?, 0, "activo")',
        [usuario]
      );
      idTrabajador = resultTrabajador.insertId;
    }

    const hash = await bcrypt.hash(contrasena, 10);

    const [result] = await conexion.query(
      'INSERT INTO USUARIOS (usuario, contrasena, rol, id_trabajador) VALUES (?, ?, ?, ?)',
      [usuario, hash, rol, idTrabajador]
    );

    await conexion.commit();
    res.status(201).json({ id_usuario: result.insertId, usuario, rol, id_trabajador: idTrabajador });
  } catch (error) {
    await conexion.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
    }
    res.status(500).json({ error: error.message });
  } finally {
    conexion.release();
  }
});

router.post('/:id/vincular-trabajador', async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const [rows] = await conexion.query('SELECT * FROM USUARIOS WHERE id_usuario = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const usuarioEncontrado = rows[0];

    if (usuarioEncontrado.id_trabajador) {
      return res.status(400).json({ error: 'Este usuario ya tiene un trabajador vinculado' });
    }

    await conexion.beginTransaction();

    const [resultTrabajador] = await conexion.query(
      'INSERT INTO TRABAJADORES (nombre, costo_dia, estado) VALUES (?, 0, "activo")',
      [usuarioEncontrado.usuario]
    );

    await conexion.query('UPDATE USUARIOS SET id_trabajador = ? WHERE id_usuario = ?', [resultTrabajador.insertId, req.params.id]);

    await conexion.commit();
    res.json({ mensaje: 'Registro de trabajador generado correctamente' });
  } catch (error) {
    await conexion.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conexion.release();
  }
});

// Bloquea cualquier intento de un admin normal de tocar la cuenta de superadministrador
async function bloquearSiEsSuperAdmin(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT rol FROM USUARIOS WHERE id_usuario = ?', [req.params.id]);
    if (rows.length > 0 && rows[0].rol === 'superadministrador') {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta cuenta' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

router.put('/:id', bloquearSiEsSuperAdmin, async (req, res) => {
  try {
    const { rol } = req.body;
    if (!['administrador', 'operador'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    await pool.query('UPDATE USUARIOS SET rol = ? WHERE id_usuario = ?', [rol, req.params.id]);
    res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/password', bloquearSiEsSuperAdmin, async (req, res) => {
  try {
    const { contrasena } = req.body;
    if (!contrasena || contrasena.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const hash = await bcrypt.hash(contrasena, 10);
    await pool.query('UPDATE USUARIOS SET contrasena = ? WHERE id_usuario = ?', [hash, req.params.id]);
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desactivar: bloquea el login sin borrar nada del historial
router.put('/:id/desactivar', bloquearSiEsSuperAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.usuario.id_usuario) {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
    }

    const [usuarioRows] = await pool.query('SELECT rol FROM USUARIOS WHERE id_usuario = ?', [req.params.id]);
    if (usuarioRows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuarioRows[0].rol === 'administrador') {
      const [conteo] = await pool.query(
        "SELECT COUNT(*) AS total FROM USUARIOS WHERE rol = 'administrador' AND activo = 1"
      );
      if (conteo[0].total <= 1) {
        return res.status(400).json({
          error: 'No puedes desactivar al único administrador activo. Crea o reactiva otro administrador primero.'
        });
      }
    }

    await pool.query('UPDATE USUARIOS SET activo = 0 WHERE id_usuario = ?', [req.params.id]);
    res.json({ mensaje: 'Usuario desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reactivar: le devuelve el acceso a una cuenta desactivada
router.put('/:id/reactivar', bloquearSiEsSuperAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE USUARIOS SET activo = 1 WHERE id_usuario = ?', [req.params.id]);
    res.json({ mensaje: 'Usuario reactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;