const jwt = require('jsonwebtoken');
const { app, pool, request, api, login, reiniciar, CONTRASENA } = require('./helpers');
const { huellaContrasena } = require('../utils/sesion');

let tokens;

beforeAll(async () => { tokens = await reiniciar(); });
afterAll(async () => { await pool.end(); });

const firmar = (payload, secreto = process.env.JWT_SECRET, opciones = { expiresIn: '1h' }) => jwt.sign(payload, secreto, opciones);
const huellaDe = async (idUsuario) => {
  const [[fila]] = await pool.query('SELECT contrasena FROM usuarios WHERE id_usuario = ?', [idUsuario]);
  return huellaContrasena(fila.contrasena);
};

describe('Login', () => {
  test('con credenciales correctas devuelve token y datos del usuario', async () => {
    const r = await login('op1');
    expect(r.status).toBe(200);
    expect(r.body.token).toEqual(expect.any(String));
    expect(r.body.usuario).toMatchObject({ usuario: 'op1', rol: 'operador', id_trabajador: 1 });
    expect(r.body.usuario.contrasena).toBeUndefined();
  });

  test('el token lleva la huella de la contraseña y el inicio de sesión', async () => {
    const dec = jwt.decode(tokens.admin_qa);
    expect(dec.pv).toBeTruthy();
    expect(dec.inicio).toEqual(expect.any(Number));
  });

  test('contraseña incorrecta y usuario inexistente dan la misma respuesta 401', async () => {
    const mala = await login('op1', 'incorrecta1');
    const inexistente = await login('no_existe_zz', 'incorrecta1');
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(mala.body.error).toBe(inexistente.body.error);
  });

  test('un usuario inexistente tarda lo mismo que uno real (no se puede enumerar por tiempo)', async () => {
    const t0 = Date.now();
    await login('no_existe_zz', 'incorrecta1');
    // Con el hash señuelo, bcrypt corre siempre: no puede responder casi al instante
    expect(Date.now() - t0).toBeGreaterThan(15);
  });

  test('cuenta desactivada: con contraseña incorrecta no revela el estado (401)', async () => {
    await pool.query('UPDATE usuarios SET activo = 0 WHERE usuario = ?', ['op2']);
    const r = await login('op2', 'incorrecta1');
    expect(r.status).toBe(401);
  });

  test('cuenta desactivada: con la contraseña correcta responde 403', async () => {
    const r = await login('op2');
    expect(r.status).toBe(403);
    await pool.query('UPDATE usuarios SET activo = 1 WHERE usuario = ?', ['op2']);
  });

  test('JSON malformado responde 400, no 500', async () => {
    const r = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').set('X-Forwarded-For', '10.9.9.1').send('{"usuario":');
    expect(r.status).toBe(400);
  });

  test.each([
    ['contraseña como arreglo', { usuario: 'op1', contrasena: ['abcdef'] }],
    ['usuario como objeto', { usuario: { $ne: 1 }, contrasena: 'abcdef' }],
    ['sin usuario', { contrasena: 'abcdef' }],
    ['contraseña muy corta', { usuario: 'op1', contrasena: '123' }],
    ['usuario con caracteres raros', { usuario: "op1' OR '1'='1", contrasena: 'abcdef' }],
  ])('entrada inválida (%s) responde 400', async (_nombre, cuerpo) => {
    const r = await api.post('/auth/login', null, cuerpo);
    expect(r.status).toBe(400);
  });

  test('límite de intentos: tras 6 fallos desde la misma IP responde 429, pero otra IP no se ve afectada', async () => {
    const ip = '10.77.77.77';
    for (let i = 0; i < 6; i++) {
      const r = await login('op1', 'incorrecta1', { ip });
      expect(r.status).toBe(401);
    }
    expect((await login('op1', 'incorrecta1', { ip })).status).toBe(429);
    expect((await login('op1', CONTRASENA, { ip: '10.88.88.88' })).status).toBe(200);
  });
});

describe('Validación del token', () => {
  test('sin token -> 401', async () => {
    expect((await api.get('/usuarios')).status).toBe(401);
  });

  test('token basura -> 401', async () => {
    expect((await api.get('/usuarios', 'abc.def.ghi')).status).toBe(401);
  });

  test('algoritmo "none" -> 401', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const sinFirma = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id_usuario: 1, rol: 'administrador' })}.`;
    expect((await api.get('/usuarios', sinFirma)).status).toBe(401);
  });

  test('firmado con otro secreto -> 401', async () => {
    const t = firmar({ id_usuario: 1, rol: 'administrador', pv: await huellaDe(1) }, 'otro-secreto');
    expect((await api.get('/usuarios', t)).status).toBe(401);
  });

  test('token expirado -> 401', async () => {
    const t = firmar({ id_usuario: 1, rol: 'administrador', pv: await huellaDe(1) }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect((await api.get('/usuarios', t)).status).toBe(401);
  });

  test('usuario que ya no existe en la BD -> 401', async () => {
    const t = firmar({ id_usuario: 99999, rol: 'administrador', pv: 'x' });
    expect((await api.get('/usuarios', t)).status).toBe(401);
  });

  test('token sin huella de contraseña (formato antiguo) -> 401', async () => {
    const t = firmar({ id_usuario: 1, usuario: 'admin_qa', rol: 'administrador' });
    expect((await api.get('/usuarios', t)).status).toBe(401);
  });

  test('un rol falso dentro de un token válido no otorga permisos: manda la BD', async () => {
    const t = firmar({ id_usuario: 2, usuario: 'op1', rol: 'administrador', id_trabajador: 1, pv: await huellaDe(2), inicio: Math.floor(Date.now() / 1000) });
    expect((await api.get('/usuarios', t)).status).toBe(403);
  });

  test('un usuario desactivado pierde el acceso con su token anterior', async () => {
    const r = await login('op2');
    await pool.query('UPDATE usuarios SET activo = 0 WHERE usuario = ?', ['op2']);
    expect((await api.get('/tareas/tareas', r.body.token)).status).toBe(401);
    await pool.query('UPDATE usuarios SET activo = 1 WHERE usuario = ?', ['op2']);
  });

  test('cambiar la contraseña invalida los tokens anteriores de esa cuenta', async () => {
    const antes = (await login('op2')).body.token;
    expect((await api.get('/tareas/tareas', antes)).status).toBe(200);
    const cambio = await api.put('/usuarios/3/password', tokens.admin_qa, { contrasena: 'Nueva12345' });
    expect(cambio.status).toBe(200);
    expect((await api.get('/tareas/tareas', antes)).status).toBe(401);
    expect((await login('op2', 'Nueva12345')).status).toBe(200);
    await api.put('/usuarios/3/password', tokens.admin_qa, { contrasena: CONTRASENA });
  });
});

describe('Renovación de sesión', () => {
  test('renueva el token mientras la sesión sea reciente', async () => {
    const r = await api.post('/auth/renovar', tokens.admin_qa);
    expect(r.status).toBe(200);
    expect(jwt.decode(r.body.token).inicio).toBe(jwt.decode(tokens.admin_qa).inicio);
  });

  test('rechaza renovar una sesión que superó el tope de 12 horas', async () => {
    const t = firmar({ id_usuario: 1, usuario: 'admin_qa', rol: 'administrador', id_trabajador: null, pv: await huellaDe(1), inicio: Math.floor(Date.now() / 1000) - 13 * 3600 });
    expect((await api.post('/auth/renovar', t)).status).toBe(401);
  });
});

describe('Respuestas generales', () => {
  test('una ruta inexistente responde 404 en JSON', async () => {
    const r = await request(app).get('/api/no-existe').set('X-Forwarded-For', '10.9.9.2');
    expect(r.status).toBe(404);
    expect(r.body.error).toBeTruthy();
  });

  test('un :id que no es número responde 400', async () => {
    expect((await api.put('/usuarios/abc', tokens.admin_qa, { rol: 'operador' })).status).toBe(400);
  });

  test('no se anuncia el framework en las cabeceras y Helmet está activo', async () => {
    const r = await request(app).get('/').set('X-Forwarded-For', '10.9.9.3');
    expect(r.headers['x-powered-by']).toBeUndefined();
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['content-security-policy']).toBeDefined();
  });

  test('CORS: un origen no permitido recibe 403 y sin cabeceras de acceso', async () => {
    const r = await request(app).get('/api/usuarios').set('Origin', 'http://evil.com').set('X-Forwarded-For', '10.9.9.4');
    expect(r.status).toBe(403);
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('CORS: el frontend legítimo sí puede hacer preflight', async () => {
    const r = await request(app).options('/api/usuarios').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'GET').set('X-Forwarded-For', '10.9.9.5');
    expect(r.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
