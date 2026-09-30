-- 05 - Corregir o borrar un renglón de venta (DETALLE_VENTA) ahora también ajusta la existencia.
-- Antes, los triggers de UPDATE y DELETE solo recalculaban el total de la venta y dejaban la
-- existencia de huevos descuadrada. La API no edita ni borra renglones (las ventas se anulan),
-- pero un cambio manual en SQL sí podía descuadrar el inventario.
--
-- Si la venta ya está anulada su existencia ya fue devuelta al anularla, así que no se toca de nuevo.
-- Aplicar UNA sola vez.

DELIMITER $$

DROP TRIGGER IF EXISTS trg_detalle_venta_update$$
CREATE TRIGGER trg_detalle_venta_update AFTER UPDATE ON DETALLE_VENTA FOR EACH ROW
BEGIN
    DECLARE estado_venta VARCHAR(20);

    UPDATE VENTAS
    SET monto_total = (
        SELECT COALESCE(SUM(subtotal), 0) FROM DETALLE_VENTA WHERE id_venta = NEW.id_venta
    )
    WHERE id_venta = NEW.id_venta;

    UPDATE VENTAS
    SET saldo_pendiente = monto_total - (
        SELECT COALESCE(SUM(monto), 0) FROM ABONOS WHERE id_venta = NEW.id_venta
    )
    WHERE id_venta = NEW.id_venta AND estado <> 'anulado';

    SELECT estado INTO estado_venta FROM VENTAS WHERE id_venta = NEW.id_venta;
    IF estado_venta <> 'anulado'
       AND (OLD.cantidad <> NEW.cantidad OR OLD.id_clasificacion <> NEW.id_clasificacion) THEN
        UPDATE HUEVOS_STOCK SET existencia_actual = existencia_actual + OLD.cantidad
        WHERE id_clasificacion = OLD.id_clasificacion;
        UPDATE HUEVOS_STOCK SET existencia_actual = existencia_actual - NEW.cantidad
        WHERE id_clasificacion = NEW.id_clasificacion;
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_detalle_venta_delete$$
CREATE TRIGGER trg_detalle_venta_delete AFTER DELETE ON DETALLE_VENTA FOR EACH ROW
BEGIN
    DECLARE estado_venta VARCHAR(20);

    UPDATE VENTAS
    SET monto_total = (
        SELECT COALESCE(SUM(subtotal), 0) FROM DETALLE_VENTA WHERE id_venta = OLD.id_venta
    )
    WHERE id_venta = OLD.id_venta;

    UPDATE VENTAS
    SET saldo_pendiente = monto_total - (
        SELECT COALESCE(SUM(monto), 0) FROM ABONOS WHERE id_venta = OLD.id_venta
    )
    WHERE id_venta = OLD.id_venta AND estado <> 'anulado';

    SELECT estado INTO estado_venta FROM VENTAS WHERE id_venta = OLD.id_venta;
    IF estado_venta <> 'anulado' THEN
        UPDATE HUEVOS_STOCK SET existencia_actual = existencia_actual + OLD.cantidad
        WHERE id_clasificacion = OLD.id_clasificacion;
    END IF;
END$$

DELIMITER ;
