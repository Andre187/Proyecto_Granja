const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');
const { manejarError } = require('../utils/manejarError');
const { conActor } = require('../utils/actor');
const { fecha, decimal2, texto, validarParametroId } = require('../utils/validadores');
const { esAdminOSuper } = require('../utils/roles');

const reglasVenta = [
  fecha('fecha'),
  body('forma_pago').optional().isIn(['contado', 'credito']).withMessage('Forma de pago inválida'),
  body('id_cliente').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Cliente inválido'),
  texto('cliente_nombre', { max: 100, requerido: false, nombre: 'El nombre del cliente' }),
  texto('cliente_telefono', { max: 20, requerido: false, nombre: 'El teléfono' }),
  texto('cliente_direccion', { max: 200, requerido: false, nombre: 'La dirección' }),
  body('items').isArray({ min: 1, max: 50 }).withMessage('Debes agregar entre 1 y 50 artículos'),
  body('items.*.id_clasificacion').isInt({ min: 1 }).withMessage('Selecciona una clasificación válida en cada artículo'),
  body('items.*.cantidad').isInt({ min: 1, max: 100000 }).withMessage('La cantidad debe ser un número entero mayor a 0'),
  decimal2(body('items.*.precio_unitario'), { min: 0.01, max: 100000, mensaje: 'El precio unitario debe ser mayor a 0' }),
];

const reglasAbono = [
  fecha('fecha'),
  decimal2(body('monto'), { min: 0.01, max: 1000000, mensaje: 'El monto debe ser mayor a 0' }),
];

const reglasCliente = [
  texto('nombre', { max: 100, nombre: 'El nombre del cliente' }),
  texto('telefono', { max: 20, requerido: false, nombre: 'El teléfono' }),
  texto('direccion', { max: 200, requerido: false, nombre: 'La dirección' }),
];

const router = express.Router();

router.use(verificarToken);
validarParametroId(router);

// ---------- CLIENTES ----------

router.get('/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CLIENTES ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/clientes', reglasCliente, validar, async (req, res) => {
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
    manejarError(res, error);
  }
});

// Permite completar/editar los datos de contacto de un cliente ya existente
router.put('/clientes/:id', reglasCliente, validar, async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    }
    const [resultado] = await pool.query(
      'UPDATE CLIENTES SET nombre = ?, telefono = ?, direccion = ? WHERE id_cliente = ?',
      [nombre, telefono || null, direccion || null, req.params.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ mensaje: 'Cliente actualizado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- CLASIFICACIONES DE HUEVO (catálogo fijo, con existencia real) ----------

router.get('/clasificaciones', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ch.id_clasificacion, ch.nombre,
             COALESCE(hs.existencia_actual, 0) AS existencia_actual,
             COALESCE(hs.nivel_minimo, 0) AS nivel_minimo
      FROM CLASIFICACIONES_HUEVO ch
      LEFT JOIN HUEVOS_STOCK hs ON hs.id_clasificacion = ch.id_clasificacion
      ORDER BY ch.id_clasificacion
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
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
      WHERE estado != 'anulado'
    `);
    res.json(rows[0]);
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- VENTAS ----------

// El operador solo trabaja con cuentas por cobrar: las ventas pagadas o
// anuladas (saldo 0) quedan reservadas al administrador y superadministrador.
router.get('/ventas', async (req, res) => {
  try {
    const filtroOperador = esAdminOSuper(req.usuario.rol) ? '' : 'WHERE v.saldo_pendiente > 0';
    const [rows] = await pool.query(`
      SELECT v.id_venta, v.fecha, c.nombre AS cliente_nombre, v.monto_total, v.saldo_pendiente, v.estado, v.motivo_anulacion
      FROM VENTAS v
      JOIN CLIENTES c ON c.id_cliente = v.id_cliente
      ${filtroOperador}
      ORDER BY v.fecha DESC, v.id_venta DESC
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
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

    // Para el operador, una venta sin saldo pendiente se trata como inexistente
    if (ventaRows.length === 0 || (!esAdminOSuper(req.usuario.rol) && Number(ventaRows[0].saldo_pendiente) <= 0)) {
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
    manejarError(res, error);
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

    // Bloquea las filas de existencia de los tamaños vendidos (en orden, para evitar
    // interbloqueos) ANTES de validar y descontar. Así dos ventas simultáneas no pueden
    // leer la misma existencia y vender más de lo que hay.
    const idsClasificacion = [...new Set(items.map((item) => Number(item.id_clasificacion)))].sort((a, b) => a - b);
    await conexion.query(
      'SELECT id_stock FROM HUEVOS_STOCK WHERE id_clasificacion IN (?) ORDER BY id_clasificacion FOR UPDATE',
      [idsClasificacion]
    );

    let idClienteFinal = id_cliente || null;

    if (idClienteFinal) {
      const [clienteRows] = await conexion.query('SELECT id_cliente FROM CLIENTES WHERE id_cliente = ?', [idClienteFinal]);
      if (clienteRows.length === 0) {
        await conexion.rollback();
        return res.status(400).json({ error: 'El cliente seleccionado no existe' });
      }
    }

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
    manejarError(res, error);
  } finally {
    conexion.release();
  }
});

router.post('/ventas/:id/abonos', reglasAbono, validar, async (req, res) => {
  try {
    const { fecha, monto } = req.body;
    if (!fecha || !monto) {
      return res.status(400).json({ error: 'Fecha y monto son requeridos' });
    }

    const [ventaRows] = await pool.query('SELECT id_venta FROM VENTAS WHERE id_venta = ?', [req.params.id]);
    if (ventaRows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    await pool.query(
      'INSERT INTO ABONOS (id_venta, fecha, monto) VALUES (?, ?, ?)',
      [req.params.id, fecha, monto]
    );
    res.status(201).json({ mensaje: 'Abono registrado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});


// Anula una venta y devuelve correctamente la existencia de huevos que se había descontado.
// Esta es la ÚNICA forma segura de deshacer una venta -- nunca se debe borrar directamente en SQL,
// porque eso descuadra la existencia (el trigger de descuento no se revierte solo).
const reglasAnulacion = [texto('motivo', { max: 255, requerido: false, nombre: 'El motivo' })];

router.put('/ventas/:id/anular', soloAdministrador, reglasAnulacion, validar, async (req, res) => {
  try {
    const motivo = req.body.motivo || null;

    // conActor marca quién anula, para la bitácora de la BD
    const respuesta = await conActor(req, async (conexion) => {
      try {
        await conexion.beginTransaction();

        // FOR UPDATE: si llegan dos anulaciones a la vez, la segunda espera y luego ve
        // 'anulado', en vez de devolver la existencia dos veces.
        const [ventaRows] = await conexion.query('SELECT estado FROM VENTAS WHERE id_venta = ? FOR UPDATE', [req.params.id]);
        if (ventaRows.length === 0) {
          await conexion.rollback();
          return { status: 404, cuerpo: { error: 'Venta no encontrada' } };
        }
        if (ventaRows[0].estado === 'anulado') {
          await conexion.rollback();
          return { status: 400, cuerpo: { error: 'Esta venta ya estaba anulada' } };
        }

        const [detalle] = await conexion.query(
          'SELECT id_clasificacion, cantidad FROM DETALLE_VENTA WHERE id_venta = ? ORDER BY id_clasificacion',
          [req.params.id]
        );

        // Devolvemos manualmente cada cantidad a HUEVOS_STOCK (el trigger solo descuenta al insertar, no al anular)
        for (const item of detalle) {
          await conexion.query(
            'UPDATE HUEVOS_STOCK SET existencia_actual = existencia_actual + ? WHERE id_clasificacion = ?',
            [item.cantidad, item.id_clasificacion]
          );
        }

        await conexion.query(
          "UPDATE VENTAS SET estado = 'anulado', saldo_pendiente = 0, motivo_anulacion = ? WHERE id_venta = ?",
          [motivo, req.params.id]
        );

        const [[abonos]] = await conexion.query('SELECT COALESCE(SUM(monto), 0) AS total FROM ABONOS WHERE id_venta = ?', [req.params.id]);

        await conexion.commit();

        // Los abonos se conservan como historial; el dinero ya cobrado hay que devolverlo al cliente
        const aDevolver = Number(abonos.total);
        return {
          status: 200,
          cuerpo: {
            mensaje: 'Venta anulada correctamente. La existencia de huevos fue devuelta.'
              + (aDevolver > 0 ? ` Recuerda devolver al cliente lo ya cobrado: Q ${aDevolver.toFixed(2)}.` : ''),
            abonos_a_devolver: aDevolver,
          },
        };
      } catch (error) {
        await conexion.rollback();
        throw error;
      }
    });

    res.status(respuesta.status).json(respuesta.cuerpo);
  } catch (error) {
    manejarError(res, error);
  }
});

module.exports = router;