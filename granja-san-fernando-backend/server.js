const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const { limitadorGeneral, limitadorLogin } = require('./middleware/rateLimit.middleware');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const produccionRoutes = require('./routes/produccion.routes');
const sanidadRoutes = require('./routes/sanidad.routes');
const tareasRoutes = require('./routes/tareas.routes');
const ventasRoutes = require('./routes/ventas.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const reportesRoutes = require('./routes/reportes.routes');
const personalRoutes = require('./routes/personal.routes');
const gastosRoutes = require('./routes/gastos.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Límite general para toda la API
app.use(limitadorGeneral);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Granja San Fernando funcionando correctamente' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS fecha_servidor');
    res.json({ conexion: 'exitosa', fecha_servidor: rows[0].fecha_servidor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
  }
});

// Límite estricto solo en la ruta de login (antes de montar las rutas de auth)
app.use('/api/auth/login', limitadorLogin);

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/produccion', produccionRoutes);
app.use('/api/sanidad', sanidadRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/gastos', gastosRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});