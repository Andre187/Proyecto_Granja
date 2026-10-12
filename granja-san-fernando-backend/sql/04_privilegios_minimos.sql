-- 04 - Mínimo privilegio para el usuario de la aplicación (granja_app).
-- Hoy tiene ALL PRIVILEGES sobre todo el esquema (podría borrar tablas o alterar triggers).
-- La API solo necesita leer, insertar y actualizar: nunca borra filas (las cuentas se desactivan
-- y las ventas y gastos se anulan) ni cambia la estructura.
--
-- Ejecutar como root, en la base correcta. Sustituye el host si tu usuario no es @'localhost'.
-- Prueba primero en una copia y luego en producción. Para volver atrás:
--   GRANT ALL PRIVILEGES ON granja_san_fernando.* TO 'granja_app'@'localhost';

REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'granja_app'@'localhost';

GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.abonos TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.clasificaciones_huevo TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.clientes TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.concentrado TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.concentrado_consumo TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.concentrado_stock TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.detalle_venta TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.galeras TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.gastos TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.huevos_clasificados TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.huevos_stock TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.lotes TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.medicamentos TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.mortalidad TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.movimientos_medicamento TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.pagos_semanales TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.postura_diaria TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.seguimiento_peso TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.tareas TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.trabajadores TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.usuarios TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.vacunacion TO 'granja_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON granja_san_fernando.ventas TO 'granja_app'@'localhost';

-- Las bitácoras son de solo agregar: la app puede escribir y leer, nunca modificar ni borrar
GRANT SELECT, INSERT ON granja_san_fernando.auditoria_usuarios TO 'granja_app'@'localhost';
-- Si aplicaste la migración 02, agrega también:
-- GRANT SELECT, INSERT ON granja_san_fernando.auditoria_general TO 'granja_app'@'localhost';

FLUSH PRIVILEGES;
