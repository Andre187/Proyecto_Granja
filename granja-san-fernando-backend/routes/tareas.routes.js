const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');

const router = express.Router();

router.use(verificarToken);

const reglasTarea = [
  body('id_trabajador').isInt({ min: 1 }).withMessage('Selecciona un trabajador válido'),
  body('id_galera').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Galera inválida'),
  body('descripcion').trim().notEmpty().withMessage('La descripción es requerida')
    .isLength({ max: 255 }).withMessage('La descripción no puede superar 255 caracteres'),
  body('fecha_asignacion').isISO8601().withMessage('Fecha de asignación inválida'),
  body('fecha_limite').optional({ checkFalsy: true }).isISO8601().withMessage('Fecha límite inválida'),
];

const reglasEstado = [
  body('estado').isIn(['pendiente', 'en proceso', 'finalizado']).withMessage('Estado inválido'),
];

router.get('/trabajadores', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.id_trabajador, t.nombre
      FROM TRABAJADORES t
      JOIN USUARIOS u ON u.id_trabajador = t.id_trabajador
      WHERE t.estado = 'activo'
      ORDER BY t.nombre
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tareas', async (req, res) => {
  try {
    let query = `
      SELECT t.id_tarea, t.id_trabajador, tr.nombre AS trabajador_nombre,
             t.id_galera, g.nombre AS galera_nombre,
             t.descripcion, t.fecha_asignacion, t.fecha_limite, t.estado
      FROM TAREAS t
      JOIN TRABAJADORES tr ON tr.id_trabajador = t.id_trabajador
      LEFT JOIN GALERAS g ON g.id_galera = t.id_galera
    `;
    const params = [];

    if (req.usuario.rol !== 'administrador') {
      if (!req.usuario.id_trabajador) {
        return res.json([]);
      }
      query += ' WHERE t.id_trabajador = ?';
      params.push(req.usuario.id_trabajador);
    }

    query += ' ORDER BY (t.estado = "finalizado"), t.fecha_limite IS NULL, t.fecha_limite ASC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tareas', soloAdministrador, reglasTarea, validar, async (req, res) => {
  try {
    const { id_trabajador, id_galera, descripcion, fecha_asignacion, fecha_limite } = req.body;
    await pool.query(
      'INSERT INTO TAREAS (id_trabajador, id_galera, descripcion, fecha_asignacion, fecha_limite, estado) VALUES (?, ?, ?, ?, ?, "pendiente")',
      [id_trabajador, id_galera || null, descripcion, fecha_asignacion, fecha_limite || null]
    );
    res.status(201).json({ mensaje: 'Tarea asignada correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

router.put('/tareas/:id/estado', reglasEstado, validar, async (req, res) => {
  try {
    const { estado } = req.body;

    if (req.usuario.rol !== 'administrador') {
      const [rows] = await pool.query('SELECT id_trabajador FROM TAREAS WHERE id_tarea = ?', [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }
      if (rows[0].id_trabajador !== req.usuario.id_trabajador) {
        return res.status(403).json({ error: 'No puedes modificar una tarea que no es tuya' });
      }
    }

    await pool.query('UPDATE TAREAS SET estado = ? WHERE id_tarea = ?', [estado, req.params.id]);
    res.json({ mensaje: 'Estado actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;