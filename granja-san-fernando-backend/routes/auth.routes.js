const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');

const router = express.Router();

const reglasLogin = [
  body('usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('El usuario solo puede contener letras, números, puntos, guiones y guiones bajos'),
  body('contrasena')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6, max: 100 }).withMessage('La contraseña debe tener entre 6 y 100 caracteres'),
];

router.post('/login', reglasLogin, validar, async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM USUARIOS WHERE usuario = ?',
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuarioEncontrado = rows[0];

    if (!usuarioEncontrado.activo) {
      return res.status(403).json({ error: 'Esta cuenta ha sido desactivada. Contacta al administrador.' });
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuarioEncontrado.contrasena);

    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      {
        id_usuario: usuarioEncontrado.id_usuario,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol,
        id_trabajador: usuarioEncontrado.id_trabajador
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id_usuario: usuarioEncontrado.id_usuario,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol,
        id_trabajador: usuarioEncontrado.id_trabajador
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
  }
});

router.post('/renovar', verificarToken, (req, res) => {
  const nuevoToken = jwt.sign(
    {
      id_usuario: req.usuario.id_usuario,
      usuario: req.usuario.usuario,
      rol: req.usuario.rol,
      id_trabajador: req.usuario.id_trabajador
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token: nuevoToken });
});

module.exports = router;