const express = require('express');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verificarToken);

// ---------- CONCENTRADO (compras) — solo administrador ----------

router.get('/concentrado', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CONCENTRADO ORDER BY fecha DESC, id_concentrado DESC LIMIT 30');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/concentrado', soloAdministrador, async (req, res) => {
  try {
    const { fecha, tipo_concentrado, cantidad_qq, costo_unitario } = req.body;
    if (!fecha || !tipo_concentrado || !cantidad_qq || !costo_unitario) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    await pool.query(
      'INSERT INTO CONCENTRADO (fecha, tipo_concentrado, cantidad_qq, costo_unitario) VALUES (?, ?, ?, ?)',
      [fecha, tipo_concentrado, cantidad_qq, costo_unitario]
    );
    res.status(201).json({ mensaje: 'Compra de concentrado registrada correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// ---------- STOCK DE CONCENTRADO (existencia) ----------

router.get('/concentrado-stock', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CONCENTRADO_STOCK ORDER BY tipo_concentrado');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// El administrador puede ajustar el nivel mínimo de alerta de cada tipo
router.put('/concentrado-stock/:id', soloAdministrador, async (req, res) => {
  try {
    const { nivel_minimo } = req.body;
    if (nivel_minimo === undefined) {
      return res.status(400).json({ error: 'El nivel mínimo es requerido' });
    }
    await pool.query('UPDATE CONCENTRADO_STOCK SET nivel_minimo = ? WHERE id_stock = ?', [nivel_minimo, req.params.id]);
    res.json({ mensaje: 'Nivel mínimo actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

router.post('/concentrado-consumo', async (req, res) => {
  try {
    const { id_stock, fecha, cantidad_qq } = req.body;
    if (!id_stock || !fecha || !cantidad_qq) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    await pool.query(
      'INSERT INTO CONCENTRADO_CONSUMO (id_stock, fecha, cantidad_qq) VALUES (?, ?, ?)',
      [id_stock, fecha, cantidad_qq]
    );
    res.status(201).json({ mensaje: 'Consumo registrado correctamente' });
  } catch (error) {
    // El trigger rechaza consumos que superen la existencia disponible
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// ---------- MEDICAMENTOS (catálogo) — solo administrador da de alta ----------

router.get('/medicamentos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM MEDICAMENTOS ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/medicamentos', soloAdministrador, async (req, res) => {
  try {
    const { nombre, existencia_actual, nivel_minimo, unidad_medida } = req.body;
    if (!nombre || existencia_actual === undefined || nivel_minimo === undefined || !unidad_medida) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const [result] = await pool.query(
      'INSERT INTO MEDICAMENTOS (nombre, existencia_actual, nivel_minimo, unidad_medida) VALUES (?, ?, ?, ?)',
      [nombre, existencia_actual, nivel_minimo, unidad_medida]
    );
    res.status(201).json({ id_medicamento: result.insertId, mensaje: 'Medicamento agregado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// ---------- MOVIMIENTOS DE MEDICAMENTO ----------
// Administrador: puede registrar entradas y salidas.
// Operador: solo puede registrar salidas (consumo), no entradas (compras).

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
    res.status(500).json({ error: error.message });
  }
});

router.post('/movimientos', async (req, res) => {
  try {
    const { id_medicamento, fecha, tipo_movimiento, cantidad } = req.body;
    if (!id_medicamento || !fecha || !tipo_movimiento || !cantidad) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (!['entrada', 'salida'].includes(tipo_movimiento)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
    }

    // El operador solo puede registrar salidas (consumo), no entradas (compras)
    if (req.usuario.rol !== 'administrador' && tipo_movimiento !== 'salida') {
      return res.status(403).json({ error: 'Solo el administrador puede registrar entradas de medicamento' });
    }

    await pool.query(
      'INSERT INTO MOVIMIENTOS_MEDICAMENTO (id_medicamento, fecha, tipo_movimiento, cantidad) VALUES (?, ?, ?, ?)',
      [id_medicamento, fecha, tipo_movimiento, cantidad]
    );
    res.status(201).json({ mensaje: 'Movimiento registrado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

module.exports = router;