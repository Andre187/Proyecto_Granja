const { pool, api, reiniciar, hoy, fijarExistencia, GRANDE } = require('./helpers');

let tokens;

beforeAll(async () => {
  tokens = await reiniciar();
  await fijarExistencia(1000);
});
afterAll(async () => { await pool.end(); });

// Cada caso: [descripción, método, ruta, quién, cuerpo, estado esperado]
// Todo se envía directo a la API (sin pasar por React) para comprobar que la validación vive en el backend.
const item = (extra = {}) => ({ id_clasificacion: GRANDE, cantidad: 1, precio_unitario: 1, ...extra });
const venta = (extra = {}) => ({ fecha: hoy(), cliente_nombre: 'Validación', items: [item()], ...extra });

describe('Ventas', () => {
  test.each([
    ['fecha inexistente 2026-02-30', venta({ fecha: '2026-02-30' })],
    ['fecha 13/45', venta({ fecha: '2026-13-45' })],
    ['fecha muy antigua (1900)', venta({ fecha: '1900-01-01' })],
    ['fecha futura (2099)', venta({ fecha: '2099-01-01' })],
    ['fecha con hora', venta({ fecha: '2026-09-29T23:30:00-06:00' })],
    ['fecha como número', venta({ fecha: 20260929 })],
    ['fecha ausente', venta({ fecha: undefined })],
    ['sin artículos', venta({ items: [] })],
    ['artículos como objeto', venta({ items: { a: 1 } })],
    ['más de 50 artículos', venta({ items: Array.from({ length: 51 }, () => item()) })],
    ['cantidad cero', venta({ items: [item({ cantidad: 0 })] })],
    ['cantidad negativa', venta({ items: [item({ cantidad: -5 })] })],
    ['cantidad decimal', venta({ items: [item({ cantidad: 1.5 })] })],
    ['cantidad como texto', venta({ items: [item({ cantidad: 'muchos' })] })],
    ['cantidad enorme', venta({ items: [item({ cantidad: 1e9 })] })],
    ['precio cero', venta({ items: [item({ precio_unitario: 0 })] })],
    ['precio negativo', venta({ items: [item({ precio_unitario: -1 })] })],
    ['precio con 3 decimales', venta({ items: [item({ precio_unitario: 1.005 })] })],
    ['precio enorme', venta({ items: [item({ precio_unitario: 1e9 })] })],
    ['clasificación como texto', venta({ items: [item({ id_clasificacion: 'a' })] })],
    ['forma de pago inválida', venta({ forma_pago: 'trueque' })],
    ['cliente inexistente', venta({ cliente_nombre: undefined, id_cliente: 99999 })],
    ['cliente_nombre de 101 caracteres', venta({ cliente_nombre: 'y'.repeat(101) })],
    ['cliente_nombre como objeto', venta({ cliente_nombre: { a: 1 } })],
    ['sin cliente', venta({ cliente_nombre: undefined })],
    ['cliente_nombre solo espacios', venta({ cliente_nombre: '     ' })],
    ['desbordamiento 100000 x 100000', venta({ items: [item({ cantidad: 100000, precio_unitario: 100000 })] })],
  ])('%s -> 400', async (_n, cuerpo) => {
    const r = await api.post('/ventas/ventas', tokens.op1, cuerpo);
    expect(r.status).toBe(400);
  });

  test('una venta con ñ, tildes y emoji se guarda y se lee igual', async () => {
    const nombre = 'Peña Núñez 🐔';
    expect((await api.post('/ventas/ventas', tokens.op1, venta({ cliente_nombre: nombre }))).status).toBe(201);
    const [[fila]] = await pool.query('SELECT nombre FROM clientes ORDER BY id_cliente DESC LIMIT 1');
    expect(fila.nombre).toBe(nombre);
  });

  test('el nombre del cliente con espacios sobrantes se guarda recortado', async () => {
    await api.post('/ventas/ventas', tokens.op1, venta({ cliente_nombre: '   Recortado   ' }));
    const [[fila]] = await pool.query('SELECT nombre FROM clientes ORDER BY id_cliente DESC LIMIT 1');
    expect(fila.nombre).toBe('Recortado');
  });
});

describe('Clientes', () => {
  test.each([
    ['nombre vacío', { nombre: '' }],
    ['nombre solo espacios', { nombre: '     ' }],
    ['nombre como objeto', { nombre: { a: 1 } }],
    ['nombre como arreglo', { nombre: ['a', 'b'] }],
    ['nombre como número', { nombre: 12345 }],
    ['nombre de 101 caracteres', { nombre: 'x'.repeat(101) }],
    ['teléfono de 21 caracteres', { nombre: 'ok', telefono: '1'.repeat(21) }],
    ['dirección de 201 caracteres', { nombre: 'ok', direccion: 'd'.repeat(201) }],
    ['sin nombre', {}],
  ])('crear con %s -> 400', async (_n, cuerpo) => {
    expect((await api.post('/ventas/clientes', tokens.op1, cuerpo)).status).toBe(400);
  });

  test('un cliente válido con ñ se crea y se puede editar', async () => {
    const r = await api.post('/ventas/clientes', tokens.op1, { nombre: 'Muñoz', telefono: '5555-1234', direccion: 'Zona 1' });
    expect(r.status).toBe(201);
    expect((await api.put(`/ventas/clientes/${r.body.id_cliente}`, tokens.op1, { nombre: 'Muñoz Pérez' })).status).toBe(200);
  });

  test('editar un cliente inexistente -> 404, y con objeto como nombre -> 400 sin corromper datos', async () => {
    expect((await api.put('/ventas/clientes/99999', tokens.op1, { nombre: 'zz' })).status).toBe(404);
    const { body } = await api.post('/ventas/clientes', tokens.op1, { nombre: 'Intacto' });
    expect((await api.put(`/ventas/clientes/${body.id_cliente}`, tokens.op1, { nombre: { direccion: 1 } })).status).toBe(400);
    const [[fila]] = await pool.query('SELECT nombre FROM clientes WHERE id_cliente = ?', [body.id_cliente]);
    expect(fila.nombre).toBe('Intacto');
  });
});

describe('Gastos', () => {
  const gasto = (extra = {}) => ({ fecha: hoy(), descripcion: 'Reparación', categoria: 'otros', monto: 10, ...extra });

  test.each([
    ['fecha inexistente', gasto({ fecha: '2026-02-30' })],
    ['fecha futura', gasto({ fecha: '2099-01-01' })],
    ['descripción vacía', gasto({ descripcion: '' })],
    ['descripción solo espacios', gasto({ descripcion: '   ' })],
    ['descripción de 201 caracteres', gasto({ descripcion: 'x'.repeat(201) })],
    ['descripción como objeto', gasto({ descripcion: { a: 1 } })],
    ['categoría inválida', gasto({ categoria: 'hackeo' })],
    ['monto cero', gasto({ monto: 0 })],
    ['monto negativo como texto', gasto({ monto: '-5' })],
    ['monto con 3 decimales', gasto({ monto: 12.345 })],
    ['monto enorme', gasto({ monto: 1e12 })],
    ['monto como texto', gasto({ monto: 'mucho' })],
  ])('%s -> 400', async (_n, cuerpo) => {
    expect((await api.post('/gastos', tokens.admin_qa, cuerpo)).status).toBe(400);
  });

  test('descripción con ñ, tildes, emoji y HTML se guarda como texto', async () => {
    const descripcion = 'Reparación ñandú 🐔 <b>x</b>';
    expect((await api.post('/gastos', tokens.admin_qa, gasto({ descripcion, monto: 12.35 }))).status).toBe(201);
    const [[fila]] = await pool.query('SELECT descripcion, monto FROM gastos ORDER BY id_gasto DESC LIMIT 1');
    expect(fila.descripcion).toBe(descripcion);
    expect(Number(fila.monto)).toBe(12.35);
  });

  test('anular un gasto lo excluye del total y no se puede editar ni anular otra vez', async () => {
    await api.post('/gastos', tokens.admin_qa, gasto({ descripcion: 'A anular', monto: 500 }));
    const [[{ id_gasto }]] = await pool.query('SELECT MAX(id_gasto) AS id_gasto FROM gastos');
    expect((await api.put(`/gastos/${id_gasto}/anular`, tokens.admin_qa)).status).toBe(200);
    expect((await api.put(`/gastos/${id_gasto}/anular`, tokens.admin_qa)).status).toBe(404);
    expect((await api.put(`/gastos/${id_gasto}`, tokens.admin_qa, gasto())).status).toBe(404);
    const lista = await api.get(`/gastos?desde=${hoy()}&hasta=${hoy()}`, tokens.admin_qa);
    expect(lista.body.gastos.find((g) => g.id_gasto === id_gasto).estado).toBe('anulado');
    expect(lista.body.por_categoria.every((c) => Number(c.total) < 500)).toBe(true);
  });
});

describe('Inventario', () => {
  const compra = (extra = {}) => ({ fecha: hoy(), tipo_concentrado: 'Postura', cantidad_qq: 10, costo_unitario: 250, ...extra });

  test.each([
    ['tipo de 51 caracteres', compra({ tipo_concentrado: 't'.repeat(51) })],
    ['tipo vacío', compra({ tipo_concentrado: '' })],
    ['cantidad cero', compra({ cantidad_qq: 0 })],
    ['cantidad con 3 decimales', compra({ cantidad_qq: 1.234 })],
    ['costo negativo', compra({ costo_unitario: -1 })],
    ['fecha futura', compra({ fecha: '2099-01-01' })],
  ])('compra de concentrado con %s -> 400', async (_n, cuerpo) => {
    expect((await api.post('/inventario/concentrado', tokens.admin_qa, cuerpo)).status).toBe(400);
  });

  test('una compra válida crea la existencia y el consumo no puede superarla', async () => {
    expect((await api.post('/inventario/concentrado', tokens.admin_qa, compra())).status).toBe(201);
    const [[{ id_stock }]] = await pool.query('SELECT id_stock FROM concentrado_stock LIMIT 1');
    const mayor = await api.post('/inventario/concentrado-consumo', tokens.op1, { id_stock, fecha: hoy(), cantidad_qq: 11 });
    expect(mayor.status).toBe(400);
    expect(mayor.body.error).toMatch(/supera la existencia/);
    expect((await api.post('/inventario/concentrado-consumo', tokens.op1, { id_stock, fecha: hoy(), cantidad_qq: 4 })).status).toBe(201);
    const [[fila]] = await pool.query('SELECT existencia_actual AS e FROM concentrado_stock WHERE id_stock = ?', [id_stock]);
    expect(Number(fila.e)).toBe(6);
  });

  test('el operador no ve las compras (con costos) pero sí la existencia', async () => {
    expect((await api.get('/inventario/concentrado', tokens.op1)).status).toBe(403);
    expect((await api.get('/inventario/concentrado', tokens.admin_qa)).status).toBe(200);
    expect((await api.get('/inventario/concentrado-stock', tokens.op1)).status).toBe(200);
  });

  test.each([
    ['fecha futura', { fecha: '2099-01-01', items: [{ id_clasificacion: 7, cantidad: 5 }] }],
    ['tamaño inexistente', { fecha: hoy(), items: [{ id_clasificacion: 999, cantidad: 5 }] }],
    ['cantidad cero', { fecha: hoy(), items: [{ id_clasificacion: 7, cantidad: 0 }] }],
    ['sin tamaños', { fecha: hoy(), items: [] }],
  ])('clasificar huevos con %s -> 400', async (_n, cuerpo) => {
    expect((await api.post('/inventario/huevos-clasificados', tokens.op1, cuerpo)).status).toBe(400);
  });

  test('nivel mínimo: inexistente -> 404, negativo -> 400', async () => {
    expect((await api.put('/inventario/huevos-stock/999', tokens.admin_qa, { nivel_minimo: 5 })).status).toBe(404);
    expect((await api.put('/inventario/huevos-stock/1', tokens.admin_qa, { nivel_minimo: -5 })).status).toBe(400);
  });

  test('medicamentos: salida mayor a la existencia -> 400 y el operador no registra entradas', async () => {
    const alta = await api.post('/inventario/medicamentos', tokens.admin_qa, { nombre: 'Vitamina QA', existencia_actual: 5, nivel_minimo: 1, unidad_medida: 'frasco' });
    expect(alta.status).toBe(201);
    const id = alta.body.id_medicamento;
    expect((await api.post('/inventario/movimientos', tokens.op1, { id_medicamento: id, fecha: hoy(), tipo_movimiento: 'salida', cantidad: 6 })).status).toBe(400);
    expect((await api.post('/inventario/movimientos', tokens.op1, { id_medicamento: id, fecha: hoy(), tipo_movimiento: 'entrada', cantidad: 6 })).status).toBe(403);
    expect((await api.post('/inventario/movimientos', tokens.op1, { id_medicamento: id, fecha: hoy(), tipo_movimiento: 'salida', cantidad: 5 })).status).toBe(201);
    expect((await api.post('/inventario/medicamentos', tokens.admin_qa, { nombre: 'Vitamina QA', existencia_actual: 1, nivel_minimo: 1, unidad_medida: 'x' })).status).toBe(409);
  });
});

describe('Tareas', () => {
  test.each([
    ['trabajador inexistente', { id_trabajador: 999, descripcion: 'x', fecha_asignacion: hoy() }],
    ['descripción vacía', { id_trabajador: 1, descripcion: '', fecha_asignacion: hoy() }],
    ['descripción de 256 caracteres', { id_trabajador: 1, descripcion: 'x'.repeat(256), fecha_asignacion: hoy() }],
    ['fecha de asignación inválida', { id_trabajador: 1, descripcion: 'x', fecha_asignacion: 'ayer' }],
    ['fecha límite inválida', { id_trabajador: 1, descripcion: 'x', fecha_asignacion: hoy(), fecha_limite: '2026-02-30' }],
    ['trabajador como texto', { id_trabajador: 'uno', descripcion: 'x', fecha_asignacion: hoy() }],
  ])('%s -> 400', async (_n, cuerpo) => {
    expect((await api.post('/tareas/tareas', tokens.admin_qa, cuerpo)).status).toBe(400);
  });

  test('una fecha límite futura sí es válida', async () => {
    expect((await api.post('/tareas/tareas', tokens.admin_qa, { id_trabajador: 1, descripcion: 'Limpiar', fecha_asignacion: hoy(), fecha_limite: '2099-01-01' })).status).toBe(201);
  });
});

describe('Errores de la API', () => {
  test('un error de base de datos no filtra detalles internos', async () => {
    const r = await api.post('/ventas/ventas', tokens.op1, venta({ items: [item({ cantidad: 100000, precio_unitario: 100000 })] }));
    const texto = JSON.stringify(r.body);
    expect(texto).not.toMatch(/SQL|INSERT|SELECT|detalle_venta|stack|sqlMessage/i);
  });

  test('las peticiones sin cuerpo no provocan errores 500', async () => {
    for (const [ruta, token] of [['/ventas/ventas/999999/anular', tokens.admin_qa], ['/produccion/lotes/999999/finalizar', tokens.admin_qa]]) {
      expect((await api.put(ruta, token)).status).toBe(404);
    }
  });
});
