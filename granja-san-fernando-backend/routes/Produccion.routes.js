const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Cualquier usuario logueado (admin u operador) puede usar este módulo
router.use(verificarToken);

// ---------- GALERAS ----------

router.get('/galeras', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM GALERAS ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/galeras', async (req, res) => {
  try {
    const { nombre, ubicacion, capacidad } = req.body;
    if (!nombre || !capacidad) {
      return res.status(400).json({ error: 'Nombre y capacidad son requeridos' });
    }
    const [result] = await pool.query(
      'INSERT INTO GALERAS (nombre, ubicacion, capacidad) VALUES (?, ?, ?)',
      [nombre, ubicacion || null, capacidad]
    );
    res.status(201).json({ id_galera: result.insertId, nombre, ubicacion, capacidad });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- LOTES ----------

router.get('/lotes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.id_lote, l.id_galera, g.nombre AS galera_nombre, l.fecha_ingreso,
             l.aves_recibidas, l.aves_activas, l.estado
      FROM LOTES l
      JOIN GALERAS g ON g.id_galera = l.id_galera
      ORDER BY l.estado = 'activo' DESC, l.fecha_ingreso DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/lotes', async (req, res) => {
  try {
    const { id_galera, fecha_ingreso, aves_recibidas } = req.body;
    if (!id_galera || !fecha_ingreso || !aves_recibidas) {
      return res.status(400).json({ error: 'Galera, fecha de ingreso y aves recibidas son requeridos' });
    }

    const [result] = await pool.query(
      'INSERT INTO LOTES (id_galera, fecha_ingreso, aves_recibidas, aves_activas, estado) VALUES (?, ?, ?, ?, ?)',
      [id_galera, fecha_ingreso, aves_recibidas, aves_recibidas, 'activo']
    );
    res.status(201).json({ id_lote: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- POSTURA DIARIA ----------

router.get('/postura', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id_postura, p.id_lote, g.nombre AS galera_nombre, p.fecha,
             p.cantidad_huevos, p.aves_activas_dia, p.tasa_postura
      FROM POSTURA_DIARIA p
      JOIN LOTES l ON l.id_lote = p.id_lote
      JOIN GALERAS g ON g.id_galera = l.id_galera
      ORDER BY p.fecha DESC, p.id_postura DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/postura', async (req, res) => {
  try {
    const { id_lote, fecha, cantidad_huevos } = req.body;
    if (!id_lote || !fecha || cantidad_huevos === undefined) {
      return res.status(400).json({ error: 'Lote, fecha y cantidad de huevos son requeridos' });
    }

    // Tomamos las aves activas actuales del lote directo de la BD (nunca del cliente)
    const [loteRows] = await pool.query('SELECT aves_activas FROM LOTES WHERE id_lote = ?', [id_lote]);
    if (loteRows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    const avesActivasDia = loteRows[0].aves_activas;

    await pool.query(
      'INSERT INTO POSTURA_DIARIA (id_lote, fecha, cantidad_huevos, aves_activas_dia) VALUES (?, ?, ?, ?)',
      [id_lote, fecha, cantidad_huevos, avesActivasDia]
    );
    res.status(201).json({ mensaje: 'Postura registrada correctamente' });
  } catch (error) {
    // Los triggers de validación devuelven un error 45000 con mensaje personalizado
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

// ---------- MORTALIDAD ----------

router.get('/mortalidad', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id_mortalidad, m.id_lote, g.nombre AS galera_nombre, m.fecha, m.cantidad, m.causa
      FROM MORTALIDAD m
      JOIN LOTES l ON l.id_lote = m.id_lote
      JOIN GALERAS g ON g.id_galera = l.id_galera
      ORDER BY m.fecha DESC, m.id_mortalidad DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mortalidad', async (req, res) => {
  try {
    const { id_lote, fecha, cantidad, causa } = req.body;
    if (!id_lote || !fecha || !cantidad) {
      return res.status(400).json({ error: 'Lote, fecha y cantidad son requeridos' });
    }

    await pool.query(
      'INSERT INTO MORTALIDAD (id_lote, fecha, cantidad, causa) VALUES (?, ?, ?, ?)',
      [id_lote, fecha, cantidad, causa || null]
    );
    res.status(201).json({ mensaje: 'Mortalidad registrada correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

module.exports = router;