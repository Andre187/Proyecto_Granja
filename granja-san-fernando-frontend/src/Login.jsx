import { useState } from 'react';
import axios from 'axios';
import './Login.css';

const API_URL = 'http://localhost:4000/api';

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
      const respuesta = await axios.post(`${API_URL}/auth/login`, {
        usuario,
        contrasena
      });

      // Guardamos el token y los datos del usuario para futuras peticiones
      localStorage.setItem('token', respuesta.data.token);
      localStorage.setItem('usuario', JSON.stringify(respuesta.data.usuario));

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
      <div className="login-card">

        <div className="login-visual">
          <div className="login-visual-circle">
            <svg viewBox="0 0 120 120" className="login-icon" xmlns="http://www.w3.org/2000/svg">
              {/* Silueta simple de gallina, estilo línea */}
              <path d="M40 75 Q30 60 40 48 Q45 38 58 36 Q62 28 72 30 Q76 24 84 28 Q80 34 82 38 Q92 40 92 52 Q98 54 96 62 L88 62 Q90 74 82 80 L82 90 L76 90 L76 82 Q68 86 58 84 L54 92 L48 92 L50 82 Q40 78 40 75 Z"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx="78" cy="42" r="2.2" fill="currentColor" />
            </svg>
          </div>
          <span className="dot dot-a"></span>
          <span className="dot dot-b"></span>
          <span className="triangle"></span>
        </div>

        <div className="login-form-side">
          <h1 className="login-title">Granja San Fernando</h1>
          <p className="login-subtitle">Sistema de Gestión</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <span className="input-icon">👤</span>
              <input
                type="text"
                placeholder="Usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                placeholder="Contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-button" disabled={cargando}>
              {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default Login;