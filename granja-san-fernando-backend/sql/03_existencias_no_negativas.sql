-- 03 - Las existencias nunca pueden quedar negativas (última línea de defensa en la BD).
-- La API ya evita la sobreventa bloqueando las filas de existencia. Estas restricciones
-- garantizan lo mismo incluso ante SQL directo o un error futuro en el código.
--
-- ANTES de aplicar, comprueba que no haya datos ya negativos (deben dar 0 filas):
--   SELECT * FROM HUEVOS_STOCK WHERE existencia_actual < 0;
--   SELECT * FROM CONCENTRADO_STOCK WHERE existencia_actual < 0;
--   SELECT * FROM MEDICAMENTOS WHERE existencia_actual < 0;

ALTER TABLE HUEVOS_STOCK
  ADD CONSTRAINT chk_huevos_stock_no_negativo CHECK (existencia_actual >= 0);

ALTER TABLE CONCENTRADO_STOCK
  ADD CONSTRAINT chk_concentrado_stock_no_negativo CHECK (existencia_actual >= 0);

ALTER TABLE MEDICAMENTOS
  ADD CONSTRAINT chk_medicamento_no_negativo CHECK (existencia_actual >= 0);
