-- 06 - La tasa de postura ya no está limitada a 999.99 %.
-- La API dejó de exigir que los huevos del día no superen a las aves activas del lote, así que la
-- tasa (huevos / aves * 100) puede pasar de 100 %. Con DECIMAL(5,2) una tasa superior a 999.99
-- provocaría un error al guardar; se amplía a DECIMAL(9,2) con la misma fórmula.
-- Aplicar UNA sola vez.

ALTER TABLE POSTURA_DIARIA
  MODIFY COLUMN tasa_postura DECIMAL(9,2)
  GENERATED ALWAYS AS (
    CASE WHEN aves_activas_dia > 0 THEN (cantidad_huevos / aves_activas_dia) * 100 ELSE 0 END
  ) STORED;
