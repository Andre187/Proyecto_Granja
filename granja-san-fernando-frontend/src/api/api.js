import axios from 'axios';

// En despliegue se define VITE_API_URL (p. ej. en .env.production); en local se usa el backend de desarrollo
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
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
// El login se excluye: ahí un 401 significa credenciales incorrectas y el
// mensaje debe mostrarse en el formulario, no recargar la página.
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const esLogin = error.config && error.config.url === '/auth/login';
    if (error.response && error.response.status === 401 && !esLogin) {
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