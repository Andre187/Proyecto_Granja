// Ejecuta este script UNA VEZ para crear tu primer usuario administrador.
// Uso: node seed-admin.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

// -------- EDITA ESTOS DATOS ANTES DE EJECUTAR --------
const usuario = 'admin';
const contrasenaTextoPlano = 'admin123'; // cámbiala por una segura
const rol = 'administrador';
// -------------------------------------------------------

async function crearAdmin() {
  try {
    const hash = await bcrypt.hash(contrasenaTextoPlano, 10);

    const [result] = await pool.query(
      'INSERT INTO USUARIOS (usuario, contrasena, rol) VALUES (?, ?, ?)',
      [usuario, hash, rol]
    );

    console.log('Usuario administrador creado correctamente.');
    console.log('id_usuario:', result.insertId);
    console.log('usuario:', usuario);
    console.log('Guarda esta contraseña en un lugar seguro:', contrasenaTextoPlano);
    process.exit(0);
  } catch (error) {
    console.error('Error al crear el usuario administrador:', error.message);
    process.exit(1);
  }
}

crearAdmin();
