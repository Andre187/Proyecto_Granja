const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');

const router = express.Router();

router.use(verificarToken, soloAdministrador);

const reglasEditarTrabajador = [
  body('costo_dia').optional().isFloat({ min: 0, max: 10000 }).withMessage('El costo por día debe ser un número válido'),
  body('estado').optional().isIn(['activo', 'inactivo']).withMessage('Estado inválido'),
];

const reglasPago = [
  body('id_trabajador').isInt({ min: 1 }).withMessage('Selecciona un trabajador válido'),
  body('semana_inicio').isISO8601().withMessage('Fecha de inicio inválida'),
  body('semana_fin').isISO8601().withMessage('Fecha de fin inválida').custom((valor, { req }) => {
    if (new Date(valor) < new Date(req.body.semana_inicio)) {
      throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio');
    }
    return true;
  }),
  body('dias_laborados').isInt({ min: 0, max: 7 }).withMessage('Los días laborados deben ser un número entre 0 y 7'),
];

router.get('/trabajadores', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.id_trabajador, t.nombre, t.costo_dia, t.estado, u.usuario AS usuario_vinculado
      FROM TRABAJADORES t
      LEFT JOIN USUARIOS u ON u.id_trabajador = t.id_trabajador
      ORDER BY t.estado = 'activo' DESC, t.nombre
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/trabajadores/:id', reglasEditarTrabajador, validar, async (req, res) => {
  try {
    const { costo_dia, estado } = req.body;

    if (costo_dia !== undefined) {
      await pool.query('UPDATE TRABAJADORES SET costo_dia = ? WHERE id_trabajador = ?', [costo_dia, req.params.id]);
    }
    if (estado !== undefined) {
      await pool.query('UPDATE TRABAJADORES SET estado = ? WHERE id_trabajador = ?', [estado, req.params.id]);
    }

    res.json({ mensaje: 'Trabajador actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pagos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id_pago, p.id_trabajador, t.nombre AS trabajador_nombre,
             p.semana_inicio, p.semana_fin, p.dias_laborados, p.costo_dia_registrado, p.total_pagar
      FROM PAGOS_SEMANALES p
      JOIN TRABAJADORES t ON t.id_trabajador = p.id_trabajador
      ORDER BY p.semana_inicio DESC, p.id_pago DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pagos', reglasPago, validar, async (req, res) => {
  try {
    const { id_trabajador, semana_inicio, semana_fin, dias_laborados, costo_dia_pago } = req.body;

    const [trabajadorRows] = await pool.query('SELECT costo_dia FROM TRABAJADORES WHERE id_trabajador = ?', [id_trabajador]);
    if (trabajadorRows.length === 0) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }

    // Si el admin especifica un costo por día para este pago en particular, se usa ese.
    // Si no, se usa el costo guardado en el perfil del trabajador (comportamiento anterior).
    const costoDiaFinal = (costo_dia_pago !== undefined && costo_dia_pago !== null && costo_dia_pago !== '')
      ? parseFloat(costo_dia_pago)
      : trabajadorRows[0].costo_dia;

    if (!costoDiaFinal || costoDiaFinal <= 0) {
      return res.status(400).json({ error: 'El costo por día debe ser mayor a 0. Edita el costo del trabajador o especifícalo en este pago.' });
    }

    await pool.query(
      'INSERT INTO PAGOS_SEMANALES (id_trabajador, semana_inicio, semana_fin, dias_laborados, costo_dia_registrado) VALUES (?, ?, ?, ?, ?)',
      [id_trabajador, semana_inicio, semana_fin, dias_laborados, costoDiaFinal]
    );
    res.status(201).json({ mensaje: 'Pago registrado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

module.exports = router;