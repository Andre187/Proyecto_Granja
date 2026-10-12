-- 08 - Reinicio de datos operativos (dejar el sistema "en cero").
--
-- *** DESTRUCTIVO E IRREVERSIBLE: borra TODOS los registros operativos. ***
-- Solo se borran los DATOS (filas). Las tablas, los triggers y la base de datos se conservan.
--
-- Borra: galeras, lotes, postura, mortalidad, sanidad, tareas, ventas, abonos, clientes,
--        gastos, inventario (concentrado y medicamentos), personal, pagos y la bitácora de usuarios.
-- Conserva: la tabla USUARIOS (las cuentas se manejan aparte), el catálogo de tamaños de huevo
--           (CLASIFICACIONES_HUEVO) y los niveles mínimos de existencia de huevos.
--
-- Ejecutar como root, en la base correcta:
--   mysql -u root -p granja_san_fernando < 08_reinicio_datos_operativos.sql

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE abonos;
TRUNCATE TABLE detalle_venta;
TRUNCATE TABLE ventas;
TRUNCATE TABLE clientes;
TRUNCATE TABLE concentrado_consumo;
TRUNCATE TABLE concentrado;
TRUNCATE TABLE concentrado_stock;
TRUNCATE TABLE gastos;
TRUNCATE TABLE huevos_clasificados;
TRUNCATE TABLE movimientos_medicamento;
TRUNCATE TABLE medicamentos;
TRUNCATE TABLE mortalidad;
TRUNCATE TABLE postura_diaria;
TRUNCATE TABLE seguimiento_peso;
TRUNCATE TABLE vacunacion;
TRUNCATE TABLE lotes;
TRUNCATE TABLE galeras;
TRUNCATE TABLE tareas;
TRUNCATE TABLE pagos_semanales;
TRUNCATE TABLE trabajadores;

-- Las cuentas que queden no apuntan a trabajadores que ya no existen
UPDATE usuarios SET id_trabajador = NULL;

-- Existencia de huevos en cero (se conservan las filas y los niveles mínimos)
UPDATE huevos_stock SET existencia_actual = 0;

-- Va al final: el UPDATE de usuarios dispara un trigger de auditoría que escribe en esta tabla
TRUNCATE TABLE auditoria_usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- Si aplicaste la migración 02, vacía también su bitácora:
-- TRUNCATE TABLE auditoria_general;
