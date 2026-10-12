#!/usr/bin/env bash
# 07 - Corrige los triggers de una base YA existente en MySQL/Linux.
#
# Problema: en Linux MySQL distingue mayúsculas en nombres de tablas. Los triggers creados con
# nombres como LOTES, VENTAS o HUEVOS_STOCK fallan ("Table 'granja_san_fernando.LOTES' doesn't
# exist") porque las tablas reales están en minúscula, y la API responde
# "No se pudo completar la operación" al guardar lotes, clasificación de huevos, etc.
#
# Este script lee los triggers que existen hoy (con la versión de migración que tengas aplicada),
# cambia a minúscula SOLO los nombres de tablas y genera un archivo SQL para revisar y aplicar.
# No modifica nada por sí solo.
#
# Uso (en el servidor, con un usuario con privilegio TRIGGER, normalmente root):
#   bash 07_corregir_triggers_minusculas.sh granja_san_fernando
#   # revisa triggers_minusculas.sql y respalda la base antes de aplicarlo:
#   mysqldump -u root -p granja_san_fernando > respaldo_antes_triggers.sql
#   mysql -u root -p granja_san_fernando < triggers_minusculas.sql

set -euo pipefail

BD="${1:?Indica el nombre de la base de datos, por ejemplo: granja_san_fernando}"
SALIDA="triggers_minusculas.sql"

TABLAS="ABONOS|AUDITORIA_GENERAL|AUDITORIA_USUARIOS|CLASIFICACIONES_HUEVO|CLIENTES|CONCENTRADO_CONSUMO|CONCENTRADO_STOCK|CONCENTRADO|DETALLE_VENTA|GALERAS|GASTOS|HUEVOS_CLASIFICADOS|HUEVOS_STOCK|LOTES|MEDICAMENTOS|MORTALIDAD|MOVIMIENTOS_MEDICAMENTO|PAGOS_SEMANALES|POSTURA_DIARIA|SEGUIMIENTO_PESO|TAREAS|TRABAJADORES|USUARIOS|VACUNACION|VENTAS"

{
  echo "DELIMITER \$\$"
  mysql -u root -p -N -B --raw -e "
    SELECT CONCAT(
      'DROP TRIGGER IF EXISTS \`', TRIGGER_NAME, '\`\$\$\n',
      'CREATE TRIGGER \`', TRIGGER_NAME, '\` ', ACTION_TIMING, ' ', EVENT_MANIPULATION,
      ' ON \`', EVENT_OBJECT_TABLE, '\` FOR EACH ROW\n', ACTION_STATEMENT, '\$\$\n')
    FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA = '${BD}'
    ORDER BY TRIGGER_NAME" \
  | sed -E "s/\b(${TABLAS})\b/\L\1/g"
  echo "DELIMITER ;"
} > "$SALIDA"

echo "Generado: $SALIDA ($(grep -c 'CREATE TRIGGER' "$SALIDA") triggers). Revísalo antes de aplicarlo."
