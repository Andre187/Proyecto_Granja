# Pruebas automáticas del backend

Jest + Supertest. Llaman a la API en memoria (sin abrir un puerto) contra una **base de datos de pruebas real**
(MySQL), porque lo más importante del sistema vive en la base: triggers de existencias, restricciones y bloqueos.

> **Las pruebas BORRAN los datos de la base que usen.** Por seguridad se niegan a correr si `DB_NAME` no
> termina en `_test`. Nunca las apuntes a la base de desarrollo ni a la de producción.

## Preparar la base de pruebas (una sola vez)

1. Crea la base y un usuario propio (como root): `sql/setup_bd_pruebas.sql` (cambia la contraseña).
2. Carga el esquema y las migraciones, en este orden, sobre `granja_test`:
   `sql/00_esquema_base.sql`, `sql/02_...`, `sql/03_...`, `sql/05_...`, `sql/06_...`
   (la 04, de privilegios, es solo para producción).
   Si MySQL rechaza crear triggers por el registro binario, ejecuta antes (solo en tu equipo local):
   `SET GLOBAL log_bin_trust_function_creators = 1;`
3. Copia `.env.test.example` a `.env.test` y pon las credenciales de la base de pruebas.

## Ejecutar

```bash
npm test                       # todo
npx jest --runInBand tests/ventas.test.js
npx jest --runInBand -t "10 ventas simultáneas"
```

Se ejecutan en serie (`--runInBand`) porque comparten la misma base.

## Qué cubre cada archivo

| Archivo | Cubre |
|---|---|
| `auth.test.js` | Login, límite de intentos, JWT (expirado, firma falsa, `alg=none`, rol falso), renovación, cabeceras y CORS |
| `permisos.test.js` | Operador / administrador / superadministrador en cada endpoint, IDOR de tareas |
| `ventas.test.js` | Flujo huevo → existencia → venta, anulación, abonos, concurrencia (sobreventa y doble anulación), resumen |
| `reportes.test.js` | Reportes sin ventas ni gastos anulados, cuadre con la base, filtros de fecha |
| `validacion.test.js` | Casos límite por formulario: vacíos, negativos, decimales, enormes, tipos, fechas, texto largo, ñ/emoji |
| `produccion.test.js` | Galeras, lotes, postura, mortalidad, sanidad |
| `usuarios.test.js` | Altas, contraseñas (límite de 72 bytes), personal, pagos |
| `migraciones.test.js` | Auditoría con autor, existencias no negativas, triggers de renglones, tasa de postura. Se omiten con aviso si la migración no está aplicada |

`helpers.js` deja la base en un estado conocido antes de cada archivo (`reiniciar()`), crea los usuarios de
prueba (`admin_qa`, `admin2_qa`, `op1`, `op2`, `super_qa`, contraseña `Abcdefg1`) y devuelve sus tokens.
