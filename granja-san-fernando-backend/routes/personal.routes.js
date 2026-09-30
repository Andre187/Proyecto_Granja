const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');
const { manejarError } = require('../utils/manejarError');
const { conActor } = require('../utils/actor');
const { fecha, decimal2, texto, validarParametroId } = require('../utils/validadores');

const router = express.Router();

router.use(verificarToken, soloAdministrador);
validarParametroId(router);

// Personal eventual (por día) que no necesita cuenta de usuario
const reglasCrearTrabajador = [
  texto('nombre', { min: 2, max: 100, nombre: 'El nombre' }),
  decimal2(body('costo_dia'), { min: 0.01, max: 10000, mensaje: 'El costo por día debe ser mayor a 0' }),
];

const reglasEditarTrabajador = [
  decimal2(body('costo_dia').optional(), { min: 0, max: 10000, mensaje: 'El costo por día debe ser un número válido' }),
  body('estado').optional().isIn(['activo', 'inactivo']).withMessage('Estado inválido'),
];

const reglasPago = [
  body('id_trabajador').isInt({ min: 1 }).withMessage('Selecciona un trabajador válido'),
  fecha('semana_inicio', { mensaje: 'Fecha de inicio inválida' }),
  fecha('semana_fin', { mensaje: 'Fecha de fin inválida' }).custom((valor, { req }) => {
    if (valor < req.body.semana_inicio) {
      throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio');
    }
    return true;
  }),
  body('dias_laborados').isInt({ min: 0, max: 7 }).withMessage('Los días laborados deben ser un número entre 0 y 7'),
  body('horas_extra').optional({ checkFalsy: true }).isInt({ min: 0, max: 168 }).withMessage('Las horas extra deben ser un número entero válido'),
  decimal2(body('costo_hora_extra').optional({ checkFalsy: true }), { min: 0, max: 10000, mensaje: 'El costo por hora extra debe ser un número válido' }),
  decimal2(body('costo_dia_pago').optional({ checkFalsy: true }), { min: 0.01, max: 10000, mensaje: 'El costo por día debe ser mayor a 0' }),
];

router.get('/trabajadores', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.id_trabajador, t.nombre, t.costo_dia, t.estado, u.usuario AS usuario_vinculado
      FROM trabajadores t
      LEFT JOIN usuarios u ON u.id_trabajador = t.id_trabajador
      ORDER BY t.estado = 'activo' DESC, t.nombre
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/trabajadores', reglasCrearTrabajador, validar, async (req, res) => {
  try {
    const { nombre, costo_dia } = req.body;
    const [result] = await pool.query(
      'INSERT INTO trabajadores (nombre, costo_dia, estado) VALUES (?, ?, "activo")',
      [nombre, costo_dia]
    );
    res.status(201).json({ id_trabajador: result.insertId, mensaje: 'Trabajador registrado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

router.put('/trabajadores/:id', reglasEditarTrabajador, validar, async (req, res) => {
  try {
    const { costo_dia, estado } = req.body;

    const encontrado = await conActor(req, async (conexion) => {
      const [existe] = await conexion.query('SELECT 1 FROM trabajadores WHERE id_trabajador = ?', [req.params.id]);
      if (existe.length === 0) return false;

      try {
        await conexion.beginTransaction();
        if (costo_dia !== undefined) {
          await conexion.query('UPDATE trabajadores SET costo_dia = ? WHERE id_trabajador = ?', [costo_dia, req.params.id]);
        }
        if (estado !== undefined) {
          await conexion.query('UPDATE trabajadores SET estado = ? WHERE id_trabajador = ?', [estado, req.params.id]);
          // Un trabajador inactivo no debe conservar una cuenta con acceso al sistema
          if (estado === 'inactivo') {
            await conexion.query('UPDATE usuarios SET activo = 0 WHERE id_trabajador = ? AND activo = 1', [req.params.id]);
          }
        }
        await conexion.commit();
        return true;
      } catch (error) {
        await conexion.rollback();
        throw error;
      }
    });

    if (!encontrado) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }
    res.json({ mensaje: 'Trabajador actualizado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

router.get('/pagos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id_pago, p.id_trabajador, t.nombre AS trabajador_nombre,
             p.semana_inicio, p.semana_fin, p.dias_laborados, p.costo_dia_registrado,
             p.horas_extra, p.costo_hora_extra, p.total_pagar
      FROM pagos_semanales p
      JOIN trabajadores t ON t.id_trabajador = p.id_trabajador
      ORDER BY p.semana_inicio DESC, p.id_pago DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/pagos', reglasPago, validar, async (req, res) => {
  try {
    const { id_trabajador, semana_inicio, semana_fin, dias_laborados, costo_dia_pago, horas_extra, costo_hora_extra } = req.body;

    const [trabajadorRows] = await pool.query('SELECT costo_dia FROM trabajadores WHERE id_trabajador = ?', [id_trabajador]);
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

    const [pagoExistente] = await pool.query(
      'SELECT 1 FROM pagos_semanales WHERE id_trabajador = ? AND semana_inicio = ? AND semana_fin = ? LIMIT 1',
      [id_trabajador, semana_inicio, semana_fin]
    );
    if (pagoExistente.length > 0) {
      return res.status(409).json({ error: 'Ya hay un pago registrado para ese trabajador en esa semana' });
    }

    await pool.query(
      'INSERT INTO pagos_semanales (id_trabajador, semana_inicio, semana_fin, dias_laborados, costo_dia_registrado, horas_extra, costo_hora_extra) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id_trabajador, semana_inicio, semana_fin, dias_laborados, costoDiaFinal, horas_extra || 0, costo_hora_extra || 0]
    );
    res.status(201).json({ mensaje: 'Pago registrado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

module.exports = router;