-- 00 - Esquema base (24 tablas, triggers y catálogo de tamaños de huevo).
-- SOLO para crear una base de datos NUEVA y VACÍA (desarrollo o pruebas).
-- NO lo ejecutes sobre una base con datos. Las migraciones 02 en adelante se aplican después.
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `abonos` (
  `id_abono` int NOT NULL AUTO_INCREMENT,
  `id_venta` int NOT NULL,
  `fecha` date NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id_abono`),
  KEY `fk_abono_venta` (`id_venta`),
  CONSTRAINT `fk_abono_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `auditoria_usuarios` (
  `id_auditoria` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `accion` varchar(20) DEFAULT NULL,
  `usuario_afectado` varchar(50) DEFAULT NULL,
  `rol_anterior` varchar(20) DEFAULT NULL,
  `rol_nuevo` varchar(20) DEFAULT NULL,
  `fecha_hora` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `clasificaciones_huevo` (
  `id_clasificacion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  PRIMARY KEY (`id_clasificacion`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `concentrado` (
  `id_concentrado` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `tipo_concentrado` varchar(50) NOT NULL,
  `cantidad_qq` decimal(10,2) NOT NULL,
  `costo_unitario` decimal(10,2) NOT NULL,
  `total` decimal(12,2) GENERATED ALWAYS AS ((`cantidad_qq` * `costo_unitario`)) STORED,
  PRIMARY KEY (`id_concentrado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `concentrado_consumo` (
  `id_consumo` int NOT NULL AUTO_INCREMENT,
  `id_stock` int NOT NULL,
  `fecha` date NOT NULL,
  `cantidad_qq` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_consumo`),
  KEY `fk_consumo_stock` (`id_stock`),
  CONSTRAINT `fk_consumo_stock` FOREIGN KEY (`id_stock`) REFERENCES `concentrado_stock` (`id_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `concentrado_stock` (
  `id_stock` int NOT NULL AUTO_INCREMENT,
  `tipo_concentrado` varchar(50) NOT NULL,
  `existencia_actual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `nivel_minimo` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_stock`),
  UNIQUE KEY `tipo_concentrado` (`tipo_concentrado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `detalle_venta` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_venta` int NOT NULL,
  `id_clasificacion` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS ((`cantidad` * `precio_unitario`)) STORED,
  PRIMARY KEY (`id_detalle`),
  KEY `fk_detalle_venta` (`id_venta`),
  KEY `fk_detalle_clasificacion` (`id_clasificacion`),
  CONSTRAINT `fk_detalle_clasificacion` FOREIGN KEY (`id_clasificacion`) REFERENCES `clasificaciones_huevo` (`id_clasificacion`),
  CONSTRAINT `fk_detalle_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `galeras` (
  `id_galera` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `ubicacion` varchar(150) DEFAULT NULL,
  `capacidad` int NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'disponible',
  PRIMARY KEY (`id_galera`),
  UNIQUE KEY `uq_galera_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `gastos` (
  `id_gasto` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  `categoria` varchar(30) NOT NULL DEFAULT 'otros',
  `monto` decimal(12,2) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`id_gasto`),
  CONSTRAINT `chk_gasto_categoria` CHECK ((`categoria` in (_utf8mb4'mantenimiento',_utf8mb4'transporte',_utf8mb4'servicios',_utf8mb4'insumos',_utf8mb4'otros')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `huevos_clasificados` (
  `id_registro` int NOT NULL AUTO_INCREMENT,
  `id_clasificacion` int NOT NULL,
  `fecha` date NOT NULL,
  `cantidad` int NOT NULL,
  PRIMARY KEY (`id_registro`),
  KEY `fk_huevos_clasificados_clasificacion` (`id_clasificacion`),
  CONSTRAINT `fk_huevos_clasificados_clasificacion` FOREIGN KEY (`id_clasificacion`) REFERENCES `clasificaciones_huevo` (`id_clasificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `huevos_stock` (
  `id_stock` int NOT NULL AUTO_INCREMENT,
  `id_clasificacion` int NOT NULL,
  `existencia_actual` int NOT NULL DEFAULT '0',
  `nivel_minimo` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_stock`),
  UNIQUE KEY `id_clasificacion` (`id_clasificacion`),
  CONSTRAINT `fk_huevos_stock_clasificacion` FOREIGN KEY (`id_clasificacion`) REFERENCES `clasificaciones_huevo` (`id_clasificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `lotes` (
  `id_lote` int NOT NULL AUTO_INCREMENT,
  `id_galera` int NOT NULL,
  `fecha_ingreso` date NOT NULL,
  `aves_recibidas` int NOT NULL,
  `aves_activas` int NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`id_lote`),
  KEY `fk_lote_galera` (`id_galera`),
  CONSTRAINT `fk_lote_galera` FOREIGN KEY (`id_galera`) REFERENCES `galeras` (`id_galera`),
  CONSTRAINT `chk_lote_estado` CHECK ((`estado` in (_utf8mb4'activo',_utf8mb4'finalizado')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `medicamentos` (
  `id_medicamento` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `existencia_actual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `nivel_minimo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unidad_medida` varchar(20) NOT NULL,
  PRIMARY KEY (`id_medicamento`),
  UNIQUE KEY `uq_medicamento_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `mortalidad` (
  `id_mortalidad` int NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha` date NOT NULL,
  `cantidad` int NOT NULL,
  `causa` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id_mortalidad`),
  KEY `fk_mortalidad_lote` (`id_lote`),
  CONSTRAINT `fk_mortalidad_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `movimientos_medicamento` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_medicamento` int NOT NULL,
  `fecha` date NOT NULL,
  `tipo_movimiento` varchar(10) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_movimiento_medicamento` (`id_medicamento`),
  CONSTRAINT `fk_movimiento_medicamento` FOREIGN KEY (`id_medicamento`) REFERENCES `medicamentos` (`id_medicamento`),
  CONSTRAINT `chk_tipo_movimiento` CHECK ((`tipo_movimiento` in (_utf8mb4'entrada',_utf8mb4'salida')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `pagos_semanales` (
  `id_pago` int NOT NULL AUTO_INCREMENT,
  `id_trabajador` int NOT NULL,
  `semana_inicio` date NOT NULL,
  `semana_fin` date NOT NULL,
  `dias_laborados` int NOT NULL,
  `horas_extra` int NOT NULL DEFAULT '0',
  `costo_dia_registrado` decimal(10,2) NOT NULL,
  `costo_hora_extra` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_pagar` decimal(12,2) GENERATED ALWAYS AS (((`dias_laborados` * `costo_dia_registrado`) + (`horas_extra` * `costo_hora_extra`))) STORED,
  PRIMARY KEY (`id_pago`),
  KEY `fk_pago_trabajador` (`id_trabajador`),
  CONSTRAINT `fk_pago_trabajador` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `postura_diaria` (
  `id_postura` int NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha` date NOT NULL,
  `cantidad_huevos` int NOT NULL,
  `aves_activas_dia` int NOT NULL,
  `tasa_postura` decimal(5,2) GENERATED ALWAYS AS ((case when (`aves_activas_dia` > 0) then ((`cantidad_huevos` / `aves_activas_dia`) * 100) else 0 end)) STORED,
  PRIMARY KEY (`id_postura`),
  KEY `fk_postura_lote` (`id_lote`),
  CONSTRAINT `fk_postura_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `seguimiento_peso` (
  `id_seguimiento` int NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha` date NOT NULL,
  `semana` int NOT NULL,
  `peso_promedio` decimal(8,2) NOT NULL,
  `uniformidad` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id_seguimiento`),
  KEY `fk_seguimiento_lote` (`id_lote`),
  CONSTRAINT `fk_seguimiento_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `tareas` (
  `id_tarea` int NOT NULL AUTO_INCREMENT,
  `id_trabajador` int NOT NULL,
  `id_galera` int DEFAULT NULL,
  `descripcion` varchar(255) NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `fecha_limite` date DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  PRIMARY KEY (`id_tarea`),
  KEY `fk_tarea_trabajador` (`id_trabajador`),
  KEY `fk_tarea_galera` (`id_galera`),
  CONSTRAINT `fk_tarea_galera` FOREIGN KEY (`id_galera`) REFERENCES `galeras` (`id_galera`) ON DELETE SET NULL,
  CONSTRAINT `fk_tarea_trabajador` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`),
  CONSTRAINT `chk_tarea_estado` CHECK ((`estado` in (_utf8mb4'pendiente',_utf8mb4'en proceso',_utf8mb4'finalizado')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `trabajadores` (
  `id_trabajador` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `costo_dia` decimal(10,2) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`id_trabajador`),
  CONSTRAINT `chk_trabajador_estado` CHECK ((`estado` in (_utf8mb4'activo',_utf8mb4'inactivo')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `usuario` varchar(50) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `apellido` varchar(50) DEFAULT NULL,
  `contrasena` varchar(255) NOT NULL,
  `rol` varchar(20) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_trabajador` int DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `usuario` (`usuario`),
  UNIQUE KEY `uq_usuario_trabajador` (`id_trabajador`),
  CONSTRAINT `fk_usuario_trabajador` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`) ON DELETE SET NULL,
  CONSTRAINT `chk_usuario_rol` CHECK ((`rol` in (_utf8mb4'administrador',_utf8mb4'operador',_utf8mb4'superadministrador')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `vacunacion` (
  `id_vacunacion` int NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha` date NOT NULL,
  `tipo_vacuna` varchar(100) NOT NULL,
  `semana_aplicacion` int NOT NULL,
  PRIMARY KEY (`id_vacunacion`),
  KEY `fk_vacunacion_lote` (`id_lote`),
  CONSTRAINT `fk_vacunacion_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ventas` (
  `id_venta` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `fecha` date NOT NULL,
  `monto_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `saldo_pendiente` decimal(12,2) NOT NULL DEFAULT '0.00',
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `motivo_anulacion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_venta`),
  KEY `fk_venta_cliente` (`id_cliente`),
  CONSTRAINT `fk_venta_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `chk_venta_estado` CHECK ((`estado` in (_utf8mb4'pendiente',_utf8mb4'cancelado',_utf8mb4'anulado')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;

DELIMITER $$
DROP TRIGGER IF EXISTS `trg_abonos_validar`$$
CREATE TRIGGER `trg_abonos_validar` BEFORE INSERT ON `abonos` FOR EACH ROW BEGIN
    DECLARE saldo DECIMAL(12,2);
    SELECT saldo_pendiente INTO saldo FROM VENTAS WHERE id_venta = NEW.id_venta;

    IF NEW.monto > saldo THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: el abono supera el saldo pendiente de la venta';
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_abonos_actualizar`$$
CREATE TRIGGER `trg_abonos_actualizar` AFTER INSERT ON `abonos` FOR EACH ROW BEGIN
    UPDATE VENTAS
    SET saldo_pendiente = monto_total - (
        SELECT COALESCE(SUM(monto), 0) FROM ABONOS WHERE id_venta = NEW.id_venta
    )
    WHERE id_venta = NEW.id_venta;

    -- Si el saldo llega a 0, marcamos la venta como cancelada (pagada)
    UPDATE VENTAS
    SET estado = 'cancelado'
    WHERE id_venta = NEW.id_venta AND saldo_pendiente <= 0;
END$$
DROP TRIGGER IF EXISTS `trg_concentrado_compra_actualiza_stock`$$
CREATE TRIGGER `trg_concentrado_compra_actualiza_stock` AFTER INSERT ON `concentrado` FOR EACH ROW BEGIN
    IF EXISTS (SELECT 1 FROM CONCENTRADO_STOCK WHERE tipo_concentrado = NEW.tipo_concentrado) THEN
        UPDATE CONCENTRADO_STOCK
        SET existencia_actual = existencia_actual + NEW.cantidad_qq
        WHERE tipo_concentrado = NEW.tipo_concentrado;
    ELSE
        INSERT INTO CONCENTRADO_STOCK (tipo_concentrado, existencia_actual, nivel_minimo)
        VALUES (NEW.tipo_concentrado, NEW.cantidad_qq, 0);
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_concentrado_consumo_validar`$$
CREATE TRIGGER `trg_concentrado_consumo_validar` BEFORE INSERT ON `concentrado_consumo` FOR EACH ROW BEGIN
    DECLARE existencia DECIMAL(10,2);
    SELECT existencia_actual INTO existencia FROM CONCENTRADO_STOCK WHERE id_stock = NEW.id_stock;

    IF NEW.cantidad_qq > existencia THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: el consumo registrado supera la existencia disponible';
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_concentrado_consumo_actualiza_stock`$$
CREATE TRIGGER `trg_concentrado_consumo_actualiza_stock` AFTER INSERT ON `concentrado_consumo` FOR EACH ROW BEGIN
    UPDATE CONCENTRADO_STOCK
    SET existencia_actual = existencia_actual - NEW.cantidad_qq
    WHERE id_stock = NEW.id_stock;
END$$
DROP TRIGGER IF EXISTS `trg_venta_valida_stock_huevo`$$
CREATE TRIGGER `trg_venta_valida_stock_huevo` BEFORE INSERT ON `detalle_venta` FOR EACH ROW BEGIN
    DECLARE existencia INT DEFAULT 0;
    SELECT existencia_actual INTO existencia
    FROM HUEVOS_STOCK WHERE id_clasificacion = NEW.id_clasificacion;

    IF NEW.cantidad > existencia THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: la cantidad vendida supera la existencia disponible de ese tamaño de huevo';
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_detalle_venta_insert`$$
CREATE TRIGGER `trg_detalle_venta_insert` AFTER INSERT ON `detalle_venta` FOR EACH ROW BEGIN
    UPDATE VENTAS
    SET monto_total = (
        SELECT COALESCE(SUM(subtotal), 0) FROM DETALLE_VENTA WHERE id_venta = NEW.id_venta
    )
    WHERE id_venta = NEW.id_venta;

    UPDATE VENTAS
    SET saldo_pendiente = monto_total - (
        SELECT COALESCE(SUM(monto), 0) FROM ABONOS WHERE id_venta = NEW.id_venta
    )
    WHERE id_venta = NEW.id_venta;
END$$
DROP TRIGGER IF EXISTS `trg_venta_descuenta_stock_huevo`$$
CREATE TRIGGER `trg_venta_descuenta_stock_huevo` AFTER INSERT ON `detalle_venta` FOR EACH ROW BEGIN
    UPDATE HUEVOS_STOCK
    SET existencia_actual = existencia_actual - NEW.cantidad
    WHERE id_clasificacion = NEW.id_clasificacion;
END$$
DROP TRIGGER IF EXISTS `trg_detalle_venta_update`$$
CREATE TRIGGER `trg_detalle_venta_update` AFTER UPDATE ON `detalle_venta` FOR EACH ROW BEGIN
    UPDATE VENTAS
    SET monto_total = (
        SELECT COALESCE(SUM(subtotal), 0) FROM DETALLE_VENTA WHERE id_venta = NEW.id_venta
    )
    WHERE id_venta = NEW.id_venta;

    UPDATE VENTAS
    SET saldo_pendiente = monto_total - (
        SELECT COALESCE(SUM(monto), 0) FROM ABONOS WHERE id_venta = NEW.id_venta
    )
    WHERE id_venta = NEW.id_venta;
END$$
DROP TRIGGER IF EXISTS `trg_detalle_venta_delete`$$
CREATE TRIGGER `trg_detalle_venta_delete` AFTER DELETE ON `detalle_venta` FOR EACH ROW BEGIN
    UPDATE VENTAS
    SET monto_total = (
        SELECT COALESCE(SUM(subtotal), 0) FROM DETALLE_VENTA WHERE id_venta = OLD.id_venta
    )
    WHERE id_venta = OLD.id_venta;

    UPDATE VENTAS
    SET saldo_pendiente = monto_total - (
        SELECT COALESCE(SUM(monto), 0) FROM ABONOS WHERE id_venta = OLD.id_venta
    )
    WHERE id_venta = OLD.id_venta;
END$$
DROP TRIGGER IF EXISTS `trg_huevos_clasificados_actualiza_stock`$$
CREATE TRIGGER `trg_huevos_clasificados_actualiza_stock` AFTER INSERT ON `huevos_clasificados` FOR EACH ROW BEGIN
    IF EXISTS (SELECT 1 FROM HUEVOS_STOCK WHERE id_clasificacion = NEW.id_clasificacion) THEN
        UPDATE HUEVOS_STOCK
        SET existencia_actual = existencia_actual + NEW.cantidad
        WHERE id_clasificacion = NEW.id_clasificacion;
    ELSE
        INSERT INTO HUEVOS_STOCK (id_clasificacion, existencia_actual, nivel_minimo)
        VALUES (NEW.id_clasificacion, NEW.cantidad, 0);
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_lotes_validar_insert`$$
CREATE TRIGGER `trg_lotes_validar_insert` BEFORE INSERT ON `lotes` FOR EACH ROW BEGIN
    IF NEW.aves_activas > NEW.aves_recibidas THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: aves_activas no puede ser mayor a aves_recibidas';
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_lote_validar_unico_activo`$$
CREATE TRIGGER `trg_lote_validar_unico_activo` BEFORE INSERT ON `lotes` FOR EACH ROW BEGIN
    DECLARE existe_activo INT DEFAULT 0;

    IF NEW.estado = 'activo' THEN
        SELECT COUNT(*) INTO existe_activo
        FROM LOTES
        WHERE id_galera = NEW.id_galera AND estado = 'activo';

        IF existe_activo > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: esta galera ya tiene un lote activo. Finalízalo antes de crear uno nuevo.';
        END IF;
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_lotes_validar_update`$$
CREATE TRIGGER `trg_lotes_validar_update` BEFORE UPDATE ON `lotes` FOR EACH ROW BEGIN
    IF NEW.aves_activas > NEW.aves_recibidas THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: aves_activas no puede ser mayor a aves_recibidas';
    END IF;
    IF NEW.aves_activas < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: aves_activas no puede ser negativo';
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_mortalidad_validar`$$
CREATE TRIGGER `trg_mortalidad_validar` BEFORE INSERT ON `mortalidad` FOR EACH ROW BEGIN
    DECLARE activas_actual INT;
    SELECT aves_activas INTO activas_actual FROM LOTES WHERE id_lote = NEW.id_lote;

    IF NEW.cantidad > activas_actual THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: la mortalidad registrada supera las aves activas del lote';
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_mortalidad_actualizar_lote`$$
CREATE TRIGGER `trg_mortalidad_actualizar_lote` AFTER INSERT ON `mortalidad` FOR EACH ROW BEGIN
    UPDATE LOTES
    SET aves_activas = aves_activas - NEW.cantidad
    WHERE id_lote = NEW.id_lote;
END$$
DROP TRIGGER IF EXISTS `trg_movimiento_medicamento_validar`$$
CREATE TRIGGER `trg_movimiento_medicamento_validar` BEFORE INSERT ON `movimientos_medicamento` FOR EACH ROW BEGIN
    DECLARE existencia DECIMAL(10,2);
    SELECT existencia_actual INTO existencia FROM MEDICAMENTOS WHERE id_medicamento = NEW.id_medicamento;

    IF NEW.tipo_movimiento = 'salida' AND NEW.cantidad > existencia THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: la salida supera la existencia actual del medicamento';
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_movimiento_medicamento_actualizar`$$
CREATE TRIGGER `trg_movimiento_medicamento_actualizar` AFTER INSERT ON `movimientos_medicamento` FOR EACH ROW BEGIN
    IF NEW.tipo_movimiento = 'entrada' THEN
        UPDATE MEDICAMENTOS
        SET existencia_actual = existencia_actual + NEW.cantidad
        WHERE id_medicamento = NEW.id_medicamento;
    ELSE
        UPDATE MEDICAMENTOS
        SET existencia_actual = existencia_actual - NEW.cantidad
        WHERE id_medicamento = NEW.id_medicamento;
    END IF;
END$$
DROP TRIGGER IF EXISTS `trg_auditoria_usuarios_insert`$$
CREATE TRIGGER `trg_auditoria_usuarios_insert` AFTER INSERT ON `usuarios` FOR EACH ROW BEGIN
    INSERT INTO AUDITORIA_USUARIOS (id_usuario, accion, usuario_afectado, rol_anterior, rol_nuevo)
    VALUES (NEW.id_usuario, 'INSERT', NEW.usuario, NULL, NEW.rol);
END$$
DROP TRIGGER IF EXISTS `trg_auditoria_usuarios_update`$$
CREATE TRIGGER `trg_auditoria_usuarios_update` AFTER UPDATE ON `usuarios` FOR EACH ROW BEGIN
    INSERT INTO AUDITORIA_USUARIOS (id_usuario, accion, usuario_afectado, rol_anterior, rol_nuevo)
    VALUES (NEW.id_usuario, 'UPDATE', NEW.usuario, OLD.rol, NEW.rol);
END$$
DROP TRIGGER IF EXISTS `trg_auditoria_usuarios_delete`$$
CREATE TRIGGER `trg_auditoria_usuarios_delete` AFTER DELETE ON `usuarios` FOR EACH ROW BEGIN
    INSERT INTO AUDITORIA_USUARIOS (id_usuario, accion, usuario_afectado, rol_anterior, rol_nuevo)
    VALUES (OLD.id_usuario, 'DELETE', OLD.usuario, OLD.rol, NULL);
END$$
DELIMITER ;

INSERT INTO clasificaciones_huevo (id_clasificacion,nombre) VALUES (7,'extra');
INSERT INTO clasificaciones_huevo (id_clasificacion,nombre) VALUES (6,'grande');
INSERT INTO clasificaciones_huevo (id_clasificacion,nombre) VALUES (8,'jumbo');
INSERT INTO clasificaciones_huevo (id_clasificacion,nombre) VALUES (5,'mediano');
INSERT INTO clasificaciones_huevo (id_clasificacion,nombre) VALUES (4,'pequeño');
