const { pool, api, reiniciar, hoy, fijarExistencia, venderHuevos } = require('./helpers');

let tokens;

beforeAll(async () => {
  tokens = await reiniciar();
  await fijarExistencia(1000);
  await venderHuevos(tokens.op1, { cantidad: 10, precio: 3, forma_pago: 'contado' });
  await venderHuevos(tokens.op1, { cantidad: 20, precio: 2.5, forma_pago: 'credito' });
  const anulada = (await venderHuevos(tokens.op1, { cantidad: 100, precio: 1, forma_pago: 'contado' })).body.id_venta;
  await api.put(`/ventas/ventas/${anulada}/anular`, tokens.admin_qa, {});
  await api.post('/gastos', tokens.admin_qa, { fecha: hoy(), descripcion: 'Luz', categoria: 'servicios', monto: 10 });
  const gastoAnulado = await api.post('/gastos', tokens.admin_qa, { fecha: hoy(), descripcion: 'Error', categoria: 'otros', monto: 999 });
  const [[{ id_gasto }]] = await pool.query('SELECT MAX(id_gasto) AS id_gasto FROM gastos');
  expect(gastoAnulado.status).toBe(201);
  await api.put(`/gastos/${id_gasto}/anular`, tokens.admin_qa);
});
afterAll(async () => { await pool.end(); });

describe('Reportes excluyen lo anulado y cuadran con la base de datos', () => {
  test('resumen: ventas del día sin anuladas y cuentas por cobrar', async () => {
    const r = await api.get(`/reportes/resumen?desde=${hoy()}&hasta=${hoy()}`, tokens.admin_qa);
    expect(r.status).toBe(200);
    const [[bd]] = await pool.query("SELECT SUM(monto_total) AS total, COUNT(*) AS n FROM ventas WHERE estado <> 'anulado'");
    expect(Number(r.body.kpis.total_ventas)).toBe(80);
    expect(Number(r.body.kpis.total_ventas)).toBe(Number(bd.total));
    expect(Number(r.body.kpis.num_ventas)).toBe(bd.n);
    expect(Number(r.body.kpis.cuentas_por_cobrar)).toBe(50);
  });

  test('financiero: ingresos sin ventas anuladas y egresos sin gastos anulados', async () => {
    const r = await api.get(`/reportes/financiero?desde=${hoy()}&hasta=${hoy()}`, tokens.admin_qa);
    expect(r.status).toBe(200);
    expect(r.body.ingresos_total).toBe(80);
    expect(r.body.desglose_egresos.gastos).toBe(10);
    expect(r.body.utilidad).toBe(r.body.ingresos_total - r.body.egresos_total);
  });

  test('la pantalla de Ventas y Reportes muestran el mismo total', async () => {
    const ventas = await api.get('/ventas/resumen', tokens.admin_qa);
    const reportes = await api.get(`/reportes/resumen?desde=${hoy()}&hasta=${hoy()}`, tokens.admin_qa);
    expect(Number(ventas.body.total_ventas)).toBe(Number(reportes.body.kpis.total_ventas));
  });

  test('las ventas anuladas no aparecen en el detalle', async () => {
    const r = await api.get(`/reportes/financiero?desde=${hoy()}&hasta=${hoy()}`, tokens.admin_qa);
    expect(r.body.detalle.ventas.every((v) => v.estado !== 'anulado')).toBe(true);
    expect(r.body.detalle.ventas).toHaveLength(2);
  });

  test('periodo=hoy usa la fecha local de Guatemala', async () => {
    const r = await api.get('/reportes/resumen?periodo=hoy', tokens.admin_qa);
    expect(r.body.rango).toEqual({ desde: hoy(), hasta: hoy() });
  });

  test('un rango sin datos devuelve ceros, no errores', async () => {
    const r = await api.get('/reportes/resumen?desde=2020-01-01&hasta=2020-01-31', tokens.admin_qa);
    expect(r.status).toBe(200);
    expect(Number(r.body.kpis.total_ventas)).toBe(0);
  });
});

describe('Filtros de fecha validados', () => {
  test.each([
    ['fechas con texto', '?desde=abc&hasta=xyz'],
    ['inyección SQL en el filtro', "?desde=' OR 1=1--&hasta=x"],
    ['fecha inexistente', '?desde=2026-02-30&hasta=2026-03-01'],
    ['parámetro repetido', '?desde=2026-01-01&desde=2026-01-02&hasta=2026-01-03'],
  ])('%s -> 400', async (_n, consulta) => {
    expect((await api.get(`/reportes/resumen${consulta}`, tokens.admin_qa)).status).toBe(400);
    expect((await api.get(`/reportes/financiero${consulta}`, tokens.admin_qa)).status).toBe(400);
    expect((await api.get(`/gastos${consulta}`, tokens.admin_qa)).status).toBe(400);
  });

  test('un rango válido en gastos -> 200', async () => {
    expect((await api.get(`/gastos?desde=2026-01-01&hasta=${hoy()}`, tokens.admin_qa)).status).toBe(200);
  });
});
