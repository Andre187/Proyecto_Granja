// Zona horaria de la granja. Debe fijarse antes de cualquier uso de Date: los reportes calculan
// "hoy" con la hora del proceso, y un servidor en UTC (EC2 por defecto) cambiaría de día a las 18:00.
process.env.TZ = process.env.TZ || 'America/Guatemala';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const pool = require('./db');
const { limitadorGeneral, limitadorLogin } = require('./middleware/rateLimit.middleware');
const { manejarError, registrarError } = require('./utils/manejarError');
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

// Detrás de Nginx todas las peticiones llegan desde la IP del proxy, y el límite de intentos de login
// (por IP) bloquearía a todos los usuarios a la vez. En producción define TRUST_PROXY=1 en el .env
// (número de proxies delante de la app). Sin definirla no se confía en X-Forwarded-For, para que en
// desarrollo nadie pueda falsear su IP y saltarse el límite.
if (process.env.TRUST_PROXY) {
  const saltos = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isInteger(saltos) ? saltos : process.env.TRUST_PROXY);
}
app.use(helmet());
app.use(cors(opcionesCors));
app.use(express.json());
// Express 5 deja req.body sin definir cuando la petición no trae cuerpo; así los controladores
// pueden desestructurarlo sin reventar.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});
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

// Ruta inexistente: respuesta JSON, no la página HTML por defecto de Express
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores al final: CORS, JSON mal formado, cuerpos demasiado grandes y cualquier
// otro fallo responden limpio, sin filtrar un stack trace ni detalles internos.
app.use((err, req, res, next) => {
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande' });
  }
  registrarError(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;