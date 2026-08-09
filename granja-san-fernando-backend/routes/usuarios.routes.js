const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');

const router = express.Router();

// Todas las rutas de este archivo requieren estar logueado y ser administrador
router.use(verificarToken, soloAdministrador);

// GET /api/usuarios — listar todos (nunca se devuelve la contraseña)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id_usuario, usuario, rol FROM USUARIOS ORDER BY id_usuario');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios — crear usuario nuevo
router.post('/', async (req, res) => {
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

    const hash = await bcrypt.hash(contrasena, 10);

    const [result] = await pool.query(
      'INSERT INTO USUARIOS (usuario, contrasena, rol) VALUES (?, ?, ?)',
      [usuario, hash, rol]
    );

    res.status(201).json({ id_usuario: result.insertId, usuario, rol });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/usuarios/:id — editar rol de un usuario
router.put('/:id', async (req, res) => {
  try {
    const { rol } = req.body;
    if (!['administrador', 'operador'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    await pool.query('UPDATE USUARIOS SET rol = ? WHERE id_usuario = ?', [rol, req.params.id]);
    res.json({ mensaje: 'Rol actualizado correctamente' });
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
    // Evita que un administrador se elimine a sí mismo por accidente
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