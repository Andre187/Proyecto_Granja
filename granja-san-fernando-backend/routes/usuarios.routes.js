const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verificarToken, soloAdministrador);

// GET /api/usuarios — listar todos (incluye el nombre del trabajador vinculado, si tiene)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id_usuario, u.usuario, u.rol, u.id_trabajador, t.nombre AS trabajador_nombre
      FROM USUARIOS u
      LEFT JOIN TRABAJADORES t ON t.id_trabajador = u.id_trabajador
      ORDER BY u.id_usuario
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios — crear usuario nuevo.
// Si el rol es "operador", se crea automáticamente su registro de trabajador
// (usando el mismo nombre de usuario), sin pedir nada extra en el formulario.
router.post('/', async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const { usuario, contrasena, rol } = req.body;

    if (!usuario || !contrasena || !rol) {
      return res.status(400).json({ error: 'Usuario, contraseña y rol son requeridos' });
    }
    if (!['administrador', 'operador'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (contrasena.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

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

// POST /api/usuarios/:id/vincular-trabajador — genera el registro de trabajador
// para cuentas operador creadas antes de este cambio, que quedaron sin vincular.
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

// PUT /api/usuarios/:id — editar rol
router.put('/:id', async (req, res) => {
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

// PUT /api/usuarios/:id/password — cambiar contraseña
router.put('/:id/password', async (req, res) => {
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

// DELETE /api/usuarios/:id — eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.usuario.id_usuario) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    await pool.query('DELETE FROM USUARIOS WHERE id_usuario = ?', [req.params.id]);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;