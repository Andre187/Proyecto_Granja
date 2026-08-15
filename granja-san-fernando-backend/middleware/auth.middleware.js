const jwt = require('jsonwebtoken');

// Token ausente, inválido o expirado -> siempre 401 (problema de identidad/sesión)
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No se proporcionó token de acceso' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    req.usuario = decoded;
    next();
  });
}

// El superadministrador conserva todos los permisos de administrador, y más
// (esto sí es un problema de permisos, no de sesión -> se queda en 403)
function soloAdministrador(req, res, next) {
  if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'superadministrador') {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }
  next();
}

function soloSuperAdmin(req, res, next) {
  if (req.usuario.rol !== 'superadministrador') {
    return res.status(403).json({ error: 'Esta acción requiere privilegios de superadministrador' });
  }
  next();
}

module.exports = { verificarToken, soloAdministrador, soloSuperAdmin };