import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuarioActivo(null);
  };

  if (!usuarioActivo) {
    return <Login onLoginSuccess={(usuario) => setUsuarioActivo(usuario)} />;
  }

  return (
    <BrowserRouter>
      <Layout usuario={usuarioActivo} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Panel usuario={usuarioActivo} />} />
          <Route path="/produccion" element={<Produccion />} />
          <Route path="/sanidad" element={<Sanidad />} />
          <Route path="/tareas" element={<Tareas usuario={usuarioActivo} />} />
          <Route path="/inventario" element={<Inventario usuario={usuarioActivo} />} />
          <Route path="/ventas" element={<Ventas usuario={usuarioActivo} />} />
          <Route path="/personal" element={<Personal />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios usuario={usuarioActivo} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;