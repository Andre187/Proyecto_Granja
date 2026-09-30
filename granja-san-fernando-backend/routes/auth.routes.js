const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');
const { manejarError } = require('../utils/manejarError');
const { firmarToken, MAX_SESION_SEGUNDOS } = require('../utils/sesion');

// Hash de mentira: se compara siempre una contraseña con algún hash, exista o no el usuario,
// para que el tiempo de respuesta no delate qué usuarios existen.
const HASH_SENUELO = bcrypt.hashSync('senuelo-que-nunca-coincide', 10);

const router = express.Router();

const reglasLogin = [
  body('usuario')
    .isString().withMessage('El usuario es requerido').bail()
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('El usuario solo puede contener letras, números, puntos, guiones y guiones bajos'),
  body('contrasena')
    .isString().withMessage('La contraseña es requerida').bail()
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6, max: 100 }).withMessage('La contraseña debe tener entre 6 y 100 caracteres'),
];

router.post('/login', reglasLogin, validar, async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = ?',
      [usuario]
    );

    const usuarioEncontrado = rows[0];

    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuarioEncontrado ? usuarioEncontrado.contrasena : HASH_SENUELO
    );

    if (!usuarioEncontrado || !contrasenaValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Solo quien conoce la contraseña se entera de que la cuenta está desactivada
    if (!usuarioEncontrado.activo) {
      return res.status(403).json({ error: 'Esta cuenta ha sido desactivada. Contacta al administrador.' });
    }

    const token = firmarToken(usuarioEncontrado, usuarioEncontrado.contrasena);

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
    manejarError(res, error, 'No se pudo iniciar sesión, inténtalo de nuevo');
  }
});

// Renueva el token mientras la sesión no supere el tope absoluto desde el inicio de sesión
router.post('/renovar', verificarToken, async (req, res) => {
  try {
    const ahora = Math.floor(Date.now() / 1000);
    if (!req.usuario.inicio || ahora - req.usuario.inicio > MAX_SESION_SEGUNDOS) {
      return res.status(401).json({ error: 'Tu sesión alcanzó su duración máxima. Vuelve a iniciar sesión.' });
    }
    const [rows] = await pool.query('SELECT contrasena FROM usuarios WHERE id_usuario = ?', [req.usuario.id_usuario]);
    res.json({ token: firmarToken(req.usuario, rows[0].contrasena, req.usuario.inicio) });
  } catch (error) {
    manejarError(res, error, 'No se pudo renovar la sesión');
  }
});

module.exports = router;