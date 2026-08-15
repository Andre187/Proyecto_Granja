const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');

const reglasGasto = [
  body('fecha').isISO8601().withMessage('Fecha inválida'),
  body('descripcion').trim().notEmpty().withMessage('La descripción es requerida')
    .isLength({ max: 200 }).withMessage('La descripción no puede superar 200 caracteres'),
  body('monto').isFloat({ min: 0.01, max: 1000000 }).withMessage('El monto debe ser mayor a 0'),
];

const router = express.Router();

// Módulo exclusivo de administrador
router.use(verificarToken, soloAdministrador);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM GASTOS ORDER BY fecha DESC, id_gasto DESC LIMIT 50');
    const [totalRows] = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM GASTOS');
    res.json({ gastos: rows, total: totalRows[0].total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', reglasGasto, validar, async (req, res) => {
  try {
    const { fecha, descripcion, monto } = req.body;
    if (!fecha || !descripcion || !monto) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    await pool.query(
      'INSERT INTO GASTOS (fecha, descripcion, monto) VALUES (?, ?, ?)',
      [fecha, descripcion, monto]
    );
    res.status(201).json({ mensaje: 'Gasto registrado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM GASTOS WHERE id_gasto = ?', [req.params.id]);
    res.json({ mensaje: 'Gasto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;