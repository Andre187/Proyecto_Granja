-- 09 - El consumo de concentrado indica a qué galpón (lote) se le dio.
-- Cambio no destructivo: solo agrega una columna opcional; los consumos anteriores quedan sin galpón.
-- Aplicar UNA sola vez, ANTES de reiniciar el backend con esta versión:
--   mysql -u root -p granja_san_fernando < 09_consumo_concentrado_por_lote.sql

ALTER TABLE concentrado_consumo
  ADD COLUMN id_lote INT NULL,
  ADD CONSTRAINT fk_consumo_lote FOREIGN KEY (id_lote) REFERENCES lotes (id_lote);
