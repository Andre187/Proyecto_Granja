const rateLimit = require('express-rate-limit');

// Límite general: aplica a toda la API, generoso para no estorbar el uso normal
const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 peticiones por IP en esa ventana de tiempo
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde esta conexión. Intenta de nuevo en unos minutos.' },
});

// Límite estricto: solo para el login, previene fuerza bruta de contraseñas
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 6, // 6 intentos de login por IP en esa ventana
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // los intentos exitosos no cuentan contra el límite
  message: { error: 'Demasiados intentos de inicio de sesión. Espera unos minutos antes de volver a intentar.' },
});

module.exports = { limitadorGeneral, limitadorLogin };