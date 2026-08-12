import { useState } from 'react';
import axios from 'axios';
import './Login.css';
import logo from './assets/logo.png';
import fondoLogin from './assets/fondo_login.png';

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
    <div className="login-wrapper" style={{ backgroundImage: `url(${fondoLogin})` }}>
      <div className="login-card" style={{ position: 'relative', zIndex: 1 }}>

         <div className="login-visual-circle">
          <img src={logo} alt="Granja San Fernando" className="login-logo" />
        </div>
          <span className="dot dot-a"></span>
          <span className="dot dot-b"></span>
          <span className="triangle"></span>

        <div className="login-form-side">
          <h1 className="login-title">Granja San Fernando</h1>
          <p className="login-subtitle">Sistema de Gestión</p>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group">
              <span className="input-icon">👤</span>
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
              <span className="input-icon">🔒</span>
              <input
                type="password"
                placeholder="Contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="new-password"
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