const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const DURACION_TOKEN = '8h';
// Tope absoluto de una sesión aunque se renueve el token continuamente
const MAX_SESION_SEGUNDOS = 12 * 60 * 60;

// Huella corta del hash de contraseña guardado. Va dentro del token: si la contraseña cambia,
// la huella ya no coincide y todos los tokens anteriores dejan de funcionar.
function huellaContrasena(hashContrasena) {
  return crypto.createHash('sha256').update(String(hashContrasena)).digest('hex').slice(0, 16);
}

function firmarToken({ id_usuario, usuario, rol, id_trabajador }, hashContrasena, inicio = Math.floor(Date.now() / 1000)) {
  return jwt.sign(
    { id_usuario, usuario, rol, id_trabajador, pv: huellaContrasena(hashContrasena), inicio },
    process.env.JWT_SECRET,
    { expiresIn: DURACION_TOKEN }
  );
}

module.exports = { huellaContrasena, firmarToken, MAX_SESION_SEGUNDOS };
