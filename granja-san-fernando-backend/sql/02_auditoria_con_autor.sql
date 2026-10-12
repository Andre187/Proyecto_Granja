-- 02 - Auditoría con autor y detalle.
-- Aplicar UNA sola vez sobre la base existente (con un usuario con privilegio para crear triggers).
-- La API ya marca quién hace cada cambio (variable de sesión @actor_id); estos triggers la registran.
-- Antes de aplicar esta migración la API funciona igual, solo que sin registrar el autor.

ALTER TABLE auditoria_usuarios
  ADD COLUMN id_actor INT NULL,
  ADD COLUMN detalle VARCHAR(100) NULL;

-- Registro general de acciones sensibles (anulación de ventas y gastos)
CREATE TABLE IF NOT EXISTS auditoria_general (
  id_auditoria INT NOT NULL AUTO_INCREMENT,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_actor INT NULL,
  tabla VARCHAR(30) NOT NULL,
  id_registro INT NOT NULL,
  accion VARCHAR(30) NOT NULL,
  detalle VARCHAR(255) NULL,
  PRIMARY KEY (id_auditoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_auditoria_usuarios_insert$$
CREATE TRIGGER trg_auditoria_usuarios_insert AFTER INSERT ON usuarios FOR EACH ROW
BEGIN
    INSERT INTO auditoria_usuarios (id_usuario, accion, usuario_afectado, rol_anterior, rol_nuevo, id_actor, detalle)
    VALUES (NEW.id_usuario, 'INSERT', NEW.usuario, NULL, NEW.rol, @actor_id, 'cuenta creada');
END$$

DROP TRIGGER IF EXISTS trg_auditoria_usuarios_update$$
CREATE TRIGGER trg_auditoria_usuarios_update AFTER UPDATE ON usuarios FOR EACH ROW
BEGIN
    DECLARE cambios VARCHAR(100);
    SET cambios = CONCAT_WS(', ',
        IF(OLD.rol <> NEW.rol, 'rol', NULL),
        IF(OLD.contrasena <> NEW.contrasena, 'contraseña', NULL),
        IF(OLD.activo <> NEW.activo, IF(NEW.activo = 1, 'reactivada', 'desactivada'), NULL),
        IF(NOT (OLD.id_trabajador <=> NEW.id_trabajador), 'trabajador vinculado', NULL));
    IF cambios IS NOT NULL AND cambios <> '' THEN
        INSERT INTO auditoria_usuarios (id_usuario, accion, usuario_afectado, rol_anterior, rol_nuevo, id_actor, detalle)
        VALUES (NEW.id_usuario, 'UPDATE', NEW.usuario, OLD.rol, NEW.rol, @actor_id, cambios);
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_auditoria_usuarios_delete$$
CREATE TRIGGER trg_auditoria_usuarios_delete AFTER DELETE ON usuarios FOR EACH ROW
BEGIN
    INSERT INTO auditoria_usuarios (id_usuario, accion, usuario_afectado, rol_anterior, rol_nuevo, id_actor, detalle)
    VALUES (OLD.id_usuario, 'DELETE', OLD.usuario, OLD.rol, NULL, @actor_id, 'cuenta eliminada');
END$$

DROP TRIGGER IF EXISTS trg_ventas_auditar_anulacion$$
CREATE TRIGGER trg_ventas_auditar_anulacion AFTER UPDATE ON ventas FOR EACH ROW
BEGIN
    IF OLD.estado <> 'anulado' AND NEW.estado = 'anulado' THEN
        INSERT INTO auditoria_general (id_actor, tabla, id_registro, accion, detalle)
        VALUES (@actor_id, 'ventas', NEW.id_venta, 'ANULAR', NEW.motivo_anulacion);
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_gastos_auditar_anulacion$$
CREATE TRIGGER trg_gastos_auditar_anulacion AFTER UPDATE ON gastos FOR EACH ROW
BEGIN
    IF OLD.estado <> 'anulado' AND NEW.estado = 'anulado' THEN
        INSERT INTO auditoria_general (id_actor, tabla, id_registro, accion, detalle)
        VALUES (@actor_id, 'gastos', NEW.id_gasto, 'ANULAR', NEW.descripcion);
    END IF;
END$$

DELIMITER ;
