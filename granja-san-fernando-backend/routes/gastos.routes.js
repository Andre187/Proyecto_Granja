const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');
const { manejarError } = require('../utils/manejarError');
const { conActor } = require('../utils/actor');
const { fecha, fechaQuery, decimal2, texto, validarParametroId } = require('../utils/validadores');

const router = express.Router();

router.use(verificarToken, soloAdministrador);
validarParametroId(router);

const CATEGORIAS_VALIDAS = ['mantenimiento', 'transporte', 'servicios', 'insumos', 'otros'];

const reglasGasto = [
  fecha('fecha'),
  texto('descripcion', { max: 200, nombre: 'La descripción' }),
  body('categoria').isIn(CATEGORIAS_VALIDAS).withMessage('Categoría inválida'),
  decimal2(body('monto'), { min: 0.01, max: 1000000, mensaje: 'El monto debe ser mayor a 0' }),
];

const reglasListado = [fechaQuery('desde'), fechaQuery('hasta')];

// Calcula el rango de fechas según el período pedido, igual que en Reportes
function rangoFechas(periodo) {
  const hoy = new Date();
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  };
  let desde;

  if (periodo === 'semana') {
    desde = new Date(hoy);
    desde.setDate(desde.getDate() - 6);
  } else if (periodo === 'mes') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  } else {
    desde = new Date(hoy);
  }

  return { desde: fmt(desde), hasta: fmt(hoy) };
}

router.get('/', reglasListado, validar, async (req, res) => {
  try {
    let periodo = ['hoy', 'semana', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'mes';
    let desde, hasta;

    if (req.query.desde && req.query.hasta) {
      desde = req.query.desde;
      hasta = req.query.hasta;
      periodo = 'personalizado';
    } else {
      ({ desde, hasta } = rangoFechas(periodo));
    }

    const [gastos] = await pool.query(
      'SELECT * FROM gastos WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC, id_gasto DESC',
      [desde, hasta]
    );

    const [totalRows] = await pool.query(
      "SELECT COALESCE(SUM(monto),0) AS total FROM gastos WHERE fecha BETWEEN ? AND ? AND estado != 'anulado'",
      [desde, hasta]
    );

    const [porCategoria] = await pool.query(
      `SELECT categoria, COALESCE(SUM(monto),0) AS total, COUNT(*) AS cantidad
       FROM gastos WHERE fecha BETWEEN ? AND ? AND estado != 'anulado'
       GROUP BY categoria ORDER BY total DESC`,
      [desde, hasta]
    );

    res.json({
      periodo,
      rango: { desde, hasta },
      gastos,
      total: totalRows[0].total,
      por_categoria: porCategoria,
    });
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/', reglasGasto, validar, async (req, res) => {
  try {
    const { fecha, descripcion, categoria, monto } = req.body;
    await pool.query(
      'INSERT INTO gastos (fecha, descripcion, categoria, monto) VALUES (?, ?, ?, ?)',
      [fecha, descripcion, categoria, monto]
    );
    res.status(201).json({ mensaje: 'Gasto registrado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

router.put('/:id', reglasGasto, validar, async (req, res) => {
  try {
    const { fecha, descripcion, categoria, monto } = req.body;
    const [result] = await pool.query(
      "UPDATE gastos SET fecha = ?, descripcion = ?, categoria = ?, monto = ? WHERE id_gasto = ? AND estado != 'anulado'",
      [fecha, descripcion, categoria, monto, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Gasto no encontrado, o ya está anulado y no se puede editar' });
    }
    res.json({ mensaje: 'Gasto actualizado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

// Anula un gasto en vez de borrarlo -- el registro se conserva para auditoría,
// igual que las ventas, solo se excluye de los totales.
router.put('/:id/anular', async (req, res) => {
  try {
    const [result] = await conActor(req, (conexion) => conexion.query(
      "UPDATE gastos SET estado = 'anulado' WHERE id_gasto = ? AND estado != 'anulado'",
      [req.params.id]
    ));
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Gasto no encontrado o ya estaba anulado' });
    }
    res.json({ mensaje: 'Gasto anulado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

module.exports = router;