import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import logo from '../assets/logo_mini.png';

const NAV = [
  { group: null, to: '/', label: 'Panel general', icon: '🏠', roles: ['administrador', 'operador', 'superadministrador'] },
  { group: 'Operación', to: '/produccion', label: 'Producción', icon: '🥚', roles: ['administrador', 'operador'] },
  { group: 'Operación', to: '/sanidad', label: 'Sanidad y vacunación', icon: '💉', roles: ['administrador', 'operador'] },
  { group: 'Operación', to: '/tareas', label: 'Tareas', icon: '✅', roles: ['administrador', 'operador'] },
  { group: 'Operación', to: '/ventas', label: 'Ventas', icon: '💰', roles: ['administrador', 'operador'] },
  { group: 'Operación', to: '/inventario', label: 'Inventario (consulta)', icon: '📦', roles: ['administrador', 'operador'] },
  { group: 'Administración', to: '/personal', label: 'Personal', icon: '👥', roles: ['administrador'] },
  { group: 'Administración', to: '/gastos', label: 'Gastos', icon: '🧾', roles: ['administrador'] },
  { group: 'Administración', to: '/reportes', label: 'Reportes', icon: '📈', roles: ['administrador'] },
  { group: 'Administración', to: '/usuarios', label: 'Usuarios', icon: '👤', roles: ['administrador'] },
  { group: 'Emergencia', to: '/superadmin', label: 'Súper Admin', icon: '🛡️', roles: ['superadministrador'] },
];

const TITLES = {
  '/': ['Panel general', 'Granja San Fernando'],
  '/produccion': ['Producción', 'Registro de postura diaria y mortalidad por galera'],
  '/sanidad': ['Sanidad y vacunación', 'Historial y registro de esquema de vacunación'],
  '/tareas': ['Tareas', 'Asignación y seguimiento de tareas del personal'],
  '/inventario': ['Inventario', 'Insumos, medicamentos y alertas de nivel mínimo'],
  '/ventas': ['Ventas', 'Registro de transacciones y cuentas por cobrar'],
  '/personal': ['Personal', 'Trabajadores activos y costo por día'],
  '/gastos': ['Gastos operativos', 'Registro de gastos varios de la granja'],
  '/reportes': ['Reportes', 'Indicadores clave de producción, ventas y costos'],
  '/usuarios': ['Usuarios', 'Administración de cuentas y permisos del sistema'],
  '/superadmin': ['Súper Admin', 'Gestión total de cuentas y auditoría del sistema'],
};

function Layout({ usuario, onLogout, children }) {
  const location = useLocation();
  const [title, subtitle] = TITLES[location.pathname] || ['Granja San Fernando', ''];
  const [menuAbierto, setMenuAbierto] = useState(false);

  // El superadministrador también ve todo lo que ve un administrador normal
  const itemsVisibles = NAV.filter((item) =>
    item.roles.includes(usuario.rol) ||
    (usuario.rol === 'superadministrador' && item.roles.includes('administrador'))
  );

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button className="menu-toggle" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
          ☰
        </button>
        <div className="brand-mark">
          <img src={logo} alt="Granja San Fernando" />
        </div>
        <div className="brand-text">San Fernando</div>
      </div>

      <div className={`sidebar-overlay ${menuAbierto ? 'open' : ''}`} onClick={cerrarMenu}></div>

      <aside className={`sidebar ${menuAbierto ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <img src={logo} alt="Granja San Fernando" />
          </div>
          <div className="brand-text">
            San Fernando
            <span>Sistema de granja</span>
          </div>
        </div>

        <div className="nav-scroll">
          <nav className="side-nav">
            {itemsVisibles.map((item, index) => {
              const grupoAnterior = index > 0 ? itemsVisibles[index - 1].group : null;
              const showGroupLabel = item.group && item.group !== grupoAnterior;

              return (
                <div key={item.to}>
                  {showGroupLabel && <div className="nav-label">{item.group}</div>}
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={cerrarMenu}
                    className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="role-card">
          <div className="role-card-top">
            <div className="role-avatar">{usuario.usuario.charAt(0).toUpperCase()}</div>
            <div>
              <b>{usuario.usuario}</b>
              <span className={`role-badge ${usuario.rol === 'administrador' ? 'admin' : usuario.rol === 'superadministrador' ? 'admin' : 'operador'}`}>
                {usuario.rol === 'administrador' ? 'Administrador' : usuario.rol === 'superadministrador' ? 'Superadmin' : 'Operador'}
              </span>
            </div>
          </div>
          <button onClick={() => { if (window.confirm('¿Cerrar sesión?')) onLogout(); }}>Cerrar sesión</button>

          
        </div>
      </aside>

      <main className="content">
        <header className="top">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default Layout;