// Pruebas que dependen de las migraciones sql/02 a sql/06. Cada bloque se omite (con aviso) si la
// migración correspondiente no está aplicada en la BD de pruebas, para que la API pueda probarse
// también contra un esquema anterior.
const { pool, api, reiniciar, hoy, fechaLocal, fijarExistencia, existencia, venderHuevos, GRANDE } = require('./helpers');

let tokens;
const aplicada = {};

const existeColumna = async (tabla, columna) =>
  (await pool.query('SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [tabla, columna]))[0][0].n === 1;
const existeRestriccion = async (nombre) =>
  (await pool.query('SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?', [nombre]))[0][0].n === 1;

beforeAll(async () => {
  tokens = await reiniciar();
  aplicada.m02 = await existeColumna('auditoria_usuarios', 'id_actor');
  aplicada.m03 = await existeRestriccion('chk_huevos_stock_no_negativo');
  aplicada.m05 = (await pool.query("SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = 'trg_detalle_venta_delete' AND ACTION_STATEMENT LIKE '%estado_venta%'"))[0][0].n === 1;
  aplicada.m06 = (await pool.query("SELECT NUMERIC_PRECISION AS p FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'postura_diaria' AND COLUMN_NAME = 'tasa_postura'"))[0][0].p >= 9;
  console.log('Migraciones aplicadas en la BD de pruebas:', JSON.stringify(aplicada));
});
afterAll(async () => { await pool.end(); });

const solo = (migracion, nombre, fn) => test(nombre, async () => {
  if (!aplicada[migracion]) { console.warn(`  omitida (falta ${migracion}): ${nombre}`); return; }
  await fn();
});

describe('02 - Auditoría con autor', () => {
  solo('m02', 'cambiar una contraseña registra quién lo hizo y qué cambió', async () => {
    await api.put('/usuarios/3/password', tokens.admin_qa, { contrasena: 'Cambiada123' });
    const [[a]] = await pool.query("SELECT * FROM auditoria_usuarios WHERE usuario_afectado = 'op2' AND detalle LIKE '%contraseña%' ORDER BY id_auditoria DESC LIMIT 1");
    expect(a.id_actor).toBe(1);
  });

  solo('m02', 'desactivar y reactivar quedan registrados con su autor', async () => {
    await api.put('/usuarios/3/desactivar', tokens.admin_qa);
    await api.put('/usuarios/3/reactivar', tokens.admin_qa);
    const [filas] = await pool.query("SELECT detalle, id_actor FROM auditoria_usuarios WHERE usuario_afectado = 'op2' AND detalle IN ('desactivada', 'reactivada')");
    expect(filas.map((f) => f.detalle).sort()).toEqual(['desactivada', 'reactivada']);
    expect(filas.every((f) => f.id_actor === 1)).toBe(true);
  });

  solo('m02', 'el superadministrador cambia un rol y queda como actor', async () => {
    await api.put('/superadmin/usuarios/3/rol', tokens.super_qa, { rol: 'administrador' });
    await api.put('/superadmin/usuarios/3/rol', tokens.super_qa, { rol: 'operador' });
    const [[a]] = await pool.query("SELECT id_actor, detalle FROM auditoria_usuarios WHERE usuario_afectado = 'op2' AND detalle = 'rol' ORDER BY id_auditoria DESC LIMIT 1");
    expect(a.id_actor).toBe(4);
  });

  solo('m02', 'anular una venta queda en la auditoría general con su autor y motivo', async () => {
    await fijarExistencia(10);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 1 })).body.id_venta;
    await api.put(`/ventas/ventas/${venta}/anular`, tokens.admin_qa, { motivo: 'prueba de auditoría' });
    const [[a]] = await pool.query("SELECT * FROM auditoria_general WHERE tabla = 'VENTAS' AND id_registro = ?", [venta]);
    expect(a).toMatchObject({ id_actor: 1, accion: 'ANULAR', detalle: 'prueba de auditoría' });
  });

  solo('m02', 'anular un gasto queda en la auditoría general con su autor', async () => {
    await api.post('/gastos', tokens.admin_qa, { fecha: hoy(), descripcion: 'Gasto a anular', categoria: 'otros', monto: 5 });
    const [[{ id_gasto }]] = await pool.query('SELECT MAX(id_gasto) AS id_gasto FROM gastos');
    await api.put(`/gastos/${id_gasto}/anular`, tokens.admin_qa);
    const [[a]] = await pool.query("SELECT id_actor FROM auditoria_general WHERE tabla = 'GASTOS' AND id_registro = ?", [id_gasto]);
    expect(a.id_actor).toBe(1);
  });

  solo('m02', 'la bitácora del superadministrador muestra el nombre del actor', async () => {
    const r = await api.get('/superadmin/auditoria', tokens.super_qa);
    expect(r.status).toBe(200);
    expect(r.body.some((x) => x.actor === 'admin_qa')).toBe(true);
  });

  test('sin la migración, la bitácora del superadministrador sigue funcionando', async () => {
    expect((await api.get('/superadmin/auditoria', tokens.super_qa)).status).toBe(200);
  });
});

describe('03 - Existencias no negativas', () => {
  solo('m03', 'una existencia negativa es imposible incluso con SQL directo', async () => {
    await expect(pool.query('UPDATE huevos_stock SET existencia_actual = -1 WHERE id_clasificacion = ?', [GRANDE])).rejects.toThrow(/check constraint|chk_/i);
  });

  solo('m03', 'con la restricción activa, vender y anular siguen funcionando', async () => {
    await fijarExistencia(20);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 20 })).body.id_venta;
    expect(await existencia()).toBe(0);
    expect((await api.put(`/ventas/ventas/${venta}/anular`, tokens.admin_qa, {})).status).toBe(200);
    expect(await existencia()).toBe(20);
  });

  solo('m03', 'un consumo de medicamento por encima de la existencia se rechaza', async () => {
    const alta = await api.post('/inventario/medicamentos', tokens.admin_qa, { nombre: 'Med QA', existencia_actual: 1, nivel_minimo: 0, unidad_medida: 'u' });
    const r = await api.post('/inventario/movimientos', tokens.op1, { id_medicamento: alta.body.id_medicamento, fecha: hoy(), tipo_movimiento: 'salida', cantidad: 2 });
    expect(r.status).toBe(400);
  });
});

describe('05 - Renglones de venta ajustan la existencia', () => {
  solo('m05', 'bajar la cantidad de un renglón devuelve la diferencia y recalcula el total', async () => {
    await fijarExistencia(100);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 10, precio: 2 })).body.id_venta;
    expect(await existencia()).toBe(90);
    await pool.query('UPDATE detalle_venta SET cantidad = 4 WHERE id_venta = ?', [venta]);
    expect(await existencia()).toBe(96);
    const [[v]] = await pool.query('SELECT monto_total, saldo_pendiente FROM ventas WHERE id_venta = ?', [venta]);
    expect(Number(v.monto_total)).toBe(8);
    expect(Number(v.saldo_pendiente)).toBe(8);
  });

  solo('m05', 'borrar un renglón devuelve su cantidad', async () => {
    await fijarExistencia(100);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 10 })).body.id_venta;
    await pool.query('DELETE FROM detalle_venta WHERE id_venta = ?', [venta]);
    expect(await existencia()).toBe(100);
  });

  solo('m05', 'borrar el renglón de una venta ya anulada NO devuelve la existencia dos veces', async () => {
    await fijarExistencia(100);
    const venta = (await venderHuevos(tokens.op1, { cantidad: 10 })).body.id_venta;
    await api.put(`/ventas/ventas/${venta}/anular`, tokens.admin_qa, {});
    const antes = await existencia();
    await pool.query('DELETE FROM detalle_venta WHERE id_venta = ?', [venta]);
    expect(await existencia()).toBe(antes);
    const [[v]] = await pool.query('SELECT saldo_pendiente FROM ventas WHERE id_venta = ?', [venta]);
    expect(Number(v.saldo_pendiente)).toBe(0);
  });
});

describe('06 - Tasa de postura sin tope de 999.99 %', () => {
  solo('m06', '5000 huevos con 100 aves se guardan con tasa 5000 %', async () => {
    const lote = (await api.post('/produccion/lotes', tokens.admin_qa, { id_galera: 1, fecha_ingreso: hoy(), aves_recibidas: 100 })).body.id_lote;
    const r = await api.post('/produccion/postura', tokens.op1, { id_lote: lote, fecha: fechaLocal(1), cantidad_huevos: 5000 });
    expect(r.status).toBe(201);
    const [[p]] = await pool.query('SELECT tasa_postura AS t FROM postura_diaria WHERE id_lote = ?', [lote]);
    expect(Number(p.t)).toBe(5000);
  });
});
