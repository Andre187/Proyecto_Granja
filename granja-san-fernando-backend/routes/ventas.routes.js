const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');

const reglasVenta = [
  body('fecha').isISO8601().withMessage('Fecha inválida'),
  body('forma_pago').optional().isIn(['contado', 'credito']).withMessage('Forma de pago inválida'),
  body('items').isArray({ min: 1 }).withMessage('Debes agregar al menos un artículo'),
  body('items.*.id_clasificacion').isInt({ min: 1 }).withMessage('Selecciona una clasificación válida en cada artículo'),
  body('items.*.cantidad').isInt({ min: 1, max: 100000 }).withMessage('La cantidad debe ser un número entero mayor a 0'),
  body('items.*.precio_unitario').isFloat({ min: 0.01, max: 100000 }).withMessage('El precio unitario debe ser mayor a 0'),
];

const reglasAbono = [
  body('fecha').isISO8601().withMessage('Fecha inválida'),
  body('monto').isFloat({ min: 0.01, max: 1000000 }).withMessage('El monto debe ser mayor a 0'),
];

const router = express.Router();

router.use(verificarToken);

// ---------- CLIENTES ----------

router.get('/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CLIENTES ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clientes', async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    }
    const [result] = await pool.query(
      'INSERT INTO CLIENTES (nombre, telefono, direccion) VALUES (?, ?, ?)',
      [nombre, telefono || null, direccion || null]
    );
    res.status(201).json({ id_cliente: result.insertId, nombre, telefono, direccion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- CLASIFICACIONES DE HUEVO (catálogo fijo) ----------

router.get('/clasificaciones', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CLASIFICACIONES_HUEVO ORDER BY id_clasificacion');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- RESUMEN (solo administrador) ----------

router.get('/resumen', soloAdministrador, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COALESCE(SUM(monto_total), 0) AS total_ventas,
        COALESCE(SUM(monto_total - saldo_pendiente), 0) AS total_cobrado,
        COALESCE(SUM(saldo_pendiente), 0) AS total_pendiente,
        COALESCE(SUM(CASE WHEN saldo_pendiente > 0 THEN 1 ELSE 0 END), 0) AS ventas_con_saldo
      FROM VENTAS
    `);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- VENTAS ----------

router.get('/ventas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.id_venta, v.fecha, c.nombre AS cliente_nombre, v.monto_total, v.saldo_pendiente, v.estado
      FROM VENTAS v
      JOIN CLIENTES c ON c.id_cliente = v.id_cliente
      ORDER BY v.fecha DESC, v.id_venta DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/ventas/:id', async (req, res) => {
  try {
    const [ventaRows] = await pool.query(`
      SELECT v.id_venta, v.fecha, v.id_cliente, c.nombre AS cliente_nombre, c.telefono, c.direccion,
             v.monto_total, v.saldo_pendiente, v.estado
      FROM VENTAS v
      JOIN CLIENTES c ON c.id_cliente = v.id_cliente
      WHERE v.id_venta = ?
    `, [req.params.id]);

    if (ventaRows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const [detalle] = await pool.query(`
      SELECT d.id_detalle, cl.nombre AS clasificacion, d.cantidad, d.precio_unitario, d.subtotal
      FROM DETALLE_VENTA d
      JOIN CLASIFICACIONES_HUEVO cl ON cl.id_clasificacion = d.id_clasificacion
      WHERE d.id_venta = ?
    `, [req.params.id]);

    const [abonos] = await pool.query(
      'SELECT id_abono, fecha, monto FROM ABONOS WHERE id_venta = ? ORDER BY fecha',
      [req.params.id]
    );

    res.json({ ...ventaRows[0], detalle, abonos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear una venta completa: cliente (nuevo o existente) + artículos + forma de pago
router.post('/ventas', reglasVenta, validar, async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const { id_cliente, cliente_nombre, cliente_telefono, cliente_direccion, fecha, items, forma_pago } = req.body;

    if (!fecha || !items || items.length === 0) {
      return res.status(400).json({ error: 'Fecha y al menos un artículo son requeridos' });
    }

    await conexion.beginTransaction();

    let idClienteFinal = id_cliente || null;

    if (!idClienteFinal && cliente_nombre) {
      const [resultCliente] = await conexion.query(
        'INSERT INTO CLIENTES (nombre, telefono, direccion) VALUES (?, ?, ?)',
        [cliente_nombre, cliente_telefono || null, cliente_direccion || null]
      );
      idClienteFinal = resultCliente.insertId;
    }

    if (!idClienteFinal) {
      await conexion.rollback();
      return res.status(400).json({ error: 'Debes seleccionar o crear un cliente' });
    }

    const [resultVenta] = await conexion.query(
      'INSERT INTO VENTAS (id_cliente, fecha, monto_total, saldo_pendiente, estado) VALUES (?, ?, 0, 0, "pendiente")',
      [idClienteFinal, fecha]
    );
    const idVenta = resultVenta.insertId;

    for (const item of items) {
      await conexion.query(
        'INSERT INTO DETALLE_VENTA (id_venta, id_clasificacion, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [idVenta, item.id_clasificacion, item.cantidad, item.precio_unitario]
      );
    }

    // Si pagó de contado, registramos automáticamente un abono por el total
    if (forma_pago === 'contado') {
      const [ventaActualizada] = await conexion.query('SELECT monto_total FROM VENTAS WHERE id_venta = ?', [idVenta]);
      const total = ventaActualizada[0].monto_total;
      if (total > 0) {
        await conexion.query(
          'INSERT INTO ABONOS (id_venta, fecha, monto) VALUES (?, ?, ?)',
          [idVenta, fecha, total]
        );
      }
    }

    await conexion.commit();
    res.status(201).json({ id_venta: idVenta, mensaje: 'Venta registrada correctamente' });
  } catch (error) {
    await conexion.rollback();
    res.status(400).json({ error: error.sqlMessage || error.message });
  } finally {
    conexion.release();
  }
});

// ---------- ABONOS ----------

router.post('/ventas/:id/abonos', reglasAbono, validar, async (req, res) => {
  try {
    const { fecha, monto } = req.body;
    if (!fecha || !monto) {
      return res.status(400).json({ error: 'Fecha y monto son requeridos' });
    }

    await pool.query(
      'INSERT INTO ABONOS (id_venta, fecha, monto) VALUES (?, ?, ?)',
      [req.params.id, fecha, monto]
    );
    res.status(201).json({ mensaje: 'Abono registrado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

module.exports = router;