const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Buscar el usuario en la base de datos
    const [rows] = await pool.query(
      'SELECT * FROM USUARIOS WHERE usuario = ?',
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuarioEncontrado = rows[0];

    // Comparar la contraseña ingresada contra el hash guardado
    const contrasenaValida = await bcrypt.compare(contrasena, usuarioEncontrado.contrasena);

    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Generar el token JWT (válido 8 horas)
    const token = jwt.sign(
      {
        id_usuario: usuarioEncontrado.id_usuario,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id_usuario: usuarioEncontrado.id_usuario,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
  }
});

module.exports = router;
