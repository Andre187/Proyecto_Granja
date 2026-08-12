const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verificarToken);

// ---------- LOTES (para los selectores) ----------

router.get('/lotes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.id_lote, g.nombre AS galera_nombre, l.estado
      FROM LOTES l
      JOIN GALERAS g ON g.id_galera = l.id_galera
      WHERE l.estado = 'activo'
      ORDER BY g.nombre
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- VACUNACIÓN ----------

router.get('/vacunacion', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.id_vacunacion, v.id_lote, g.nombre AS galera_nombre, v.fecha, v.tipo_vacuna, v.semana_aplicacion
      FROM VACUNACION v
      JOIN LOTES l ON l.id_lote = v.id_lote
      JOIN GALERAS g ON g.id_galera = l.id_galera
      ORDER BY v.fecha DESC, v.id_vacunacion DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/vacunacion', async (req, res) => {
  try {
    const { id_lote, fecha, tipo_vacuna, semana_aplicacion } = req.body;
    if (!id_lote || !fecha || !tipo_vacuna || !semana_aplicacion) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    await pool.query(
      'INSERT INTO VACUNACION (id_lote, fecha, tipo_vacuna, semana_aplicacion) VALUES (?, ?, ?, ?)',
      [id_lote, fecha, tipo_vacuna, semana_aplicacion]
    );
    res.status(201).json({ mensaje: 'Vacunación registrada correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// ---------- SEGUIMIENTO DE PESO ----------

router.get('/peso', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id_seguimiento, s.id_lote, g.nombre AS galera_nombre, s.fecha, s.semana, s.peso_promedio, s.uniformidad
      FROM SEGUIMIENTO_PESO s
      JOIN LOTES l ON l.id_lote = s.id_lote
      JOIN GALERAS g ON g.id_galera = l.id_galera
      ORDER BY s.fecha DESC, s.id_seguimiento DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/peso', async (req, res) => {
  try {
    const { id_lote, fecha, semana, peso_promedio, uniformidad } = req.body;
    if (!id_lote || !fecha || !semana || !peso_promedio || uniformidad === undefined) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    await pool.query(
      'INSERT INTO SEGUIMIENTO_PESO (id_lote, fecha, semana, peso_promedio, uniformidad) VALUES (?, ?, ?, ?, ?)',
      [id_lote, fecha, semana, peso_promedio, uniformidad]
    );
    res.status(201).json({ mensaje: 'Seguimiento de peso registrado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

module.exports = router;