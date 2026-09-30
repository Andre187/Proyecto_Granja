const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');
const { manejarError } = require('../utils/manejarError');
const { fecha, fechaOpcional, texto, validarParametroId } = require('../utils/validadores');

const router = express.Router();

router.use(verificarToken);
validarParametroId(router);

// ---------- Reglas de validación ----------

const reglasGalera = [
  texto('nombre', { min: 2, max: 100, nombre: 'El nombre de la galera' }),
  texto('ubicacion', { max: 150, requerido: false, nombre: 'La ubicación' }),
  body('capacidad')
    .isInt({ min: 1, max: 100000 }).withMessage('La capacidad debe ser un número entero mayor a 0'),
  fechaOpcional('fecha_ingreso', { mensaje: 'Fecha de ingreso inválida' }),
  body('aves_recibidas')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100000 }).withMessage('Las aves recibidas deben ser un número entero mayor a 0'),
];

const reglasLote = [
  body('id_galera').isInt({ min: 1 }).withMessage('Selecciona una galera válida'),
  fecha('fecha_ingreso', { mensaje: 'Fecha de ingreso inválida' }),
  body('aves_recibidas').isInt({ min: 1, max: 100000 }).withMessage('Las aves recibidas deben ser un número entero mayor a 0'),
];

const reglasPostura = [
  body('id_lote').isInt({ min: 1 }).withMessage('Selecciona un lote válido'),
  fecha('fecha'),
  body('cantidad_huevos').isInt({ min: 0, max: 100000 }).withMessage('La cantidad de huevos debe ser un número entero válido'),
];

const reglasMortalidad = [
  body('id_lote').isInt({ min: 1 }).withMessage('Selecciona un lote válido'),
  fecha('fecha'),
  body('cantidad').isInt({ min: 1, max: 100000 }).withMessage('La cantidad debe ser un número entero mayor a 0'),
  texto('causa', { max: 150, requerido: false, nombre: 'La causa' }),
];

// ---------- galeras ----------

router.get('/galeras', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT g.id_galera, g.nombre, g.ubicacion, g.capacidad, g.estado,
             l.id_lote, l.fecha_ingreso, l.aves_recibidas, l.aves_activas
      FROM galeras g
      LEFT JOIN lotes l ON l.id_galera = g.id_galera AND l.estado = 'activo'
      ORDER BY g.nombre
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/galeras', soloAdministrador, reglasGalera, validar, async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const { nombre, ubicacion, capacidad, fecha_ingreso, aves_recibidas } = req.body;

    await conexion.beginTransaction();

    const [resultGalera] = await conexion.query(
      'INSERT INTO galeras (nombre, ubicacion, capacidad) VALUES (?, ?, ?)',
      [nombre, ubicacion || null, capacidad]
    );
    const idGalera = resultGalera.insertId;

    let idLote = null;
    if (fecha_ingreso && aves_recibidas) {
      const [resultLote] = await conexion.query(
        'INSERT INTO lotes (id_galera, fecha_ingreso, aves_recibidas, aves_activas, estado) VALUES (?, ?, ?, ?, ?)',
        [idGalera, fecha_ingreso, aves_recibidas, aves_recibidas, 'activo']
      );
      idLote = resultLote.insertId;
      await conexion.query("UPDATE galeras SET estado = 'ocupada' WHERE id_galera = ?", [idGalera]);
    }

    await conexion.commit();
    res.status(201).json({ id_galera: idGalera, id_lote: idLote, nombre, ubicacion, capacidad });
  } catch (error) {
    await conexion.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una galera con ese nombre' });
    }
    manejarError(res, error);
  } finally {
    conexion.release();
  }
});

// Reactiva una galera que estaba en desinfección, dejándola disponible para un nuevo lote.
router.put('/galeras/:id/reactivar', soloAdministrador, async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE galeras SET estado = 'disponible' WHERE id_galera = ? AND estado = 'desinfeccion'",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Galera no encontrada o no estaba en desinfección' });
    }
    res.json({ mensaje: 'Galera reactivada, ya está disponible para un nuevo lote' });
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- lotes ----------

router.get('/lotes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.id_lote, l.id_galera, g.nombre AS galera_nombre, l.fecha_ingreso,
             l.aves_recibidas, l.aves_activas, l.estado
      FROM lotes l
      JOIN galeras g ON g.id_galera = l.id_galera
      ORDER BY l.estado = 'activo' DESC, l.fecha_ingreso DESC
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/lotes', soloAdministrador, reglasLote, validar, async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const { id_galera, fecha_ingreso, aves_recibidas } = req.body;

    const [galeraRows] = await conexion.query('SELECT estado FROM galeras WHERE id_galera = ?', [id_galera]);
    if (galeraRows.length === 0) {
      return res.status(404).json({ error: 'Galera no encontrada' });
    }
    if (galeraRows[0].estado !== 'disponible') {
      return res.status(400).json({ error: 'Esta galera no está disponible (ocupada o en desinfección)' });
    }

    await conexion.beginTransaction();
    const [result] = await conexion.query(
      'INSERT INTO lotes (id_galera, fecha_ingreso, aves_recibidas, aves_activas, estado) VALUES (?, ?, ?, ?, ?)',
      [id_galera, fecha_ingreso, aves_recibidas, aves_recibidas, 'activo']
    );
    await conexion.query("UPDATE galeras SET estado = 'ocupada' WHERE id_galera = ?", [id_galera]);
    await conexion.commit();

    res.status(201).json({ id_lote: result.insertId });
  } catch (error) {
    await conexion.rollback();
    manejarError(res, error);
  } finally {
    conexion.release();
  }
});

// Finaliza un lote y decide en qué queda la galera: lista para un lote nuevo de inmediato,
// o en desinfección hasta que el administrador la reactive manualmente.
router.put('/lotes/:id/finalizar', soloAdministrador, async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const siguienteEstado = req.body.siguiente_estado === 'disponible' ? 'disponible' : 'desinfeccion';

    const [loteRows] = await conexion.query('SELECT id_galera FROM lotes WHERE id_lote = ? AND estado = "activo"', [req.params.id]);
    if (loteRows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado o ya estaba finalizado' });
    }

    await conexion.beginTransaction();
    await conexion.query("UPDATE lotes SET estado = 'finalizado' WHERE id_lote = ?", [req.params.id]);
    await conexion.query('UPDATE galeras SET estado = ? WHERE id_galera = ?', [siguienteEstado, loteRows[0].id_galera]);
    await conexion.commit();

    res.json({ mensaje: 'Lote finalizado correctamente' });
  } catch (error) {
    await conexion.rollback();
    manejarError(res, error);
  } finally {
    conexion.release();
  }
});

// ---------- POSTURA DIARIA ----------

router.get('/postura', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id_postura, p.id_lote, g.nombre AS galera_nombre, p.fecha,
             p.cantidad_huevos, p.aves_activas_dia, p.tasa_postura
      FROM postura_diaria p
      JOIN lotes l ON l.id_lote = p.id_lote
      JOIN galeras g ON g.id_galera = l.id_galera
      ORDER BY p.fecha DESC, p.id_postura DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/postura', reglasPostura, validar, async (req, res) => {
  try {
    const { id_lote, fecha, cantidad_huevos } = req.body;

    const [loteRows] = await pool.query('SELECT aves_activas, estado FROM lotes WHERE id_lote = ?', [id_lote]);
    if (loteRows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    if (loteRows[0].estado !== 'activo') {
      return res.status(400).json({ error: 'Este lote ya está finalizado; no se puede registrar postura' });
    }
    const avesActivasDia = loteRows[0].aves_activas;

    const [duplicado] = await pool.query('SELECT 1 FROM postura_diaria WHERE id_lote = ? AND fecha = ? LIMIT 1', [id_lote, fecha]);
    if (duplicado.length > 0) {
      return res.status(409).json({ error: 'Ya hay una postura registrada para este lote en esa fecha' });
    }

    // Sin tope contra las aves activas: lo recolectado en un día puede superar a las aves
    // registradas (recolección de días anteriores, ajustes de conteo, etc.). La tasa de
    // postura simplemente se muestra tal cual, aunque pase del 100 %.

    await pool.query(
      'INSERT INTO postura_diaria (id_lote, fecha, cantidad_huevos, aves_activas_dia) VALUES (?, ?, ?, ?)',
      [id_lote, fecha, cantidad_huevos, avesActivasDia]
    );
    res.status(201).json({ mensaje: 'Postura registrada correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

// ---------- mortalidad ----------

router.get('/mortalidad', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id_mortalidad, m.id_lote, g.nombre AS galera_nombre, m.fecha, m.cantidad, m.causa
      FROM mortalidad m
      JOIN lotes l ON l.id_lote = m.id_lote
      JOIN galeras g ON g.id_galera = l.id_galera
      ORDER BY m.fecha DESC, m.id_mortalidad DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/mortalidad', reglasMortalidad, validar, async (req, res) => {
  try {
    const { id_lote, fecha, cantidad, causa } = req.body;

    const [loteRows] = await pool.query('SELECT estado FROM lotes WHERE id_lote = ?', [id_lote]);
    if (loteRows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    if (loteRows[0].estado !== 'activo') {
      return res.status(400).json({ error: 'Este lote ya está finalizado; no se puede registrar mortalidad' });
    }

    await pool.query(
      'INSERT INTO mortalidad (id_lote, fecha, cantidad, causa) VALUES (?, ?, ?, ?)',
      [id_lote, fecha, cantidad, causa || null]
    );
    res.status(201).json({ mensaje: 'Mortalidad registrada correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

module.exports = router;