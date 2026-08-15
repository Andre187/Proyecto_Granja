import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Layout from './components/Layout';
import Panel from './pages/Panel';
import Usuarios from './pages/Usuarios';
import Produccion from './pages/Produccion';
import Sanidad from './pages/Sanidad';
import Tareas from './pages/Tareas';
import Ventas from './pages/Ventas';
import Inventario from './pages/Inventario';
import Personal from './pages/Personal';
import Gastos from './pages/Gastos';
import Reportes from './pages/Reportes';
import SuperAdmin from './pages/SuperAdmin';
import api from './api/api';

const MINUTOS_INACTIVIDAD = 30;
const MINUTOS_RENOVACION = 15;

function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });
  const [avisoInactividad, setAvisoInactividad] = useState(false);

  const timerInactividad = useRef(null);
  const intervaloRenovacion = useRef(null);

  const handleLogout = (motivo) => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuarioActivo(null);
    if (motivo === 'inactividad') setAvisoInactividad(true);
    // Regresamos la URL a la raíz, para que el próximo usuario que inicie sesión
    // siempre empiece en el Panel general, sin importar en qué página se quedó el anterior.
    window.history.replaceState({}, '', '/');
  };

  // Cierre de sesión por inactividad: se reinicia el contador con cualquier actividad del usuario
  useEffect(() => {
    if (!usuarioActivo) return;

    const reiniciarTimer = () => {
      if (timerInactividad.current) clearTimeout(timerInactividad.current);
      timerInactividad.current = setTimeout(() => {
        handleLogout('inactividad');
      }, MINUTOS_INACTIVIDAD * 60 * 1000);
    };

    const eventos = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    eventos.forEach((ev) => window.addEventListener(ev, reiniciarTimer));
    reiniciarTimer();

    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciarTimer));
      if (timerInactividad.current) clearTimeout(timerInactividad.current);
    };
  }, [usuarioActivo]);

  // Renovación automática del token cada cierto tiempo, mientras la sesión siga activa
  useEffect(() => {
    if (!usuarioActivo) return;

    const renovar = async () => {
      try {
        const respuesta = await api.post('/auth/renovar');
        localStorage.setItem('token', respuesta.data.token);
      } catch (err) {
        console.error('No se pudo renovar la sesión', err);
      }
    };

    intervaloRenovacion.current = setInterval(renovar, MINUTOS_RENOVACION * 60 * 1000);

    return () => {
      if (intervaloRenovacion.current) clearInterval(intervaloRenovacion.current);
    };
  }, [usuarioActivo]);

  if (!usuarioActivo) {
    return (
      <>
        {avisoInactividad && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            background: '#B23B34', color: '#fff', textAlign: 'center',
            padding: '10px', fontSize: '13px', fontWeight: 500
          }}>
            Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.
          </div>
        )}
        <Login onLoginSuccess={(usuario) => {
          window.history.replaceState({}, '', '/');
          setAvisoInactividad(false);
          setUsuarioActivo(usuario);
        }} />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Layout usuario={usuarioActivo} onLogout={() => handleLogout('manual')}>
        <Routes>
          <Route path="/" element={<Panel usuario={usuarioActivo} />} />
          <Route path="/produccion" element={<Produccion usuario={usuarioActivo} />} />
          <Route path="/sanidad" element={<Sanidad />} />
          <Route path="/tareas" element={<Tareas usuario={usuarioActivo} />} />
          <Route path="/inventario" element={<Inventario usuario={usuarioActivo} />} />
          <Route path="/ventas" element={<Ventas usuario={usuarioActivo} />} />
          <Route path="/personal" element={<Personal />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios usuario={usuarioActivo} />} />
          <Route
            path="/superadmin"
            element={usuarioActivo.rol === 'superadministrador' ? <SuperAdmin usuario={usuarioActivo} /> : <Navigate to="/" replace />}
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;