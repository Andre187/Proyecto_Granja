import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// Antes de cada petición, si hay un token guardado, lo agrega automáticamente
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el servidor responde 401 (token ausente, inválido o expirado),
// cerramos la sesión localmente y regresamos al login, en vez de dejar
// que la pantalla se quede mostrando errores sin sentido.
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (error.response && error.response.status === 401) {
sessionStorage.removeItem('token');
      sessionStorage.removeItem('usuario');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;