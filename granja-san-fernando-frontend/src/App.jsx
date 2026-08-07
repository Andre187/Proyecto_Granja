import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Layout from './components/Layout';
import Panel from './pages/Panel';
import ModuloPendiente from './pages/ModuloPendiente';

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
          <Route path="/produccion" element={<ModuloPendiente nombre="Producción" />} />
          <Route path="/sanidad" element={<ModuloPendiente nombre="Sanidad y vacunación" />} />
          <Route path="/tareas" element={<ModuloPendiente nombre="Tareas" />} />
          <Route path="/inventario" element={<ModuloPendiente nombre="Inventario" />} />
          <Route path="/ventas" element={<ModuloPendiente nombre="Ventas" />} />
          <Route path="/personal" element={<ModuloPendiente nombre="Personal" />} />
          <Route path="/gastos" element={<ModuloPendiente nombre="Gastos" />} />
          <Route path="/reportes" element={<ModuloPendiente nombre="Reportes" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;