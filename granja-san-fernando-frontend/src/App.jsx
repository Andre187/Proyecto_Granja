import { useState } from 'react';
import Login from './Login';
import './App.css';

function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuarioActivo(null);
  };

  if (!usuarioActivo) {
    return <Login onLoginSuccess={(usuario) => setUsuarioActivo(usuario)} />;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Bienvenido, {usuarioActivo.usuario} 👋</h1>
      <p>Rol: {usuarioActivo.rol}</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
      <p style={{ marginTop: '20px', color: '#888' }}>
        Aquí construiremos el panel principal del sistema.
      </p>
    </div>
  );
}

export default App;