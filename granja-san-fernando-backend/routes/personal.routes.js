const express = require('express');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');

const router = express.Router();

// Todo este módulo es exclusivo de administrador
router.use(verificarToken, soloAdministrador);

// ---------- TRABAJADORES ----------

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

router.put('/trabajadores/:id', async (req, res) => {
  try {
    const { costo_dia, estado } = req.body;

    if (costo_dia !== undefined) {
      await pool.query('UPDATE TRABAJADORES SET costo_dia = ? WHERE id_trabajador = ?', [costo_dia, req.params.id]);
    }
    if (estado !== undefined) {
      if (!['activo', 'inactivo'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      await pool.query('UPDATE TRABAJADORES SET estado = ? WHERE id_trabajador = ?', [estado, req.params.id]);
    }

    res.json({ mensaje: 'Trabajador actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- PAGOS SEMANALES ----------

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

router.post('/pagos', async (req, res) => {
  try {
    const { id_trabajador, semana_inicio, semana_fin, dias_laborados } = req.body;
    if (!id_trabajador || !semana_inicio || !semana_fin || !dias_laborados) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Tomamos el costo por día VIGENTE del trabajador en este momento (nunca del cliente)
    const [trabajadorRows] = await pool.query('SELECT costo_dia FROM TRABAJADORES WHERE id_trabajador = ?', [id_trabajador]);
    if (trabajadorRows.length === 0) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }
    const costoDiaActual = trabajadorRows[0].costo_dia;

    await pool.query(
      'INSERT INTO PAGOS_SEMANALES (id_trabajador, semana_inicio, semana_fin, dias_laborados, costo_dia_registrado) VALUES (?, ?, ?, ?, ?)',
      [id_trabajador, semana_inicio, semana_fin, dias_laborados, costoDiaActual]
    );
    res.status(201).json({ mensaje: 'Pago registrado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
});

module.exports = router;