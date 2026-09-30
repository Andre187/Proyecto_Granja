-- Crea la base de datos de PRUEBAS y un usuario propio para las pruebas automáticas (tests/).
-- Ejecutar UNA vez como root en tu MySQL local. No toca la base real (granja_san_fernando).
-- Cambia la contraseña y usa la misma en .env.test.
CREATE DATABASE IF NOT EXISTS granja_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'granja_qa'@'localhost' IDENTIFIED BY 'CambiaEsto_QA_2026';
GRANT ALL PRIVILEGES ON granja_test.* TO 'granja_qa'@'localhost';
FLUSH PRIVILEGES;
