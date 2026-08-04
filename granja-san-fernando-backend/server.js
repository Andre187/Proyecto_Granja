const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba: confirma que el servidor está corriendo
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Granja San Fernando funcionando correctamente' });
});

// Ruta de prueba: confirma que la conexión a MySQL funciona
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS fecha_servidor');
    res.json({ conexion: 'exitosa', fecha_servidor: rows[0].fecha_servidor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
  }
});

// ---- Autenticación ----
app.use('/api/auth', authRoutes);

// ---- Ejemplo de CRUD real: GALERAS ----

app.get('/api/galeras', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM GALERAS');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/galeras', async (req, res) => {
  try {
    const { nombre, ubicacion, capacidad } = req.body;
    const [result] = await pool.query(
      'INSERT INTO GALERAS (nombre, ubicacion, capacidad) VALUES (?, ?, ?)',
      [nombre, ubicacion, capacidad]
    );
    res.status(201).json({ id_galera: result.insertId, nombre, ubicacion, capacidad });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
