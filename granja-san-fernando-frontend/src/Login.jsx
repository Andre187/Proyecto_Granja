import { useState } from 'react';
import api from './api/api';
import './Login.css';
import logo from './assets/logo.png';
import gallina from './assets/gallina_login.webp';

function Login({ onLoginSuccess }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const respuesta = await api.post('/auth/login', {
        usuario,
        contrasena
      });

      sessionStorage.setItem('token', respuesta.data.token);
      sessionStorage.setItem('usuario', JSON.stringify(respuesta.data.usuario));

      onLoginSuccess(respuesta.data.usuario);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-photo" style={{ backgroundImage: `url(${gallina})` }}></div>
      <div className="login-curve"></div>

      <div className="login-panel">
        <div className="login-form-side">
          <img src={logo} alt="Granja San Fernando" className="login-logo" />
          <h1 className="login-title">Granja San Fernando</h1>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              <input
                type="text"
                placeholder="Usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="input-group">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <input
                type="password"
                placeholder="Contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="login-button" disabled={cargando}>
              {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="login-modal-overlay" onClick={() => setError('')}>
          <div
            className="login-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="login-modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="login-modal-icon">!</div>
            <h2 id="login-modal-titulo">No se pudo iniciar sesión</h2>
            <p>{error}</p>
            <button type="button" className="login-button" autoFocus onClick={() => setError('')}>
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
