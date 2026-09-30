const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');
const { manejarError } = require('../utils/manejarError');
const { fecha, decimal2, texto, validarParametroId } = require('../utils/validadores');
const { esAdminOSuper } = require('../utils/roles');

const router = express.Router();

router.use(verificarToken);
validarParametroId(router);

const reglasConcentrado = [
  fecha('fecha'),
  texto('tipo_concentrado', { max: 50, nombre: 'El tipo de concentrado' }),
  decimal2(body('cantidad_qq'), { min: 0.01, max: 100000, mensaje: 'La cantidad debe ser mayor a 0' }),
  decimal2(body('costo_unitario'), { min: 0.01, max: 100000, mensaje: 'El costo unitario debe ser mayor a 0' }),
];

const reglasNivelMinimo = [
  decimal2(body('nivel_minimo'), { min: 0, max: 100000, mensaje: 'El nivel mínimo debe ser un número válido' }),
];

const reglasConsumoConcentrado = [
  body('id_stock').isInt({ min: 1 }).withMessage('Selecciona un tipo de concentrado válido'),
  fecha('fecha'),
  decimal2(body('cantidad_qq'), { min: 0.01, max: 100000, mensaje: 'La cantidad debe ser mayor a 0' }),
];

const reglasMedicamento = [
  texto('nombre', { max: 100, nombre: 'El nombre' }),
  decimal2(body('existencia_actual'), { min: 0, max: 1000000, mensaje: 'La existencia debe ser un número válido' }),
  decimal2(body('nivel_minimo'), { min: 0, max: 1000000, mensaje: 'El nivel mínimo debe ser un número válido' }),
  texto('unidad_medida', { max: 20, nombre: 'La unidad de medida' }),
];

const reglasMovimiento = [
  body('id_medicamento').isInt({ min: 1 }).withMessage('Selecciona un medicamento válido'),
  fecha('fecha'),
  body('tipo_movimiento').isIn(['entrada', 'salida']).withMessage('Tipo de movimiento inválido'),
  decimal2(body('cantidad'), { min: 0.01, max: 100000, mensaje: 'La cantidad debe ser mayor a 0' }),
];

const reglasClasificarHuevos = [
  fecha('fecha'),
  body('items').isArray({ min: 1, max: 10 }).withMessage('Agrega al menos un tamaño'),
  body('items.*.id_clasificacion').isInt({ min: 1 }).withMessage('Selecciona un tamaño válido'),
  body('items.*.cantidad').isInt({ min: 1, max: 1000000 }).withMessage('La cantidad debe ser mayor a 0'),
];

// ---------- CONCENTRADO (compras, con costos) — solo administrador ----------

router.get('/concentrado', soloAdministrador, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CONCENTRADO ORDER BY fecha DESC, id_concentrado DESC LIMIT 30');
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/concentrado', soloAdministrador, reglasConcentrado, validar, async (req, res) => {
  try {
    const { fecha, tipo_concentrado, cantidad_qq, costo_unitario } = req.body;
    await pool.query(
      'INSERT INTO CONCENTRADO (fecha, tipo_concentrado, cantidad_qq, costo_unitario) VALUES (?, ?, ?, ?)',
      [fecha, tipo_concentrado, cantidad_qq, costo_unitario]
    );
    res.status(201).json({ mensaje: 'Compra de concentrado registrada correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- STOCK DE CONCENTRADO (existencia) ----------

router.get('/concentrado-stock', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CONCENTRADO_STOCK ORDER BY tipo_concentrado');
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.put('/concentrado-stock/:id', soloAdministrador, reglasNivelMinimo, validar, async (req, res) => {
  try {
    const { nivel_minimo } = req.body;
    const [resultado] = await pool.query('UPDATE CONCENTRADO_STOCK SET nivel_minimo = ? WHERE id_stock = ?', [nivel_minimo, req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro de existencia no encontrado' });
    }
    res.json({ mensaje: 'Nivel mínimo actualizado' });
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- CONSUMO DE CONCENTRADO — cualquier usuario logueado puede registrar ----------

router.get('/concentrado-consumo', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cc.id_consumo, cs.tipo_concentrado, cc.fecha, cc.cantidad_qq
      FROM CONCENTRADO_CONSUMO cc
      JOIN CONCENTRADO_STOCK cs ON cs.id_stock = cc.id_stock
      ORDER BY cc.fecha DESC, cc.id_consumo DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/concentrado-consumo', reglasConsumoConcentrado, validar, async (req, res) => {
  try {
    const { id_stock, fecha, cantidad_qq } = req.body;
    await pool.query(
      'INSERT INTO CONCENTRADO_CONSUMO (id_stock, fecha, cantidad_qq) VALUES (?, ?, ?)',
      [id_stock, fecha, cantidad_qq]
    );
    res.status(201).json({ mensaje: 'Consumo registrado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- MEDICAMENTOS (catálogo) — solo administrador da de alta ----------

router.get('/medicamentos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM MEDICAMENTOS ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/medicamentos', soloAdministrador, reglasMedicamento, validar, async (req, res) => {
  try {
    const { nombre, existencia_actual, nivel_minimo, unidad_medida } = req.body;
    const [result] = await pool.query(
      'INSERT INTO MEDICAMENTOS (nombre, existencia_actual, nivel_minimo, unidad_medida) VALUES (?, ?, ?, ?)',
      [nombre, existencia_actual, nivel_minimo, unidad_medida]
    );
    res.status(201).json({ id_medicamento: result.insertId, mensaje: 'Medicamento agregado correctamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un medicamento con ese nombre' });
    }
    manejarError(res, error);
  }
});

// ---------- MOVIMIENTOS DE MEDICAMENTO ----------

router.get('/movimientos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id_movimiento, m.id_medicamento, med.nombre AS medicamento_nombre,
             m.fecha, m.tipo_movimiento, m.cantidad, med.unidad_medida
      FROM MOVIMIENTOS_MEDICAMENTO m
      JOIN MEDICAMENTOS med ON med.id_medicamento = m.id_medicamento
      ORDER BY m.fecha DESC, m.id_movimiento DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/movimientos', reglasMovimiento, validar, async (req, res) => {
  try {
    const { id_medicamento, fecha, tipo_movimiento, cantidad } = req.body;

    if (!esAdminOSuper(req.usuario.rol) && tipo_movimiento !== 'salida') {
      return res.status(403).json({ error: 'Solo el administrador puede registrar entradas de medicamento' });
    }

    await pool.query(
      'INSERT INTO MOVIMIENTOS_MEDICAMENTO (id_medicamento, fecha, tipo_movimiento, cantidad) VALUES (?, ?, ?, ?)',
      [id_medicamento, fecha, tipo_movimiento, cantidad]
    );
    res.status(201).json({ mensaje: 'Movimiento registrado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- HUEVOS: EXISTENCIA POR TAMAÑO ----------

router.get('/huevos-stock', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT hs.id_stock, hs.id_clasificacion, ch.nombre AS clasificacion,
             hs.existencia_actual, hs.nivel_minimo
      FROM HUEVOS_STOCK hs
      JOIN CLASIFICACIONES_HUEVO ch ON ch.id_clasificacion = hs.id_clasificacion
      ORDER BY ch.id_clasificacion
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

// El administrador puede ajustar el nivel mínimo de alerta de cada tamaño
router.put('/huevos-stock/:id', soloAdministrador, reglasNivelMinimo, validar, async (req, res) => {
  try {
    const { nivel_minimo } = req.body;
    const [resultado] = await pool.query('UPDATE HUEVOS_STOCK SET nivel_minimo = ? WHERE id_stock = ?', [nivel_minimo, req.params.id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro de existencia no encontrado' });
    }
    res.json({ mensaje: 'Nivel mínimo actualizado' });
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- HUEVOS: CLASIFICACIÓN DIARIA — admin u operador pueden registrar ----------

router.get('/huevos-clasificados', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT hc.id_registro, hc.id_clasificacion, ch.nombre AS clasificacion, hc.fecha, hc.cantidad
      FROM HUEVOS_CLASIFICADOS hc
      JOIN CLASIFICACIONES_HUEVO ch ON ch.id_clasificacion = hc.id_clasificacion
      ORDER BY hc.fecha DESC, hc.id_registro DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

// Registra la clasificación de uno o varios tamaños del mismo día en una sola operación
router.post('/huevos-clasificados', reglasClasificarHuevos, validar, async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const { fecha, items } = req.body;
    await conexion.beginTransaction();
    for (const item of items) {
      await conexion.query(
        'INSERT INTO HUEVOS_CLASIFICADOS (id_clasificacion, fecha, cantidad) VALUES (?, ?, ?)',
        [item.id_clasificacion, fecha, item.cantidad]
      );
    }
    await conexion.commit();
    res.status(201).json({ mensaje: 'Clasificación de huevos registrada correctamente' });
  } catch (error) {
    await conexion.rollback();
    manejarError(res, error);
  } finally {
    conexion.release();
  }
});

module.exports = router;