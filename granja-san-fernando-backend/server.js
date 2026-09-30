// Punto de arranque: la aplicación Express vive en app.js para poder probarla sin abrir un puerto
const app = require('./app');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
