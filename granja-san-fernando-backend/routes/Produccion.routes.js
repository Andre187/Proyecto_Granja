const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');

const router = express.Router();

router.use(verificarToken);

// ---------- Reglas de validación ----------

const reglasGalera = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre de la galera es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('ubicacion')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 150 }).withMessage('La ubicación no puede superar 150 caracteres'),
  body('capacidad')
    .isInt({ min: 1, max: 100000 }).withMessage('La capacidad debe ser un número entero mayor a 0'),
  body('fecha_ingreso')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Fecha de ingreso inválida'),
  body('aves_recibidas')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100000 }).withMessage('Las aves recibidas deben ser un número entero mayor a 0'),
];

const reglasLote = [
  body('id_galera').isInt({ min: 1 }).withMessage('Selecciona una galera válida'),
  body('fecha_ingreso').isISO8601().withMessage('Fecha de ingreso inválida'),
  body('aves_recibidas').isInt({ min: 1, max: 100000 }).withMessage('Las aves recibidas deben ser un número entero mayor a 0'),
];

const reglasPostura = [
  body('id_lote').isInt({ min: 1 }).withMessage('Selecciona un lote válido'),
  body('fecha').isISO8601().withMessage('Fecha inválida').custom((valor) => {
    if (new Date(valor) > new Date()) throw new Error('La fecha no puede ser futura');
    return true;
  }),
  body('cantidad_huevos').isInt({ min: 0, max: 100000 }).withMessage('La cantidad de huevos debe ser un número entero válido'),
];

const reglasMortalidad = [
  body('id_lote').isInt({ min: 1 }).withMessage('Selecciona un lote válido'),
  body('fecha').isISO8601().withMessage('Fecha inválida').custom((valor) => {
    if (new Date(valor) > new Date()) throw new Error('La fecha no puede ser futura');
    return true;
  }),
  body('cantidad').isInt({ min: 1, max: 100000 }).withMessage('La cantidad debe ser un número entero mayor a 0'),
  body('causa').optional({ checkFalsy: true }).trim().isLength({ max: 150 }).withMessage('La causa no puede superar 150 caracteres'),
];

// ---------- GALERAS ----------

router.get('/galeras', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM GALERAS ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/galeras', soloAdministrador, reglasGalera, validar, async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const { nombre, ubicacion, capacidad, fecha_ingreso, aves_recibidas } = req.body;

    await conexion.beginTransaction();

    const [resultGalera] = await conexion.query(
      'INSERT INTO GALERAS (nombre, ubicacion, capacidad) VALUES (?, ?, ?)',
      [nombre, ubicacion || null, capacidad]
    );
    const idGalera = resultGalera.insertId;

    let idLote = null;
    if (fecha_ingreso && aves_recibidas) {
      const [resultLote] = await conexion.query(
        'INSERT INTO LOTES (id_galera, fecha_ingreso, aves_recibidas, aves_activas, estado) VALUES (?, ?, ?, ?, ?)',
        [idGalera, fecha_ingreso, aves_recibidas, aves_recibidas, 'activo']
      );
      idLote = resultLote.insertId;
    }

    await conexion.commit();
    res.status(201).json({ id_galera: idGalera, id_lote: idLote, nombre, ubicacion, capacidad });
  } catch (error) {
    await conexion.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una galera con ese nombre' });
    }
    res.status(500).json({ error: error.message });
  } finally {
    conexion.release();
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

router.post('/lotes', soloAdministrador, reglasLote, validar, async (req, res) => {
  try {
    const { id_galera, fecha_ingreso, aves_recibidas } = req.body;

    const [result] = await pool.query(
      'INSERT INTO LOTES (id_galera, fecha_ingreso, aves_recibidas, aves_activas, estado) VALUES (?, ?, ?, ?, ?)',
      [id_galera, fecha_ingreso, aves_recibidas, aves_recibidas, 'activo']
    );
    res.status(201).json({ id_lote: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/lotes/:id/finalizar', soloAdministrador, async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE LOTES SET estado = 'finalizado' WHERE id_lote = ? AND estado = 'activo'",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lote no encontrado o ya estaba finalizado' });
    }
    res.json({ mensaje: 'Lote finalizado correctamente' });
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

router.post('/postura', reglasPostura, validar, async (req, res) => {
  try {
    const { id_lote, fecha, cantidad_huevos } = req.body;

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

router.post('/mortalidad', reglasMortalidad, validar, async (req, res) => {
  try {
    const { id_lote, fecha, cantidad, causa } = req.body;

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