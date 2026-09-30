const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const pool = require('../db');
const { verificarToken, soloAdministrador } = require('../middleware/auth.middleware');
const { validar } = require('../middleware/validacion.middleware');
const { manejarError } = require('../utils/manejarError');
const { conActor } = require('../utils/actor');
const { validarParametroId } = require('../utils/validadores');
const { REGEX_CONTRASENA_SEGURA, MENSAJE_CONTRASENA_SEGURA, esContrasenaSegura } = require('../utils/contrasenaSegura');

const router = express.Router();

const reglasCrearUsuario = [
  body('usuario')
    .isString().withMessage('El usuario es requerido').bail()
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('El usuario solo puede contener letras, números, puntos, guiones y guiones bajos'),
  body('nombre')
    .isString().withMessage('El nombre es requerido').bail()
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  body('apellido')
    .isString().withMessage('El apellido es requerido').bail()
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 50 }).withMessage('El apellido debe tener entre 2 y 50 caracteres'),
  body('contrasena')
    .isString().withMessage(MENSAJE_CONTRASENA_SEGURA).bail()
    .custom((valor) => esContrasenaSegura(valor)).withMessage(MENSAJE_CONTRASENA_SEGURA),
  body('rol')
    .isIn(['administrador', 'operador']).withMessage('Rol inválido'),
];

router.use(verificarToken, soloAdministrador);
validarParametroId(router);

// GET /api/usuarios — el administrador normal nunca ve al superadministrador
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id_usuario, u.usuario, u.nombre, u.apellido, u.rol, u.activo, u.id_trabajador, t.nombre AS trabajador_nombre
      FROM USUARIOS u
      LEFT JOIN TRABAJADORES t ON t.id_trabajador = u.id_trabajador
      WHERE u.rol != 'superadministrador'
      ORDER BY u.id_usuario
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.get('/trabajadores', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.id_trabajador, t.nombre, u.usuario AS vinculado_a
      FROM TRABAJADORES t
      LEFT JOIN USUARIOS u ON u.id_trabajador = t.id_trabajador
      WHERE t.estado = 'activo'
      ORDER BY t.nombre
    `);
    res.json(rows);
  } catch (error) {
    manejarError(res, error);
  }
});

router.post('/', reglasCrearUsuario, validar, async (req, res) => {
  try {
    const { usuario, nombre, apellido, contrasena, rol } = req.body;
    const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`.trim();
    const hash = await bcrypt.hash(contrasena, 10);

    const resultado = await conActor(req, async (conexion) => {
      try {
        await conexion.beginTransaction();

        let idTrabajador = null;

        if (rol === 'operador') {
          const [resultTrabajador] = await conexion.query(
            'INSERT INTO TRABAJADORES (nombre, costo_dia, estado) VALUES (?, 0, "activo")',
            [nombreCompleto]
          );
          idTrabajador = resultTrabajador.insertId;
        }

        const [result] = await conexion.query(
          'INSERT INTO USUARIOS (usuario, nombre, apellido, contrasena, rol, id_trabajador) VALUES (?, ?, ?, ?, ?, ?)',
          [usuario, nombre.trim(), apellido.trim(), hash, rol, idTrabajador]
        );

        await conexion.commit();
        return { id_usuario: result.insertId, usuario, nombre, apellido, rol, id_trabajador: idTrabajador };
      } catch (error) {
        await conexion.rollback();
        throw error;
      }
    });

    res.status(201).json(resultado);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
    }
    manejarError(res, error);
  }
});

router.post('/:id/vincular-trabajador', async (req, res) => {
  try {
    const respuesta = await conActor(req, async (conexion) => {
      const [rows] = await conexion.query('SELECT * FROM USUARIOS WHERE id_usuario = ?', [req.params.id]);
      if (rows.length === 0) {
        return { status: 404, cuerpo: { error: 'Usuario no encontrado' } };
      }
      const usuarioEncontrado = rows[0];

      if (usuarioEncontrado.id_trabajador) {
        return { status: 400, cuerpo: { error: 'Este usuario ya tiene un trabajador vinculado' } };
      }

      try {
        await conexion.beginTransaction();

        // Si la cuenta ya tiene nombre y apellido reales, se usan; si es una cuenta antigua
        // que no los tiene, se usa el usuario de acceso como último recurso.
        const nombreTrabajador = usuarioEncontrado.nombre
          ? `${usuarioEncontrado.nombre} ${usuarioEncontrado.apellido || ''}`.trim()
          : usuarioEncontrado.usuario;

        const [resultTrabajador] = await conexion.query(
          'INSERT INTO TRABAJADORES (nombre, costo_dia, estado) VALUES (?, 0, "activo")',
          [nombreTrabajador]
        );

        await conexion.query('UPDATE USUARIOS SET id_trabajador = ? WHERE id_usuario = ?', [resultTrabajador.insertId, req.params.id]);

        await conexion.commit();
        return { status: 200, cuerpo: { mensaje: 'Registro de trabajador generado correctamente' } };
      } catch (error) {
        await conexion.rollback();
        throw error;
      }
    });
    res.status(respuesta.status).json(respuesta.cuerpo);
  } catch (error) {
    manejarError(res, error);
  }
});

// Carga la cuenta sobre la que se va a actuar y decide si quien pide puede tocarla:
// - el superadministrador es intocable desde este módulo (tiene su propio módulo);
// - un administrador solo gestiona operadores y su propia cuenta; para tocar a OTRO
//   administrador hace falta el superadministrador.
async function cargarObjetivo(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT id_usuario, rol FROM USUARIOS WHERE id_usuario = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const objetivo = rows[0];
    if (objetivo.rol === 'superadministrador') {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta cuenta' });
    }
    const esUnoMismo = objetivo.id_usuario === req.usuario.id_usuario;
    if (objetivo.rol === 'administrador' && !esUnoMismo && req.usuario.rol !== 'superadministrador') {
      return res.status(403).json({ error: 'Solo el superadministrador puede modificar a otro administrador' });
    }
    req.objetivo = objetivo;
    next();
  } catch (error) {
    manejarError(res, error);
  }
}

// Ejecuta una sola sentencia de escritura marcando quién la hace (auditoría)
const escribirComoActor = (req, sql, parametros) => conActor(req, (conexion) => conexion.query(sql, parametros));

router.put('/:id', cargarObjetivo, async (req, res) => {
  try {
    const { rol } = req.body;
    if (!['administrador', 'operador'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (req.objetivo.id_usuario === req.usuario.id_usuario) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }
    await escribirComoActor(req, 'UPDATE USUARIOS SET rol = ? WHERE id_usuario = ?', [rol, req.params.id]);
    res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

router.put('/:id/password', cargarObjetivo, async (req, res) => {
  try {
    const { contrasena } = req.body;
    if (!esContrasenaSegura(contrasena)) {
      return res.status(400).json({ error: MENSAJE_CONTRASENA_SEGURA });
    }
    const hash = await bcrypt.hash(contrasena, 10);
    await escribirComoActor(req, 'UPDATE USUARIOS SET contrasena = ? WHERE id_usuario = ?', [hash, req.params.id]);
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

// Desactivar: bloquea el login sin borrar nada del historial
router.put('/:id/desactivar', cargarObjetivo, async (req, res) => {
  try {
    if (req.objetivo.id_usuario === req.usuario.id_usuario) {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
    }

    if (req.objetivo.rol === 'administrador') {
      const [conteo] = await pool.query(
        "SELECT COUNT(*) AS total FROM USUARIOS WHERE rol = 'administrador' AND activo = 1"
      );
      if (conteo[0].total <= 1) {
        return res.status(400).json({
          error: 'No puedes desactivar al único administrador activo. Crea o reactiva otro administrador primero.'
        });
      }
    }

    await escribirComoActor(req, 'UPDATE USUARIOS SET activo = 0 WHERE id_usuario = ?', [req.params.id]);
    res.json({ mensaje: 'Usuario desactivado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

// Reactivar: le devuelve el acceso a una cuenta desactivada
router.put('/:id/reactivar', cargarObjetivo, async (req, res) => {
  try {
    await escribirComoActor(req, 'UPDATE USUARIOS SET activo = 1 WHERE id_usuario = ?', [req.params.id]);
    res.json({ mensaje: 'Usuario reactivado correctamente' });
  } catch (error) {
    manejarError(res, error);
  }
});

module.exports = router;