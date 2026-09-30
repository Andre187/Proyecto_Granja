// Política de contraseñas para creación y cambio: entre 8 y 72 caracteres, con al menos
// una letra y un número. El tope de 72 existe porque bcrypt solo usa los primeros 72 bytes: una
// contraseña más larga se guardaría recortada en silencio. No se exige aquí para el login
// (reglasLogin en auth.routes.js sigue aceptando el mínimo histórico de 6), porque cuentas ya
// existentes no deben quedar bloqueadas -- esta política solo aplica hacia adelante.
const MAX_BYTES_BCRYPT = 72;
const REGEX_CONTRASENA_SEGURA = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const MENSAJE_CONTRASENA_SEGURA = 'La contraseña debe tener entre 8 y 72 caracteres, incluyendo al menos una letra y un número';

function esContrasenaSegura(contrasena) {
  return typeof contrasena === 'string'
    && REGEX_CONTRASENA_SEGURA.test(contrasena)
    && Buffer.byteLength(contrasena, 'utf8') <= MAX_BYTES_BCRYPT;
}

module.exports = { REGEX_CONTRASENA_SEGURA, MENSAJE_CONTRASENA_SEGURA, esContrasenaSegura };
