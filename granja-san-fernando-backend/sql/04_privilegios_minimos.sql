-- 04 - Mínimo privilegio para el usuario de la aplicación (granja_app).
-- Hoy tiene ALL PRIVILEGES sobre todo el esquema (podría borrar tablas o alterar triggers).
-- La API solo necesita leer, insertar y actualizar: nunca borra filas (las cuentas se desactivan
-- y las ventas y gastos se anulan) ni cambia la estructura.
--
-- Ejecutar como root, en la base correcta. Sustituye el host si tu usuario no es @'localhost'.
-- Prueba primero en una copia y luego en producción. Para volver atrás:
--   GRANT ALL PRIVILEGES ON granja_san_fernando.* TO 'granja_app'@'localhost';

REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'granja_app'@'localhost';

GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.ABONOS TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.CLASIFICACIONES_HUEVO TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.CLIENTES TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.CONCENTRADO TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.CONCENTRADO_CONSUMO TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.CONCENTRADO_STOCK TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.DETALLE_VENTA TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.GALERAS TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.GASTOS TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.HUEVOS_CLASIFICADOS TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.HUEVOS_STOCK TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.LOTES TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.MEDICAMENTOS TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.MORTALIDAD TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.MOVIMIENTOS_MEDICAMENTO TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.PAGOS_SEMANALES TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.POSTURA_DIARIA TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.SEGUIMIENTO_PESO TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.TAREAS TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.TRABAJADORES TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.USUARIOS TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.VACUNACION TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.VENTAS TO 'granja_app'@'localhost';

-- Las bitácoras son de solo agregar: la app puede escribir y leer, nunca modificar ni borrar
GRANT SELECT, INSERT ON granja_san_fernando.AUDITORIA_USUARIOS TO 'granja_app'@'localhost';
-- Si aplicaste la migración 02, agrega también:
-- GRANT SELECT, INSERT ON granja_san_fernando.AUDITORIA_GENERAL TO 'granja_app'@'localhost';

FLUSH PRIVILEGES;
