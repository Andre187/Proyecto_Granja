const jwt = require('jsonwebtoken');
const pool = require('../db');
const { esAdminOSuper } = require('../utils/roles');

// Token ausente, inválido o expirado -> siempre 401 (problema de identidad/sesión)
//
// Además de validar la firma, confirmamos contra la base de datos que la cuenta
// sigue activa y tomamos el rol actual (no el que traía el token). Así, si un
// administrador desactiva a alguien o le cambia el rol, el cambio aplica de
// inmediato en la siguiente petición de esa persona, en vez de quedar vigente
// hasta que el token viejo expire por su cuenta.
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No se proporcionó token de acceso' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    try {
      const [rows] = await pool.query('SELECT rol, activo FROM USUARIOS WHERE id_usuario = ?', [decoded.id_usuario]);
      if (rows.length === 0 || !rows[0].activo) {
        return res.status(401).json({ error: 'Tu cuenta ya no tiene acceso. Vuelve a iniciar sesión.' });
      }
      req.usuario = { ...decoded, rol: rows[0].rol };
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'No se pudo verificar la sesión' });
    }
  });
}

// El superadministrador conserva todos los permisos de administrador, y más
// (esto sí es un problema de permisos, no de sesión -> se queda en 403)
function soloAdministrador(req, res, next) {
  if (!esAdminOSuper(req.usuario.rol)) {
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