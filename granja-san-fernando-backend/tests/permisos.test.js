const { pool, api, login, reiniciar, hoy, CONTRASENA } = require('./helpers');

let tokens;

beforeAll(async () => { tokens = await reiniciar(); });
afterAll(async () => { await pool.end(); });

describe('Un operador no puede usar endpoints de administración', () => {
  const rutasProhibidas = [
    ['get', '/usuarios'],
    ['get', '/usuarios/trabajadores'],
    ['post', '/usuarios'],
    ['get', '/reportes/resumen'],
    ['get', '/reportes/financiero'],
    ['get', '/gastos'],
    ['post', '/gastos'],
    ['get', '/personal/trabajadores'],
    ['get', '/personal/pagos'],
    ['post', '/personal/pagos'],
    ['get', '/ventas/resumen'],
    ['put', '/ventas/ventas/1/anular'],
    ['post', '/inventario/concentrado'],
    ['get', '/inventario/concentrado'],
    ['post', '/inventario/medicamentos'],
    ['post', '/produccion/galeras'],
    ['post', '/produccion/lotes'],
    ['post', '/tareas/tareas'],
    ['get', '/test-db'],
  ];

  test.each(rutasProhibidas)('%s %s -> 403', async (metodo, ruta) => {
    const r = await api[metodo](ruta, tokens.op2, metodo === 'get' ? undefined : {});
    expect(r.status).toBe(403);
  });

  test.each([
    ['get', '/superadmin/usuarios'],
    ['get', '/superadmin/auditoria'],
    ['put', '/superadmin/usuarios/3/rol'],
  ])('%s %s (solo superadministrador) -> 403', async (metodo, ruta) => {
    const r = await api[metodo](ruta, tokens.op2, metodo === 'get' ? undefined : { rol: 'superadministrador' });
    expect(r.status).toBe(403);
  });

  test('no puede subirse a sí mismo de rol', async () => {
    expect((await api.put('/usuarios/3', tokens.op2, { rol: 'administrador' })).status).toBe(403);
    const [[fila]] = await pool.query('SELECT rol FROM usuarios WHERE id_usuario = 3');
    expect(fila.rol).toBe('operador');
  });
});

describe('Lo que un operador SÍ puede hacer', () => {
  test.each([
    ['/produccion/galeras'],
    ['/produccion/lotes'],
    ['/sanidad/lotes'],
    ['/inventario/huevos-stock'],
    ['/inventario/concentrado-stock'],
    ['/inventario/medicamentos'],
    ['/ventas/clientes'],
    ['/ventas/clasificaciones'],
    ['/tareas/tareas'],
  ])('GET %s -> 200', async (ruta) => {
    expect((await api.get(ruta, tokens.op1)).status).toBe(200);
  });
});

describe('Administrador', () => {
  test('no accede a los endpoints del superadministrador', async () => {
    expect((await api.get('/superadmin/usuarios', tokens.admin_qa)).status).toBe(403);
    expect((await api.put('/superadmin/usuarios/1/rol', tokens.admin_qa, { rol: 'superadministrador' })).status).toBe(403);
  });

  test('no ve al superadministrador en el listado de usuarios', async () => {
    const r = await api.get('/usuarios', tokens.admin_qa);
    expect(r.status).toBe(200);
    expect(r.body.some((u) => u.rol === 'superadministrador')).toBe(false);
  });

  test('no puede crear un usuario con rol superadministrador', async () => {
    const r = await api.post('/usuarios', tokens.admin_qa, { usuario: 'intruso', nombre: 'Ab', apellido: 'Cd', contrasena: CONTRASENA, rol: 'superadministrador' });
    expect(r.status).toBe(400);
  });

  test('no puede tocar la cuenta del superadministrador (contraseña, rol, estado)', async () => {
    expect((await api.put('/usuarios/4/password', tokens.admin_qa, { contrasena: 'Abcdefg9' })).status).toBe(403);
    expect((await api.put('/usuarios/4', tokens.admin_qa, { rol: 'operador' })).status).toBe(403);
    expect((await api.put('/usuarios/4/desactivar', tokens.admin_qa)).status).toBe(403);
  });

  test('no puede cambiar la contraseña, el rol ni el estado de OTRO administrador', async () => {
    expect((await api.put('/usuarios/5/password', tokens.admin_qa, { contrasena: 'Hackeado99' })).status).toBe(403);
    expect((await api.put('/usuarios/5', tokens.admin_qa, { rol: 'operador' })).status).toBe(403);
    expect((await api.put('/usuarios/5/desactivar', tokens.admin_qa)).status).toBe(403);
    expect((await login('admin2_qa')).status).toBe(200);
  });

  test('no puede cambiarse su propio rol ni desactivarse', async () => {
    expect((await api.put('/usuarios/1', tokens.admin_qa, { rol: 'operador' })).status).toBe(400);
    expect((await api.put('/usuarios/1/desactivar', tokens.admin_qa)).status).toBe(400);
  });

  test('un usuario inexistente responde 404', async () => {
    expect((await api.put('/usuarios/9999', tokens.admin_qa, { rol: 'operador' })).status).toBe(404);
    expect((await api.put('/usuarios/9999/password', tokens.admin_qa, { contrasena: CONTRASENA })).status).toBe(404);
  });

  test('sí puede gestionar operadores: cambiar contraseña, desactivar y reactivar', async () => {
    expect((await api.put('/usuarios/3/password', tokens.admin_qa, { contrasena: 'Otra123456' })).status).toBe(200);
    expect((await api.put('/usuarios/3/desactivar', tokens.admin_qa)).status).toBe(200);
    expect((await login('op2', 'Otra123456')).status).toBe(403);
    expect((await api.put('/usuarios/3/reactivar', tokens.admin_qa)).status).toBe(200);
    expect((await login('op2', 'Otra123456')).status).toBe(200);
    await api.put('/usuarios/3/password', tokens.admin_qa, { contrasena: CONTRASENA });
  });

  test('no puede desactivar al único administrador activo', async () => {
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id_usuario = 5');
    const r = await api.put('/usuarios/1/desactivar', tokens.super_qa);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/único administrador activo/);
    await pool.query('UPDATE usuarios SET activo = 1 WHERE id_usuario = 5');
  });
});

describe('Superadministrador', () => {
  test('puede resetear la contraseña de un administrador y sus tokens anteriores dejan de servir', async () => {
    const viejo = (await login('admin2_qa')).body.token;
    const r = await api.put('/superadmin/usuarios/5/password', tokens.super_qa, { contrasena: 'ResetSuper1' });
    expect(r.status).toBe(200);
    expect((await api.get('/usuarios', viejo)).status).toBe(401);
    expect((await login('admin2_qa', 'ResetSuper1')).status).toBe(200);
    await api.put('/superadmin/usuarios/5/password', tokens.super_qa, { contrasena: CONTRASENA });
  });

  test('un usuario inexistente responde 404', async () => {
    expect((await api.put('/superadmin/usuarios/9999/rol', tokens.super_qa, { rol: 'operador' })).status).toBe(404);
  });

  test('no puede quitarse a sí mismo el rol de superadministrador ni desactivarse', async () => {
    expect((await api.put('/superadmin/usuarios/4/rol', tokens.super_qa, { rol: 'administrador' })).status).toBe(400);
    expect((await api.put('/superadmin/usuarios/4/desactivar', tokens.super_qa)).status).toBe(400);
  });

  test('ve la lista completa de usuarios y la bitácora', async () => {
    const usuarios = await api.get('/superadmin/usuarios', tokens.super_qa);
    expect(usuarios.status).toBe(200);
    expect(usuarios.body.some((u) => u.rol === 'superadministrador')).toBe(true);
    expect((await api.get('/superadmin/auditoria', tokens.super_qa)).status).toBe(200);
  });
});

describe('Datos propios de cada operador (IDOR)', () => {
  let tareaDeOp2;

  beforeAll(async () => {
    // Las pruebas anteriores cambian contraseñas (y con ello invalidan tokens): se inicia sesión de nuevo
    for (const usuario of ['op1', 'op2', 'admin_qa']) tokens[usuario] = (await login(usuario)).body.token;
    await api.post('/tareas/tareas', tokens.admin_qa, { id_trabajador: 1, descripcion: 'de op1', fecha_asignacion: hoy() });
    await api.post('/tareas/tareas', tokens.admin_qa, { id_trabajador: 2, descripcion: 'de op2', fecha_asignacion: hoy() });
    [[{ id_tarea: tareaDeOp2 }]] = await pool.query('SELECT id_tarea FROM tareas WHERE id_trabajador = 2');
  });

  test('cada operador ve solo sus tareas', async () => {
    const r1 = await api.get('/tareas/tareas', tokens.op1);
    const r2 = await api.get('/tareas/tareas', tokens.op2);
    expect(r1.body.map((t) => t.descripcion)).toEqual(['de op1']);
    expect(r2.body.map((t) => t.descripcion)).toEqual(['de op2']);
  });

  test('el administrador ve todas las tareas', async () => {
    expect((await api.get('/tareas/tareas', tokens.admin_qa)).body).toHaveLength(2);
  });

  test('un operador no puede cambiar el estado de la tarea de otro (403)', async () => {
    const r = await api.put(`/tareas/tareas/${tareaDeOp2}/estado`, tokens.op1, { estado: 'finalizado' });
    expect(r.status).toBe(403);
    const [[fila]] = await pool.query('SELECT estado FROM tareas WHERE id_tarea = ?', [tareaDeOp2]);
    expect(fila.estado).toBe('pendiente');
  });

  test('sí puede cambiar el estado de su propia tarea', async () => {
    expect((await api.put(`/tareas/tareas/${tareaDeOp2}/estado`, tokens.op2, { estado: 'en proceso' })).status).toBe(200);
  });

  test('estado inválido y tarea inexistente', async () => {
    expect((await api.put(`/tareas/tareas/${tareaDeOp2}/estado`, tokens.op2, { estado: 'hackeado' })).status).toBe(400);
    expect((await api.put('/tareas/tareas/999999/estado', tokens.op1, { estado: 'finalizado' })).status).toBe(404);
  });

  test('el texto con HTML se guarda como texto plano (React lo escapa al mostrarlo)', async () => {
    const xss = '<img src=x onerror=alert(1)>';
    expect((await api.post('/tareas/tareas', tokens.admin_qa, { id_trabajador: 1, descripcion: xss, fecha_asignacion: hoy() })).status).toBe(201);
    const r = await api.get('/tareas/tareas', tokens.op1);
    expect(r.body.some((t) => t.descripcion === xss)).toBe(true);
  });
});
