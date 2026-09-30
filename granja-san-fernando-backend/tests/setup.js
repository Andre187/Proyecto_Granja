// Se ejecuta antes de cada archivo de pruebas.
// Carga la configuración de la BD de PRUEBAS y se niega a continuar si apunta a otra base:
// estas pruebas borran datos, y jamás deben correr contra la base de desarrollo o producción.
const path = require('path');
const dotenv = require('dotenv');

// Evita el mensaje informativo que dotenv imprime cada vez que la app carga su configuración
process.env.DOTENV_CONFIG_QUIET = 'true';

// override: las variables de .env.test mandan sobre cualquier variable ya definida en el entorno
dotenv.config({ path: path.join(__dirname, '..', '.env.test'), override: true, quiet: true });

if (!process.env.DB_NAME || !/_test$/.test(process.env.DB_NAME)) {
  throw new Error(
    `Las pruebas solo pueden correr contra una base cuyo nombre termine en "_test" (DB_NAME actual: "${process.env.DB_NAME}"). ` +
    'Crea el archivo .env.test a partir de .env.test.example.'
  );
}
if (!process.env.JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en .env.test');
}
