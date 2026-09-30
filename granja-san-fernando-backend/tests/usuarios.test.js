const { pool, api, login, reiniciar, hoy, CONTRASENA } = require('./helpers');

let tokens;

beforeAll(async () => { tokens = await reiniciar(); });
afterAll(async () => { await pool.end(); });

const nuevo = (extra = {}) => ({ usuario: 'nuevo.qa', nombre: 'Ana', apellido: 'Núñez', contrasena: CONTRASENA, rol: 'operador', ...extra });

describe('Crear usuarios', () => {
  test('un operador nuevo recibe su registro de trabajador y puede iniciar sesión', async () => {
    const r = await api.post('/usuarios', tokens.admin_qa, nuevo());
    expect(r.status).toBe(201);
    expect(r.body.id_trabajador).toEqual(expect.any(Number));
    expect((await login('nuevo.qa')).status).toBe(200);
  });

  test('un administrador nuevo no genera trabajador', async () => {
    const r = await api.post('/usuarios', tokens.admin_qa, nuevo({ usuario: 'admin.nuevo', rol: 'administrador' }));
    expect(r.status).toBe(201);
    expect(r.body.id_trabajador).toBeNull();
  });

  test('un nombre de usuario repetido (aun con otras mayúsculas) -> 409', async () => {
    expect((await api.post('/usuarios', tokens.admin_qa, nuevo())).status).toBe(409);
    expect((await api.post('/usuarios', tokens.admin_qa, nuevo({ usuario: 'NUEVO.QA' }))).status).toBe(409);
  });

  test('si falla el alta no queda un trabajador huérfano', async () => {
    const antes = (await pool.query('SELECT COUNT(*) AS n FROM trabajadores'))[0][0].n;
    await api.post('/usuarios', tokens.admin_qa, nuevo());
    expect((await pool.query('SELECT COUNT(*) AS n FROM trabajadores'))[0][0].n).toBe(antes);
  });

  test.each([
    ['usuario de 2 caracteres', { usuario: 'zz' }],
    ['usuario con espacios y emoji', { usuario: 'a b🐔' }],
    ['usuario como objeto', { usuario: { a: 1 } }],
    ['nombre vacío', { nombre: '' }],
    ['apellido de 51 caracteres', { apellido: 'a'.repeat(51) }],
    ['rol inválido', { rol: 'jefe' }],
    ['rol superadministrador', { rol: 'superadministrador' }],
    ['contraseña sin número', { contrasena: 'abcdefgh' }],
    ['contraseña sin letra', { contrasena: '12345678' }],
    ['contraseña de 7 caracteres', { contrasena: 'Abcde1x'.slice(0, 7) }],
    ['contraseña como arreglo', { contrasena: [CONTRASENA] }],
  ])('%s -> 400', async (_n, extra) => {
    expect((await api.post('/usuarios', tokens.admin_qa, nuevo({ usuario: 'valida.qa', ...extra }))).status).toBe(400);
  });
});

describe('Límite de 72 bytes de la contraseña (bcrypt)', () => {
  test('73 caracteres se rechazan', async () => {
    expect((await api.post('/usuarios', tokens.admin_qa, nuevo({ usuario: 'largo73', contrasena: `A1${'x'.repeat(71)}` }))).status).toBe(400);
  });

  test('72 bytes justos con "ñ" (2 bytes cada una) se rechazan si pasan de 72 bytes', async () => {
    expect((await api.post('/usuarios', tokens.admin_qa, nuevo({ usuario: 'largoñ', contrasena: `A1${'ñ'.repeat(36)}` }))).status).toBe(400);
  });

  test('exactamente 72 caracteres se aceptan y el login funciona con la contraseña completa', async () => {
    const contrasena = `A1${'x'.repeat(70)}`;
    const r = await api.post('/usuarios', tokens.admin_qa, nuevo({ usuario: 'largo72', contrasena }));
    expect(r.status).toBe(201);
    expect((await login('largo72', contrasena)).status).toBe(200);
  });

  test('cambiar la contraseña con 73 caracteres se rechaza (administrador y superadministrador)', async () => {
    const [[{ id_usuario }]] = await pool.query("SELECT id_usuario FROM usuarios WHERE usuario = 'largo72'");
    const larga = `A1${'x'.repeat(71)}`;
    expect((await api.put(`/usuarios/${id_usuario}/password`, tokens.admin_qa, { contrasena: larga })).status).toBe(400);
    expect((await api.put(`/superadmin/usuarios/${id_usuario}/password`, tokens.super_qa, { contrasena: larga })).status).toBe(400);
    expect((await api.put(`/usuarios/${id_usuario}/password`, tokens.admin_qa, { contrasena: 'Segura123456' })).status).toBe(200);
    expect((await login('largo72', 'Segura123456')).status).toBe(200);
  });
});

describe('Vincular trabajador', () => {
  test('genera el registro de trabajador de una cuenta sin uno, y no permite hacerlo dos veces', async () => {
    await pool.query("INSERT INTO usuarios (usuario, nombre, apellido, contrasena, rol) SELECT 'sin.trabajador', 'Sin', 'Trabajador', contrasena, 'operador' FROM usuarios WHERE id_usuario = 2");
    const [[{ id_usuario }]] = await pool.query("SELECT id_usuario FROM usuarios WHERE usuario = 'sin.trabajador'");
    expect((await api.post(`/usuarios/${id_usuario}/vincular-trabajador`, tokens.admin_qa)).status).toBe(200);
    expect((await api.post(`/usuarios/${id_usuario}/vincular-trabajador`, tokens.admin_qa)).status).toBe(400);
    expect((await api.post('/usuarios/99999/vincular-trabajador', tokens.admin_qa)).status).toBe(404);
  });
});

describe('Personal y pagos', () => {
  const pago = { id_trabajador: 1, semana_inicio: '2026-09-21', semana_fin: '2026-09-27', dias_laborados: 7 };

  test('registrar un trabajador eventual sin cuenta', async () => {
    const r = await api.post('/personal/trabajadores', tokens.admin_qa, { nombre: 'Eventual Ñ', costo_dia: 80 });
    expect(r.status).toBe(201);
    const lista = await api.get('/personal/trabajadores', tokens.admin_qa);
    expect(lista.body.find((t) => t.id_trabajador === r.body.id_trabajador).usuario_vinculado).toBeNull();
  });

  test.each([
    ['nombre vacío', { nombre: '', costo_dia: 80 }],
    ['costo cero', { nombre: 'Abc', costo_dia: 0 }],
    ['costo enorme', { nombre: 'Abc', costo_dia: 99999999 }],
    ['costo con 3 decimales', { nombre: 'Abc', costo_dia: 10.555 }],
    ['nombre como objeto', { nombre: { a: 1 }, costo_dia: 10 }],
  ])('trabajador con %s -> 400', async (_n, cuerpo) => {
    expect((await api.post('/personal/trabajadores', tokens.admin_qa, cuerpo)).status).toBe(400);
  });

  test('editar un trabajador inexistente -> 404', async () => {
    expect((await api.put('/personal/trabajadores/9999', tokens.admin_qa, { costo_dia: 10 })).status).toBe(404);
  });

  test('un pago sin costo por día -> 400; con costo válido -> 201', async () => {
    expect((await api.post('/personal/pagos', tokens.admin_qa, pago)).status).toBe(400);
    expect((await api.post('/personal/pagos', tokens.admin_qa, { ...pago, costo_dia_pago: 50 })).status).toBe(201);
  });

  test('el total a pagar se calcula en la base de datos', async () => {
    const r = await api.get('/personal/pagos', tokens.admin_qa);
    expect(Number(r.body[0].total_pagar)).toBe(350);
  });

  test('un pago duplicado de la misma semana -> 409', async () => {
    expect((await api.post('/personal/pagos', tokens.admin_qa, { ...pago, costo_dia_pago: 50 })).status).toBe(409);
  });

  test.each([
    ['costo absurdo', { costo_dia_pago: 99999999 }],
    ['costo como texto', { costo_dia_pago: 'abc' }],
    ['días mayores a 7', { costo_dia_pago: 50, dias_laborados: 8, semana_inicio: '2026-08-03', semana_fin: '2026-08-09' }],
    ['fin anterior al inicio', { costo_dia_pago: 50, semana_inicio: '2026-08-10', semana_fin: '2026-08-03' }],
    ['semana futura', { costo_dia_pago: 50, semana_inicio: '2099-01-01', semana_fin: '2099-01-07' }],
    ['trabajador como texto', { costo_dia_pago: 50, id_trabajador: 'x' }],
  ])('pago con %s -> 400', async (_n, extra) => {
    expect((await api.post('/personal/pagos', tokens.admin_qa, { ...pago, semana_inicio: '2026-08-03', semana_fin: '2026-08-09', ...extra })).status).toBe(400);
  });

  test('pago a un trabajador inexistente -> 404', async () => {
    expect((await api.post('/personal/pagos', tokens.admin_qa, { ...pago, id_trabajador: 9999, costo_dia_pago: 50 })).status).toBe(404);
  });

  test('desactivar a un trabajador con cuenta también desactiva su cuenta', async () => {
    const antes = (await login('op1')).body.token;
    expect((await api.get('/tareas/tareas', antes)).status).toBe(200);
    expect((await api.put('/personal/trabajadores/1', tokens.admin_qa, { estado: 'inactivo' })).status).toBe(200);
    expect((await api.get('/tareas/tareas', antes)).status).toBe(401);
    expect((await login('op1')).status).toBe(403);
  });

  test('no se asignan tareas a un trabajador inactivo', async () => {
    const r = await api.post('/tareas/tareas', tokens.admin_qa, { id_trabajador: 1, descripcion: 'x', fecha_asignacion: hoy() });
    expect(r.status).toBe(400);
  });
});
