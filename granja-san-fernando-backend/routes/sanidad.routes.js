const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');
const { manejarError } = require('../utils/manejarError');
const { fecha, texto } = require('../utils/validadores');

const router = express.Router();

router.use(verificarToken);

const reglasVacunacion = [
  body('id_lote').isInt({ min: 1 }).withMessage('Selecciona un lote válido'),
  fecha('fecha'),
  texto('tipo_vacuna', { max: 100, nombre: 'El tipo de vacuna' }),
  body('semana_aplicacion').isInt({ min: 0, max: 200 }).withMessage('La semana de aplicación debe ser un número entero válido'),
];

const reglasPeso = [
  body('id_lote').isInt({ min: 1 }).withMessage('Selecciona un lote válido'),
  fecha('fecha'),
  body('semana').isInt({ min: 0, max: 200 }).withMessage('La semana debe ser un número entero válido'),
  body('peso_promedio').isFloat({ min: 0.01, max: 20 }).withMessage('El peso promedio debe ser mayor a 0'),
  body('uniformidad').isFloat({ min: 0, max: 100 }).withMessage('La uniformidad debe estar entre 0 y 100'),
];

router.get('/lotes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.id_lote, g.nombre AS galera_nombre, l.estado
      FROM lotes l
      JOIN galeras g ON g.id_galera = l.id_galera
      WHERE l.estado = 'activo'
      ORDER BY g.nombre
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.get('/vacunacion', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.id_vacunacion, v.id_lote, g.nombre AS galera_nombre, v.fecha, v.tipo_vacuna, v.semana_aplicacion
      FROM vacunacion v
      JOIN lotes l ON l.id_lote = v.id_lote
      JOIN galeras g ON g.id_galera = l.id_galera
      ORDER BY v.fecha DESC, v.id_vacunacion DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/vacunacion', reglasVacunacion, validar, async (req, res) => {
  try {
    const { id_lote, fecha, tipo_vacuna, semana_aplicacion } = req.body;
    await pool.query(
      'INSERT INTO vacunacion (id_lote, fecha, tipo_vacuna, semana_aplicacion) VALUES (?, ?, ?, ?)',
      [id_lote, fecha, tipo_vacuna, semana_aplicacion]
    );
    res.status(201).json({ mensaje: 'Vacunación registrada correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

router.get('/peso', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id_seguimiento, s.id_lote, g.nombre AS galera_nombre, s.fecha, s.semana, s.peso_promedio, s.uniformidad
      FROM seguimiento_peso s
      JOIN lotes l ON l.id_lote = s.id_lote
      JOIN galeras g ON g.id_galera = l.id_galera
      ORDER BY s.fecha DESC, s.id_seguimiento DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/peso', reglasPeso, validar, async (req, res) => {
  try {
    const { id_lote, fecha, semana, peso_promedio, uniformidad } = req.body;
    await pool.query(
      'INSERT INTO seguimiento_peso (id_lote, fecha, semana, peso_promedio, uniformidad) VALUES (?, ?, ?, ?, ?)',
      [id_lote, fecha, semana, peso_promedio, uniformidad]
    );
    res.status(201).json({ mensaje: 'Seguimiento de peso registrado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

module.exports = router;