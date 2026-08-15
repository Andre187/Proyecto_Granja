// Ejecuta este script UNA VEZ para crear la cuenta de emergencia (superadministrador).
// Guarda estas credenciales en un lugar seguro y aparte (no en este archivo del proyecto).
// Uso: node seed-superadmin.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

// -------- EDITA ESTOS DATOS ANTES DE EJECUTAR --------
const usuario = 'superadmin';
const contrasenaTextoPlano = 'superadmin2026'; 
// -------------------------------------------------------

async function crearSuperAdmin() {
  try {
    const hash = await bcrypt.hash(contrasenaTextoPlano, 10);

    const [result] = await pool.query(
      'INSERT INTO USUARIOS (usuario, contrasena, rol) VALUES (?, ?, ?)',
      [usuario, hash, 'superadministrador']
    );

    console.log('Cuenta de superadministrador creada correctamente.');
    console.log('id_usuario:', result.insertId);
    console.log('usuario:', usuario);
    console.log('Guarda esta contraseña en un lugar seguro y separado del proyecto:', contrasenaTextoPlano);
    process.exit(0);
  } catch (error) {
    console.error('Error al crear la cuenta de superadministrador:', error.message);
    process.exit(1);
  }
}

crearSuperAdmin();