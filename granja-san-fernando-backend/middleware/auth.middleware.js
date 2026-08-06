const jwt = require('jsonwebtoken');

// Verifica que la petición traiga un token válido antes de dejarla pasar
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'No se proporcionó token de acceso' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.usuario = decoded; // queda disponible en las siguientes rutas
    next();
  });
}

// Verifica además que el usuario tenga rol de administrador
function soloAdministrador(req, res, next) {
  if (req.usuario.rol !== 'administrador') {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }
  next();
}

module.exports = { verificarToken, soloAdministrador };
