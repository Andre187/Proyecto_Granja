const express = require('express');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');

const router = express.Router();

// El resumen del panel es información administrativa (montos, alertas globales)
router.use(verificarToken, soloAdministrador);

  function rangoFechas(periodo) {
  const hoy = new Date();
  // Usamos componentes de fecha LOCAL, nunca toISOString() (que convierte a UTC
  // y puede "saltar" al día siguiente en horas de la tarde/noche en Guatemala).
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  };
  let desde;

  if (periodo === 'semana') {
    desde = new Date(hoy);
    desde.setDate(desde.getDate() - 6);
  } else if (periodo === 'mes') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  } else {
    desde = new Date(hoy);
  }

  return { desde: fmt(desde), hasta: fmt(hoy) };
}

router.get('/resumen', async (req, res) => {
  try {
    let periodo = ['hoy', 'semana', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'hoy';
    let desde, hasta;

    // Si vienen fechas personalizadas explícitas, tienen prioridad sobre el período
    if (req.query.desde && req.query.hasta) {
      desde = req.query.desde;
      hasta = req.query.hasta;
      periodo = 'personalizado';
    } else {
      ({ desde, hasta } = rangoFechas(periodo));
    }

    const [posturaTotal] = await pool.query(
      `SELECT COALESCE(SUM(cantidad_huevos),0) AS huevos,
              COALESCE(ROUND(SUM(cantidad_huevos)/NULLIF(SUM(aves_activas_dia),0)*100,1),0) AS tasa_prom
       FROM POSTURA_DIARIA WHERE fecha BETWEEN ? AND ?`,
      [desde, hasta]
    );

    const [mortalidadTotal] = await pool.query(
      'SELECT COALESCE(SUM(cantidad),0) AS mortalidad FROM MORTALIDAD WHERE fecha BETWEEN ? AND ?',
      [desde, hasta]
    );

    const [ventasTotal] = await pool.query(
      "SELECT COALESCE(SUM(monto_total),0) AS total_ventas, COUNT(*) AS num_ventas FROM VENTAS WHERE fecha BETWEEN ? AND ? AND estado != 'anulado'",
      [desde, hasta]
    );

    const [cuentasPorCobrar] = await pool.query(
      'SELECT COALESCE(SUM(saldo_pendiente),0) AS total, COUNT(*) AS clientes FROM VENTAS WHERE saldo_pendiente > 0'
    );

    const [posturaPorGalera] = await pool.query(
      `SELECT g.nombre AS galera, COALESCE(SUM(p.cantidad_huevos),0) AS huevos,
              COALESCE(ROUND(SUM(p.cantidad_huevos)/NULLIF(SUM(p.aves_activas_dia),0)*100,0),0) AS tasa
       FROM LOTES l
       JOIN GALERAS g ON g.id_galera = l.id_galera
       LEFT JOIN POSTURA_DIARIA p ON p.id_lote = l.id_lote AND p.fecha BETWEEN ? AND ?
       WHERE l.estado = 'activo'
       GROUP BY g.id_galera, g.nombre
       ORDER BY g.nombre`,
      [desde, hasta]
    );

    const [posturaPorDia] = await pool.query(
      `SELECT fecha, SUM(cantidad_huevos) AS huevos
       FROM POSTURA_DIARIA WHERE fecha BETWEEN ? AND ?
       GROUP BY fecha ORDER BY fecha`,
      [desde, hasta]
    );

    const [ventasPorDia] = await pool.query(
      `SELECT fecha, SUM(monto_total) AS monto
       FROM VENTAS WHERE fecha BETWEEN ? AND ? AND estado != 'anulado'
       GROUP BY fecha ORDER BY fecha`,
      [desde, hasta]
    );

    const [ventasRecientes] = await pool.query(
      `SELECT v.id_venta, v.fecha, c.nombre AS cliente_nombre, v.monto_total, v.saldo_pendiente, v.estado
       FROM VENTAS v JOIN CLIENTES c ON c.id_cliente = v.id_cliente
       WHERE v.fecha BETWEEN ? AND ? AND v.estado != 'anulado'
       ORDER BY v.fecha DESC, v.id_venta DESC LIMIT 6`,
      [desde, hasta]
    );

    const [medicamentosAlerta] = await pool.query(
      'SELECT nombre, existencia_actual, nivel_minimo, unidad_medida FROM MEDICAMENTOS WHERE existencia_actual < nivel_minimo'
    );
    const [concentradoAlerta] = await pool.query(
      'SELECT tipo_concentrado, existencia_actual, nivel_minimo FROM CONCENTRADO_STOCK WHERE existencia_actual < nivel_minimo AND nivel_minimo > 0'
    );

    res.json({
      periodo,
      rango: { desde, hasta },
      kpis: {
        huevos: posturaTotal[0].huevos,
        tasa_prom: posturaTotal[0].tasa_prom,
        mortalidad: mortalidadTotal[0].mortalidad,
        total_ventas: ventasTotal[0].total_ventas,
        num_ventas: ventasTotal[0].num_ventas,
        cuentas_por_cobrar: cuentasPorCobrar[0].total,
        clientes_con_saldo: cuentasPorCobrar[0].clientes,
      },
      postura_por_galera: posturaPorGalera,
      postura_por_dia: posturaPorDia,
      ventas_por_dia: ventasPorDia,
      ventas_recientes: ventasRecientes,
      alertas: {
        medicamentos: medicamentosAlerta,
        concentrado: concentradoAlerta,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/financiero', async (req, res) => {
  try {
    let periodo = ['hoy', 'semana', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'mes';
    let desde, hasta;

    if (req.query.desde && req.query.hasta) {
      desde = req.query.desde;
      hasta = req.query.hasta;
      periodo = 'personalizado';
    } else {
      ({ desde, hasta } = rangoFechas(periodo));
    }

    const [ventasTotal] = await pool.query(
      "SELECT COALESCE(SUM(monto_total),0) AS total FROM VENTAS WHERE fecha BETWEEN ? AND ? AND estado != 'anulado'",
      [desde, hasta]
    );
    const [gastosTotal] = await pool.query(
      'SELECT COALESCE(SUM(monto),0) AS total FROM GASTOS WHERE fecha BETWEEN ? AND ?',
      [desde, hasta]
    );
    const [concentradoTotal] = await pool.query(
      'SELECT COALESCE(SUM(total),0) AS total FROM CONCENTRADO WHERE fecha BETWEEN ? AND ?',
      [desde, hasta]
    );
    const [personalTotal] = await pool.query(
      'SELECT COALESCE(SUM(total_pagar),0) AS total FROM PAGOS_SEMANALES WHERE semana_fin BETWEEN ? AND ?',
      [desde, hasta]
    );

    const [posturaTotal] = await pool.query(
      `SELECT COALESCE(SUM(cantidad_huevos),0) AS huevos,
              COALESCE(ROUND(SUM(cantidad_huevos)/NULLIF(SUM(aves_activas_dia),0)*100,1),0) AS tasa_prom
       FROM POSTURA_DIARIA WHERE fecha BETWEEN ? AND ?`,
      [desde, hasta]
    );
    const [mortalidadTotal] = await pool.query(
      'SELECT COALESCE(SUM(cantidad),0) AS mortalidad FROM MORTALIDAD WHERE fecha BETWEEN ? AND ?',
      [desde, hasta]
    );

    const [posturaPorGalera] = await pool.query(
      `SELECT g.nombre AS galera, COALESCE(SUM(p.cantidad_huevos),0) AS huevos,
              COALESCE(ROUND(SUM(p.cantidad_huevos)/NULLIF(SUM(p.aves_activas_dia),0)*100,0),0) AS tasa
       FROM LOTES l
       JOIN GALERAS g ON g.id_galera = l.id_galera
       LEFT JOIN POSTURA_DIARIA p ON p.id_lote = l.id_lote AND p.fecha BETWEEN ? AND ?
       WHERE l.estado = 'activo'
       GROUP BY g.id_galera, g.nombre
       ORDER BY g.nombre`,
      [desde, hasta]
    );

    // Ingresos y egresos día por día (egresos diarios = gastos + concentrado; los pagos de personal son semanales y se ven en el desglose, no en esta gráfica diaria)
    const [ingresosPorDia] = await pool.query(
      "SELECT fecha, SUM(monto_total) AS monto FROM VENTAS WHERE fecha BETWEEN ? AND ? AND estado != 'anulado' GROUP BY fecha",
      [desde, hasta]
    );
    const [gastosPorDia] = await pool.query(
      'SELECT fecha, SUM(monto) AS monto FROM GASTOS WHERE fecha BETWEEN ? AND ? GROUP BY fecha',
      [desde, hasta]
    );
    const [concentradoPorDia] = await pool.query(
      'SELECT fecha, SUM(total) AS monto FROM CONCENTRADO WHERE fecha BETWEEN ? AND ? GROUP BY fecha',
      [desde, hasta]
    );

    const mapaEgresos = {};
    gastosPorDia.forEach((g) => { mapaEgresos[g.fecha.toISOString().slice(0,10)] = (mapaEgresos[g.fecha.toISOString().slice(0,10)] || 0) + Number(g.monto); });
    concentradoPorDia.forEach((c) => { const f = c.fecha.toISOString().slice(0,10); mapaEgresos[f] = (mapaEgresos[f] || 0) + Number(c.monto); });

    const mapaIngresos = {};
    ingresosPorDia.forEach((v) => { mapaIngresos[v.fecha.toISOString().slice(0,10)] = Number(v.monto); });

    const todasLasFechas = Array.from(new Set([...Object.keys(mapaIngresos), ...Object.keys(mapaEgresos)])).sort();
    const porDia = todasLasFechas.map((f) => ({
      fecha: f,
      ingresos: mapaIngresos[f] || 0,
      egresos: mapaEgresos[f] || 0,
    }));

    const ingresos_total = Number(ventasTotal[0].total);
    const egresos_total = Number(gastosTotal[0].total) + Number(concentradoTotal[0].total) + Number(personalTotal[0].total);

    // Detalle por categoría, para las pestañas del módulo
    const [ventasDetalle] = await pool.query(
      `SELECT v.id_venta, v.fecha, c.nombre AS cliente_nombre, v.monto_total, v.estado
       FROM VENTAS v JOIN CLIENTES c ON c.id_cliente = v.id_cliente
       WHERE v.fecha BETWEEN ? AND ? AND v.estado != 'anulado'
       ORDER BY v.fecha DESC, v.id_venta DESC`,
      [desde, hasta]
    );

    const [gastosDetalle] = await pool.query(
      'SELECT id_gasto, fecha, descripcion, monto FROM GASTOS WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC',
      [desde, hasta]
    );

    const [concentradoDetalle] = await pool.query(
      'SELECT id_concentrado, fecha, tipo_concentrado, cantidad_qq, costo_unitario, total FROM CONCENTRADO WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC',
      [desde, hasta]
    );

    const [medicamentosDetalle] = await pool.query(
      `SELECT mm.id_movimiento, mm.fecha, m.nombre AS medicamento_nombre, mm.tipo_movimiento, mm.cantidad, m.unidad_medida
       FROM MOVIMIENTOS_MEDICAMENTO mm JOIN MEDICAMENTOS m ON m.id_medicamento = mm.id_medicamento
       WHERE mm.fecha BETWEEN ? AND ?
       ORDER BY mm.fecha DESC`,
      [desde, hasta]
    );

    const [personalDetalle] = await pool.query(
      `SELECT p.id_pago, t.nombre AS trabajador_nombre, p.semana_inicio, p.semana_fin, p.dias_laborados, p.costo_dia_registrado, p.total_pagar
       FROM PAGOS_SEMANALES p JOIN TRABAJADORES t ON t.id_trabajador = p.id_trabajador
       WHERE p.semana_fin BETWEEN ? AND ?
       ORDER BY p.semana_fin DESC`,
      [desde, hasta]
    );

    res.json({
      periodo,
      rango: { desde, hasta },
      ingresos_total,
      egresos_total,
      utilidad: ingresos_total - egresos_total,
      desglose_egresos: {
        gastos: Number(gastosTotal[0].total),
        concentrado: Number(concentradoTotal[0].total),
        personal: Number(personalTotal[0].total),
      },
      produccion: {
        huevos: posturaTotal[0].huevos,
        tasa_prom: posturaTotal[0].tasa_prom,
        mortalidad: mortalidadTotal[0].mortalidad,
      },
      postura_por_galera: posturaPorGalera,
      por_dia: porDia,
      detalle: {
        ventas: ventasDetalle,
        gastos: gastosDetalle,
        concentrado: concentradoDetalle,
        medicamentos: medicamentosDetalle,
        personal: personalDetalle,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;