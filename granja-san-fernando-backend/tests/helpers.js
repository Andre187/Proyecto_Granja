const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const pool = require('../db');

const CONTRASENA = 'Abcdefg1';

// Cada petición sale con una IP distinta (TRUST_PROXY=1) para que el límite de intentos de login
// y el límite general no interfieran entre pruebas. Las pruebas de límite fijan su propia IP.
const ipAleatoria = () => `10.${[1, 2, 3].map(() => Math.floor(Math.random() * 250)).join('.')}`;

function llamar(metodo, ruta, token, cuerpo, { ip } = {}) {
  let req = request(app)[metodo](`/api${ruta}`).set('X-Forwarded-For', ip || ipAleatoria());
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  if (cuerpo !== undefined) req = req.send(cuerpo);
  return req;
}

const api = {
  get: (ruta, token, opciones) => llamar('get', ruta, token, undefined, opciones),
  post: (ruta, token, cuerpo, opciones) => llamar('post', ruta, token, cuerpo === undefined ? {} : cuerpo, opciones),
  put: (ruta, token, cuerpo, opciones) => llamar('put', ruta, token, cuerpo === undefined ? {} : cuerpo, opciones),
};

const login = (usuario, contrasena = CONTRASENA, opciones) => api.post('/auth/login', null, { usuario, contrasena }, opciones);

// Fechas en hora local (America/Guatemala), como las calcula la API
function fechaLocal(diasAtras = 0) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const hoy = () => fechaLocal(0);

const TABLAS_A_VACIAR = [
  'auditoria_general', 'pagos_semanales', 'vacunacion', 'seguimiento_peso', 'concentrado_consumo',
  'concentrado', 'concentrado_stock', 'movimientos_medicamento', 'medicamentos', 'gastos', 'abonos',
  'detalle_venta', 'ventas', 'clientes', 'huevos_clasificados', 'huevos_stock', 'tareas',
  'postura_diaria', 'mortalidad', 'lotes', 'galeras', 'usuarios', 'trabajadores', 'auditoria_usuarios',
];

// Tamaño de huevo usado en las pruebas (catálogo: 4 pequeño, 5 mediano, 6 grande, 7 extra, 8 jumbo)
const GRANDE = 6;

// Deja la base de pruebas en un estado conocido y devuelve un token por cada usuario de prueba.
// Usuarios: admin_qa, admin2_qa (administradores), op1, op2 (operadores con trabajador), super_qa.
async function reiniciar() {
  for (const tabla of TABLAS_A_VACIAR) {
    try {
      await pool.query(`DELETE FROM ${tabla}`);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
    }
  }
  const hash = await bcrypt.hash(CONTRASENA, 4);
  await pool.query("INSERT INTO trabajadores (id_trabajador, nombre, costo_dia, estado) VALUES (1, 'Op Uno', 0, 'activo'), (2, 'Op Dos', 0, 'activo')");
  await pool.query(
    "INSERT INTO usuarios (id_usuario, usuario, nombre, apellido, contrasena, rol, id_trabajador) VALUES " +
    "(1, 'admin_qa', 'A', 'Q', ?, 'administrador', NULL), (2, 'op1', 'Op', 'Uno', ?, 'operador', 1), " +
    "(3, 'op2', 'Op', 'Dos', ?, 'operador', 2), (4, 'super_qa', 'S', 'Q', ?, 'superadministrador', NULL), " +
    "(5, 'admin2_qa', 'B', 'Q', ?, 'administrador', NULL)",
    [hash, hash, hash, hash, hash]
  );
  await pool.query("INSERT INTO galeras (id_galera, nombre, ubicacion, capacidad) VALUES (1, 'G-QA', 'x', 1000)");

  const tokens = {};
  for (const usuario of ['admin_qa', 'admin2_qa', 'op1', 'op2', 'super_qa']) {
    const r = await login(usuario);
    if (r.status !== 200) throw new Error(`No se pudo iniciar sesión como ${usuario}: ${r.status}`);
    tokens[usuario] = r.body.token;
  }
  return tokens;
}

// Fija la existencia de huevos del tamaño de pruebas
const fijarExistencia = (cantidad, idClasificacion = GRANDE) =>
  pool.query(
    'INSERT INTO huevos_stock (id_clasificacion, existencia_actual, nivel_minimo) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE existencia_actual = VALUES(existencia_actual)',
    [idClasificacion, cantidad]
  );

const existencia = async (idClasificacion = GRANDE) => {
  const [rows] = await pool.query('SELECT existencia_actual AS e FROM huevos_stock WHERE id_clasificacion = ?', [idClasificacion]);
  return rows.length ? rows[0].e : undefined;
};

// Una venta de huevos del tamaño de pruebas. Devuelve la respuesta completa.
const venderHuevos = (token, { cantidad = 1, precio = 1, forma_pago = 'credito', cliente = 'Cliente QA', fecha } = {}) =>
  api.post('/ventas/ventas', token, {
    fecha: fecha || hoy(),
    cliente_nombre: cliente,
    forma_pago,
    items: [{ id_clasificacion: GRANDE, cantidad, precio_unitario: precio }],
  });

module.exports = {
  app, pool, request, api, login, reiniciar, hoy, fechaLocal, fijarExistencia, existencia, venderHuevos, CONTRASENA, GRANDE,
};
