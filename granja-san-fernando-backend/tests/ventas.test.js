const { pool, api, reiniciar, hoy, fijarExistencia, existencia, venderHuevos, GRANDE } = require('./helpers');

let tokens;

beforeAll(async () => { tokens = await reiniciar(); });
beforeEach(async () => {
  await pool.query('DELETE FROM abonos');
  await pool.query('DELETE FROM detalle_venta');
  await pool.query('DELETE FROM ventas');
  await fijarExistencia(0);
});
afterAll(async () => { await pool.end(); });

const filaVenta = async (id) => (await pool.query('SELECT * FROM ventas WHERE id_venta = ?', [id]))[0][0];

describe('Flujo del huevo: clasificación -> existencia -> venta', () => {
  test('clasificar huevos suma a la existencia de ese tamaño', async () => {
    const r = await api.post('/inventario/huevos-clasificados', tokens.op1, { fecha: hoy(), items: [{ id_clasificacion: GRANDE, cantidad: 100 }] });
    expect(r.status).toBe(201);
    expect(await existencia()).toBe(100);
  });

  test('clasificar varios tamaños en una sola operación', async () => {
    const r = await api.post('/inventario/huevos-clasificados', tokens.op1, { fecha: hoy(), items: [{ id_clasificacion: 4, cantidad: 10 }, { id_clasificacion: 5, cantidad: 20 }] });
    expect(r.status).toBe(201);
    expect(await existencia(4)).toBe(10);
    expect(await existencia(5)).toBe(20);
  });

  test('una venta de contado descuenta existencia, calcula el total y queda pagada', async () => {
    await fijarExistencia(100);
    const r = await venderHuevos(tokens.op1, { cantidad: 30, precio: 1.5, forma_pago: 'contado' });
    expect(r.status).toBe(201);
    expect(await existencia()).toBe(70);
    const v = await filaVenta(r.body.id_venta);
    expect(Number(v.monto_total)).toBe(45);
    expect(Number(v.saldo_pendiente)).toBe(0);
    expect(v.estado).toBe('cancelado');
  });

  test('una venta a crédito queda con saldo pendiente', async () => {
    await fijarExistencia(100);
    const r = await venderHuevos(tokens.op1, { cantidad: 10, precio: 2, forma_pago: 'credito' });
    const v = await filaVenta(r.body.id_venta);
    expect(Number(v.saldo_pendiente)).toBe(20);
    expect(v.estado).toBe('pendiente');
  });

  test('no se puede vender más de lo que hay: 400, sin tocar la existencia ni crear clientes huérfanos', async () => {
    await fijarExistencia(70);
    const antes = (await pool.query('SELECT COUNT(*) AS n FROM clientes'))[0][0].n;
    const r = await venderHuevos(tokens.op1, { cantidad: 71, cliente: 'No Debe Existir' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/supera la existencia/);
    expect(await existencia()).toBe(70);
    expect((await pool.query('SELECT COUNT(*) AS n FROM clientes'))[0][0].n).toBe(antes);
  });

  test('dos renglones del mismo tamaño se suman al validar (50 + 50 con existencia 70 -> 400)', async () => {
    await fijarExistencia(70);
    const r = await api.post('/ventas/ventas', tokens.op1, {
      fecha: hoy(), cliente_nombre: 'Doble',
      items: [{ id_clasificacion: GRANDE, cantidad: 50, precio_unitario: 1 }, { id_clasificacion: GRANDE, cantidad: 50, precio_unitario: 1 }],
    });
    expect(r.status).toBe(400);
    expect(await existencia()).toBe(70);
  });

  test('vender un tamaño sin existencia registrada -> 400', async () => {
    const r = await api.post('/ventas/ventas', tokens.op1, { fecha: hoy(), cliente_nombre: 'X', items: [{ id_clasificacion: 8, cantidad: 1, precio_unitario: 1 }] });
    expect(r.status).toBe(400);
  });

  test('vender exactamente toda la existencia es válido y la deja en 0', async () => {
    await fijarExistencia(25);
    expect((await venderHuevos(tokens.op1, { cantidad: 25 })).status).toBe(201);
    expect(await existencia()).toBe(0);
  });
});

describe('Anulación de ventas', () => {
  test('anular devuelve la existencia, deja saldo 0 y guarda el motivo', async () => {
    await fijarExistencia(100);
    const venta = await venderHuevos(tokens.op1, { cantidad: 30 });
    expect(await existencia()).toBe(70);
    const r = await api.put(`/ventas/ventas/${venta.body.id_venta}/anular`, tokens.admin_qa, { motivo: 'error de captura' });
    expect(r.status).toBe(200);
    expect(await existencia()).toBe(100);
    const v = await filaVenta(venta.body.id_venta);
    expect(v.estado).toBe('anulado');
    expect(Number(v.saldo_pendiente)).toBe(0);
    expect(v.motivo_anulacion).toBe('error de captura');
  });

  test('anular una venta ya anulada -> 400 y la existencia no vuelve a subir', async () => {
    await fijarExistencia(100);
    const venta = await venderHuevos(tokens.op1, { cantidad: 30 });
    await api.put(`/ventas/ventas/${venta.body.id_venta}/anular`, tokens.admin_qa, {});
    const r = await api.put(`/ventas/ventas/${venta.body.id_venta}/anular`, tokens.admin_qa, {});
    expect(r.status).toBe(400);
    expect(await existencia()).toBe(100);
  });

  test('anular una venta inexistente -> 404, también sin cuerpo en la petición', async () => {
    expect((await api.put('/ventas/ventas/999999/anular', tokens.admin_qa, {})).status).toBe(404);
    expect((await api.put('/ventas/ventas/999999/anular', tokens.admin_qa)).status).toBe(404);
  });

  test('el motivo debe ser texto: un objeto se rechaza', async () => {
    await fijarExistencia(10);
    const venta = await venderHuevos(tokens.op1, { cantidad: 1 });
    expect((await api.put(`/ventas/ventas/${venta.body.id_venta}/anular`, tokens.admin_qa, { motivo: { a: 1 } })).status).toBe(400);
  });

  test('anular una venta ya cobrada avisa cuánto dinero hay que devolver', async () => {
    await fijarExistencia(10);
    const venta = await venderHuevos(tokens.op1, { cantidad: 5, precio: 3, forma_pago: 'contado' });
    const r = await api.put(`/ventas/ventas/${venta.body.id_venta}/anular`, tokens.admin_qa, {});
    expect(r.body.abonos_a_devolver).toBe(15);
    expect(r.body.mensaje).toMatch(/15\.00/);
  });

  test('anular una venta sin cobros no menciona devolución', async () => {
    await fijarExistencia(10);
    const venta = await venderHuevos(tokens.op1, { cantidad: 5 });
    const r = await api.put(`/ventas/ventas/${venta.body.id_venta}/anular`, tokens.admin_qa, {});
    expect(r.body.abonos_a_devolver).toBe(0);
  });
});

describe('Abonos', () => {
  test('un abono reduce el saldo y, al saldarlo, la venta pasa a cancelado', async () => {
    await fijarExistencia(10);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 10, precio: 2 })).body.id_venta;
    expect((await api.post(`/ventas/ventas/${venta}/abonos`, tokens.op1, { fecha: hoy(), monto: 8 })).status).toBe(201);
    expect(Number((await filaVenta(venta)).saldo_pendiente)).toBe(12);
    expect((await api.post(`/ventas/ventas/${venta}/abonos`, tokens.op1, { fecha: hoy(), monto: 12 })).status).toBe(201);
    const v = await filaVenta(venta);
    expect(Number(v.saldo_pendiente)).toBe(0);
    expect(v.estado).toBe('cancelado');
  });

  test('un abono mayor al saldo -> 400', async () => {
    await fijarExistencia(10);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 10, precio: 2 })).body.id_venta;
    const r = await api.post(`/ventas/ventas/${venta}/abonos`, tokens.op1, { fecha: hoy(), monto: 25 });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/supera el saldo/);
  });

  test('un abono a una venta inexistente -> 404', async () => {
    expect((await api.post('/ventas/ventas/999999/abonos', tokens.op1, { fecha: hoy(), monto: 5 })).status).toBe(404);
  });

  test('no se acepta un abono con fecha futura', async () => {
    await fijarExistencia(10);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 10, precio: 2 })).body.id_venta;
    expect((await api.post(`/ventas/ventas/${venta}/abonos`, tokens.op1, { fecha: '2099-01-01', monto: 5 })).status).toBe(400);
  });

  test('no se puede abonar a una venta anulada', async () => {
    await fijarExistencia(10);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 10, precio: 2 })).body.id_venta;
    await api.put(`/ventas/ventas/${venta}/anular`, tokens.admin_qa, {});
    expect((await api.post(`/ventas/ventas/${venta}/abonos`, tokens.op1, { fecha: hoy(), monto: 5 })).status).toBe(400);
  });
});

describe('Visibilidad para el operador', () => {
  test('solo ve ventas con saldo pendiente: no las pagadas ni las anuladas', async () => {
    await fijarExistencia(100);
    const pagada = (await venderHuevos(tokens.op1, { cantidad: 1, forma_pago: 'contado', cliente: 'Pagada' })).body.id_venta;
    const anulada = (await venderHuevos(tokens.op1, { cantidad: 1, cliente: 'Anulada' })).body.id_venta;
    const pendiente = (await venderHuevos(tokens.op1, { cantidad: 1, cliente: 'Pendiente' })).body.id_venta;
    await api.put(`/ventas/ventas/${anulada}/anular`, tokens.admin_qa, {});

    const lista = await api.get('/ventas/ventas', tokens.op1);
    expect(lista.body.map((v) => v.id_venta)).toEqual([pendiente]);
    expect((await api.get(`/ventas/ventas/${pagada}`, tokens.op1)).status).toBe(404);
    expect((await api.get(`/ventas/ventas/${anulada}`, tokens.op1)).status).toBe(404);
    expect((await api.get(`/ventas/ventas/${pendiente}`, tokens.op1)).status).toBe(200);
  });

  test('el administrador ve todas, incluidas las anuladas', async () => {
    await fijarExistencia(100);
    const a = (await venderHuevos(tokens.op1, { cantidad: 1, forma_pago: 'contado' })).body.id_venta;
    const b = (await venderHuevos(tokens.op1, { cantidad: 1 })).body.id_venta;
    await api.put(`/ventas/ventas/${b}/anular`, tokens.admin_qa, {});
    const lista = await api.get('/ventas/ventas', tokens.admin_qa);
    expect(lista.body.map((v) => v.id_venta).sort()).toEqual([a, b].sort());
  });
});

describe('Concurrencia (existencias)', () => {
  test('10 ventas simultáneas de 10 huevos con existencia 10: solo una se concreta y nunca queda negativa', async () => {
    let rondasConProblema = 0;
    for (let ronda = 0; ronda < 12; ronda++) {
      await fijarExistencia(10);
      const respuestas = await Promise.all(
        Array.from({ length: 10 }, (_, i) => venderHuevos(tokens.admin_qa, { cantidad: 10, cliente: `C${ronda}-${i}` }))
      );
      const exitosas = respuestas.filter((r) => r.status === 201).length;
      const e = await existencia();
      if (exitosas !== 1 || e < 0 || e !== 0) rondasConProblema++;
    }
    expect(rondasConProblema).toBe(0);
  });

  test('6 anulaciones simultáneas de la misma venta devuelven la existencia una sola vez', async () => {
    await fijarExistencia(10);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 10 })).body.id_venta;
    expect(await existencia()).toBe(0);
    const respuestas = await Promise.all(Array.from({ length: 6 }, () => api.put(`/ventas/ventas/${venta}/anular`, tokens.admin_qa, {})));
    expect(respuestas.filter((r) => r.status === 200)).toHaveLength(1);
    expect(respuestas.filter((r) => r.status === 400)).toHaveLength(5);
    expect(await existencia()).toBe(10);
  });

  test('ventas y anulaciones cruzadas no producen interbloqueos ni descuadran la existencia', async () => {
    await fijarExistencia(200);
    const ids = [];
    for (let i = 0; i < 5; i++) ids.push((await venderHuevos(tokens.op1, { cantidad: 10, cliente: `Base${i}` })).body.id_venta);
    const mezcla = [
      ...ids.map((id) => api.put(`/ventas/ventas/${id}/anular`, tokens.admin_qa, {})),
      ...Array.from({ length: 5 }, (_, i) => venderHuevos(tokens.op1, { cantidad: 10, cliente: `Nueva${i}` })),
    ];
    const respuestas = await Promise.all(mezcla);
    expect(respuestas.every((r) => [200, 201].includes(r.status))).toBe(true);
    // 200 - 50 (5 nuevas) = 150 disponibles tras anular las 5 primeras
    expect(await existencia()).toBe(150);
  });
});

describe('Resumen de ventas (pantalla de Ventas)', () => {
  test('ignora las ventas anuladas: vendido, cobrado y pendiente cuadran con la base de datos', async () => {
    await fijarExistencia(1000);
    await venderHuevos(tokens.op1, { cantidad: 10, precio: 3, forma_pago: 'contado' }); // 30 cobrado
    await venderHuevos(tokens.op1, { cantidad: 20, precio: 2.5, forma_pago: 'credito' }); // 50 pendiente
    const anulada = (await venderHuevos(tokens.op1, { cantidad: 100, precio: 1, forma_pago: 'contado' })).body.id_venta;
    await api.put(`/ventas/ventas/${anulada}/anular`, tokens.admin_qa, {});

    const r = await api.get('/ventas/resumen', tokens.admin_qa);
    expect(r.status).toBe(200);
    expect(Number(r.body.total_ventas)).toBe(80);
    expect(Number(r.body.total_cobrado)).toBe(30);
    expect(Number(r.body.total_pendiente)).toBe(50);
    expect(Number(r.body.ventas_con_saldo)).toBe(1);
  });

  test('con solo una venta anulada, todo es 0', async () => {
    await fijarExistencia(10);
    const id = (await venderHuevos(tokens.op1, { cantidad: 5, precio: 9, forma_pago: 'contado' })).body.id_venta;
    await api.put(`/ventas/ventas/${id}/anular`, tokens.admin_qa, {});
    const r = await api.get('/ventas/resumen', tokens.admin_qa);
    expect(Number(r.body.total_ventas)).toBe(0);
    expect(Number(r.body.total_cobrado)).toBe(0);
  });
});
