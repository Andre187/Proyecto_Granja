// Ejecuta este script UNA VEZ para crear tu primer usuario administrador.
// Uso: node seed-admin.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { esContrasenaSegura, MENSAJE_CONTRASENA_SEGURA } = require('./utils/contrasenaSegura');

// La contraseña NO se guarda en este archivo (ni en el historial de git): se pasa al ejecutar.
// Uso (PowerShell):  $env:SEED_PASSWORD='TuContraseñaSegura1'; node seed-admin.js
// Opcional: $env:SEED_USUARIO='otro_nombre'
const usuario = process.env.SEED_USUARIO || 'admin';
const contrasenaTextoPlano = process.env.SEED_PASSWORD;
const rol = 'administrador';

if (!esContrasenaSegura(contrasenaTextoPlano)) {
  console.error('Define SEED_PASSWORD con una contraseña segura. ' + MENSAJE_CONTRASENA_SEGURA);
  process.exit(1);
}

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
    process.exit(0);
  } catch (error) {
    console.error('Error al crear el usuario administrador:', error.message);
    process.exit(1);
  }
}

crearAdmin();
