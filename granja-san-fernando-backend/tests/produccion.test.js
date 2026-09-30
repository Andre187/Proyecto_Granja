const { pool, api, reiniciar, hoy, fechaLocal } = require('./helpers');

let tokens;
let idLote;

beforeAll(async () => {
  tokens = await reiniciar();
  const r = await api.post('/produccion/lotes', tokens.admin_qa, { id_galera: 1, fecha_ingreso: hoy(), aves_recibidas: 100 });
  expect(r.status).toBe(201);
  idLote = r.body.id_lote;
});
afterAll(async () => { await pool.end(); });

describe('Galeras y lotes', () => {
  test('crear una galera con lote inicial la deja ocupada', async () => {
    const r = await api.post('/produccion/galeras', tokens.admin_qa, { nombre: 'Galera Nueva', capacidad: 500, fecha_ingreso: hoy(), aves_recibidas: 300 });
    expect(r.status).toBe(201);
    const [[g]] = await pool.query('SELECT estado FROM galeras WHERE id_galera = ?', [r.body.id_galera]);
    expect(g.estado).toBe('ocupada');
  });

  test('nombre de galera duplicado -> 409', async () => {
    expect((await api.post('/produccion/galeras', tokens.admin_qa, { nombre: 'Galera Nueva', capacidad: 10 })).status).toBe(409);
  });

  test.each([
    ['nombre de 101 caracteres', { nombre: 'g'.repeat(101), capacidad: 10 }],
    ['nombre de 1 carácter', { nombre: 'g', capacidad: 10 }],
    ['capacidad decimal', { nombre: 'GX', capacidad: 1.5 }],
    ['capacidad cero', { nombre: 'GX', capacidad: 0 }],
    ['capacidad enorme', { nombre: 'GX', capacidad: 1e9 }],
    ['fecha de ingreso futura', { nombre: 'GX', capacidad: 10, fecha_ingreso: '2099-01-01', aves_recibidas: 5 }],
    ['nombre como objeto', { nombre: { a: 1 }, capacidad: 10 }],
  ])('crear galera con %s -> 400', async (_n, cuerpo) => {
    expect((await api.post('/produccion/galeras', tokens.admin_qa, cuerpo)).status).toBe(400);
  });

  test('no se crea un segundo lote en una galera ocupada', async () => {
    const r = await api.post('/produccion/lotes', tokens.admin_qa, { id_galera: 1, fecha_ingreso: hoy(), aves_recibidas: 50 });
    expect(r.status).toBe(400);
  });

  test('un lote en galera inexistente -> 404', async () => {
    expect((await api.post('/produccion/lotes', tokens.admin_qa, { id_galera: 999, fecha_ingreso: hoy(), aves_recibidas: 50 })).status).toBe(404);
  });
});

describe('Postura diaria', () => {
  test('registra la postura con la tasa calculada', async () => {
    const r = await api.post('/produccion/postura', tokens.op1, { id_lote: idLote, fecha: fechaLocal(1), cantidad_huevos: 80 });
    expect(r.status).toBe(201);
    const [[fila]] = await pool.query('SELECT tasa_postura AS t, aves_activas_dia AS a FROM postura_diaria WHERE id_lote = ? AND fecha = ?', [idLote, fechaLocal(1)]);
    expect(Number(fila.t)).toBe(80);
    expect(fila.a).toBe(100);
  });

  test('NO hay tope de huevos contra aves activas: la recolección puede superar a las aves', async () => {
    const r = await api.post('/produccion/postura', tokens.op1, { id_lote: idLote, fecha: fechaLocal(2), cantidad_huevos: 101 });
    expect(r.status).toBe(201);
  });

  test('una tasa muy alta (5000 huevos con 100 aves) se guarda o se rechaza limpio, nunca 500', async () => {
    const r = await api.post('/produccion/postura', tokens.op1, { id_lote: idLote, fecha: fechaLocal(3), cantidad_huevos: 5000 });
    expect([201, 400]).toContain(r.status);
  });

  test('cero huevos es válido y negativo no', async () => {
    expect((await api.post('/produccion/postura', tokens.op1, { id_lote: idLote, fecha: fechaLocal(4), cantidad_huevos: 0 })).status).toBe(201);
    expect((await api.post('/produccion/postura', tokens.op1, { id_lote: idLote, fecha: fechaLocal(5), cantidad_huevos: -1 })).status).toBe(400);
  });

  test('una postura duplicada del mismo lote y día -> 409', async () => {
    const r = await api.post('/produccion/postura', tokens.op1, { id_lote: idLote, fecha: fechaLocal(1), cantidad_huevos: 80 });
    expect(r.status).toBe(409);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM postura_diaria WHERE id_lote = ? AND fecha = ?', [idLote, fechaLocal(1)]);
    expect(n).toBe(1);
  });

  test.each([
    ['fecha futura', { fecha: '2099-01-01', cantidad_huevos: 10 }],
    ['fecha inexistente', { fecha: '2026-02-30', cantidad_huevos: 10 }],
    ['cantidad decimal', { fecha: fechaLocal(6), cantidad_huevos: 1.5 }],
    ['cantidad como texto', { fecha: fechaLocal(6), cantidad_huevos: 'muchos' }],
  ])('postura con %s -> 400', async (_n, extra) => {
    expect((await api.post('/produccion/postura', tokens.op1, { id_lote: idLote, ...extra })).status).toBe(400);
  });

  test('un lote inexistente -> 404', async () => {
    expect((await api.post('/produccion/postura', tokens.op1, { id_lote: 9999, fecha: fechaLocal(7), cantidad_huevos: 5 })).status).toBe(404);
  });
});

describe('Mortalidad', () => {
  test('mayor a las aves activas -> 400', async () => {
    const r = await api.post('/produccion/mortalidad', tokens.op1, { id_lote: idLote, fecha: hoy(), cantidad: 101 });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/supera las aves activas/);
  });

  test('descuenta aves activas del lote', async () => {
    expect((await api.post('/produccion/mortalidad', tokens.op1, { id_lote: idLote, fecha: hoy(), cantidad: 10, causa: 'Calor 🌡️' })).status).toBe(201);
    const [[l]] = await pool.query('SELECT aves_activas FROM lotes WHERE id_lote = ?', [idLote]);
    expect(l.aves_activas).toBe(90);
  });

  test('lote inexistente -> 404', async () => {
    expect((await api.post('/produccion/mortalidad', tokens.op1, { id_lote: 9999, fecha: hoy(), cantidad: 1 })).status).toBe(404);
  });

  test.each([
    ['cantidad cero', { cantidad: 0 }],
    ['fecha futura', { cantidad: 1, fecha: '2099-01-01' }],
    ['causa de 151 caracteres', { cantidad: 1, causa: 'c'.repeat(151) }],
  ])('mortalidad con %s -> 400', async (_n, extra) => {
    expect((await api.post('/produccion/mortalidad', tokens.op1, { id_lote: idLote, fecha: hoy(), ...extra })).status).toBe(400);
  });
});

describe('Lote finalizado', () => {
  beforeAll(async () => {
    const r = await api.put(`/produccion/lotes/${idLote}/finalizar`, tokens.admin_qa, { siguiente_estado: 'disponible' });
    expect(r.status).toBe(200);
  });

  test('la galera queda disponible', async () => {
    const [[g]] = await pool.query('SELECT estado FROM galeras WHERE id_galera = 1');
    expect(g.estado).toBe('disponible');
  });

  test('finalizar otra vez -> 404', async () => {
    expect((await api.put(`/produccion/lotes/${idLote}/finalizar`, tokens.admin_qa, {})).status).toBe(404);
  });

  test('no se registra postura ni mortalidad en un lote finalizado', async () => {
    expect((await api.post('/produccion/postura', tokens.op1, { id_lote: idLote, fecha: fechaLocal(8), cantidad_huevos: 5 })).status).toBe(400);
    expect((await api.post('/produccion/mortalidad', tokens.op1, { id_lote: idLote, fecha: hoy(), cantidad: 1 })).status).toBe(400);
  });

  test('sanidad: vacunación y peso con datos válidos y fecha futura rechazada', async () => {
    const lote2 = await api.post('/produccion/lotes', tokens.admin_qa, { id_galera: 1, fecha_ingreso: hoy(), aves_recibidas: 50 });
    const id = lote2.body.id_lote;
    expect((await api.post('/sanidad/vacunacion', tokens.op1, { id_lote: id, fecha: hoy(), tipo_vacuna: 'Newcastle', semana_aplicacion: 6 })).status).toBe(201);
    expect((await api.post('/sanidad/vacunacion', tokens.op1, { id_lote: id, fecha: '2099-01-01', tipo_vacuna: 'X', semana_aplicacion: 6 })).status).toBe(400);
    expect((await api.post('/sanidad/peso', tokens.op1, { id_lote: id, fecha: hoy(), semana: 6, peso_promedio: 1.5, uniformidad: 90 })).status).toBe(201);
    expect((await api.post('/sanidad/peso', tokens.op1, { id_lote: id, fecha: hoy(), semana: 6, peso_promedio: 0, uniformidad: 90 })).status).toBe(400);
    expect((await api.post('/sanidad/peso', tokens.op1, { id_lote: id, fecha: hoy(), semana: 6, peso_promedio: 1.5, uniformidad: 101 })).status).toBe(400);
  });
});
