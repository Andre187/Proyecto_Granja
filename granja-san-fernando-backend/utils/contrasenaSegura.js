// Política de contraseñas para creación y cambio: al menos 8 caracteres, con al menos
// una letra y un número. No se exige aquí para el login (reglasLogin en auth.routes.js
// sigue aceptando el mínimo histórico de 6), porque cuentas ya existentes no deben quedar
// bloqueadas -- esta política solo aplica hacia adelante, cuando se define una contraseña nueva.
const REGEX_CONTRASENA_SEGURA = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const MENSAJE_CONTRASENA_SEGURA = 'La contraseña debe tener al menos 8 caracteres, incluyendo al menos una letra y un número';

function esContrasenaSegura(contrasena) {
  return typeof contrasena === 'string' && REGEX_CONTRASENA_SEGURA.test(contrasena);
}

module.exports = { REGEX_CONTRASENA_SEGURA, MENSAJE_CONTRASENA_SEGURA, esContrasenaSegura };
