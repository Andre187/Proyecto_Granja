const { body, query } = require('express-validator');

const FECHA_MINIMA = '2000-01-01';

// Fecha de hoy en la zona horaria del proceso (server.js la fija en America/Guatemala)
function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

// Fecha estricta AAAA-MM-DD: rechaza 2026-02-30, textos con hora, arreglos y fechas absurdas.
// Por defecto no admite fechas futuras (es un registro de algo que ya ocurrió).
function reglaFecha(cadena, { futura = false, mensaje = 'Fecha inválida' } = {}) {
  return cadena
    .isString().withMessage(mensaje).bail()
    .isDate({ format: 'YYYY-MM-DD', strictMode: true, delimiters: ['-'] }).withMessage(mensaje).bail()
    .custom((valor) => {
      if (valor < FECHA_MINIMA) throw new Error(mensaje);
      if (!futura && valor > hoyLocal()) throw new Error('La fecha no puede ser futura');
      return true;
    });
}

const fecha = (campo, opciones = {}) => reglaFecha(body(campo), opciones);
const fechaOpcional = (campo, opciones = {}) => reglaFecha(body(campo).optional({ checkFalsy: true }), opciones);
const fechaQuery = (campo) => reglaFecha(query(campo).optional(), { futura: true });

// Dinero o cantidades con máximo 2 decimales, dentro de un rango (evita redondeos silenciosos)
function decimal2(cadena, { min, max, mensaje }) {
  return cadena
    .isFloat({ min, max }).withMessage(mensaje).bail()
    .custom((valor) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(valor))) throw new Error('Usa como máximo 2 decimales');
      return true;
    });
}

// Texto: obligatorio o no, siempre cadena (nunca objeto/arreglo), sin espacios sobrantes y con largo máximo
function texto(campo, { min = 1, max, requerido = true, nombre }) {
  let cadena = body(campo);
  if (!requerido) cadena = cadena.optional({ checkFalsy: true });
  return cadena
    .isString().withMessage(`${nombre} inválido`).bail()
    .trim()
    .isLength({ min: requerido ? min : 0, max }).withMessage(
      requerido && min > 0 ? `${nombre} debe tener entre ${min} y ${max} caracteres` : `${nombre} no puede superar ${max} caracteres`
    );
}

// Los :id de la URL deben ser enteros positivos
function validarParametroId(router) {
  router.param('id', (req, res, next, valor) => {
    if (!/^\d{1,10}$/.test(valor) || Number(valor) < 1) {
      return res.status(400).json({ error: 'Identificador inválido' });
    }
    next();
  });
}

module.exports = { hoyLocal, fecha, fechaOpcional, fechaQuery, decimal2, texto, validarParametroId };
