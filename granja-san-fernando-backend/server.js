const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const pool = require('./db');
const { limitadorGeneral, limitadorLogin } = require('./middleware/rateLimit.middleware');
const { manejarError } = require('./utils/manejarError');
const { verificarToken, soloAdministrador } = require('./middleware/auth.middleware');
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
const superadminRoutes = require('./routes/superadmin.routes');

// Lista blanca de orígenes permitidos: de dónde SÍ puede llamar a esta API un navegador.
// En desarrollo, por defecto solo el frontend local (Vite). En producción, configura
// FRONTEND_URL en el .env con el dominio real (o varios, separados por coma).
const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim());

const opcionesCors = {
  origin(origen, callback) {
    // Sin header Origin (ej. Postman, curl, peticiones del propio servidor) -> se permite
    if (!origen || origenesPermitidos.includes(origen)) {
      return callback(null, true);
    }
    callback(new Error('Origen no permitido por CORS'));
  },
};

const app = express();
app.use(helmet());
app.use(cors(opcionesCors));
app.use(express.json());
app.use('/api', limitadorGeneral);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Granja San Fernando funcionando correctamente' });
});

// Endpoint de diagnóstico -- solo para administradores, no lo usa el frontend
app.get('/api/test-db', verificarToken, soloAdministrador, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS fecha_servidor');
    res.json({ conexion: 'exitosa', fecha_servidor: rows[0].fecha_servidor });
  } catch (error) {
    manejarError(res, error, 'Error al conectar con la base de datos');
  }
});

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
app.use('/api/superadmin', superadminRoutes);

// Manejador de errores al final: si CORS rechaza un origen, responde limpio en vez de
// dejar que Express filtre un stack trace u otro detalle interno.
app.use((err, req, res, next) => {
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});