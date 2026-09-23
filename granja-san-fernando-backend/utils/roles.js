// El superadministrador conserva todos los permisos de administrador, y más.
// Usar este helper en vez de comparar directamente con el texto 'administrador'.
function esAdminOSuper(rol) {
  return rol === 'administrador' || rol === 'superadministrador';
}

module.exports = { esAdminOSuper };
