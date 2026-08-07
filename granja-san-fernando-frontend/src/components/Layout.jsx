import { NavLink, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';

const NAV = [
  { group: null, to: '/', label: 'Panel general', roles: ['administrador', 'operador'] },
  { group: 'Operación', to: '/produccion', label: 'Producción', roles: ['administrador', 'operador'] },
  { group: 'Operación', to: '/sanidad', label: 'Sanidad y vacunación', roles: ['administrador', 'operador'] },
  { group: 'Operación', to: '/tareas', label: 'Tareas', roles: ['administrador', 'operador'] },
  { group: 'Administración', to: '/inventario', label: 'Inventario', roles: ['administrador'] },
  { group: 'Administración', to: '/ventas', label: 'Ventas', roles: ['administrador'] },
  { group: 'Administración', to: '/personal', label: 'Personal', roles: ['administrador'] },
  { group: 'Administración', to: '/gastos', label: 'Gastos', roles: ['administrador'] },
  { group: 'Administración', to: '/reportes', label: 'Reportes', roles: ['administrador'] },
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
};

function Layout({ usuario, onLogout, children }) {
  const location = useLocation();
  const [title, subtitle] = TITLES[location.pathname] || ['Granja San Fernando', ''];

  let lastGroup = null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src={logo} alt="Granja San Fernando" />
          </div>
          <div className="brand-text">
            San Fernando
            <span>Sistema de granja</span>
          </div>
        </div>

        <nav className="side-nav">
          {NAV.map((item) => {
            const showGroupLabel = item.group && item.group !== lastGroup;
            lastGroup = item.group;
            const allowed = item.roles.includes(usuario.rol);

            return (
              <div key={item.to}>
                {showGroupLabel && <div className="nav-label">{item.group}</div>}
                {allowed ? (
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                  >
                    <span className="dot"></span>
                    {item.label}
                  </NavLink>
                ) : (
                  <div className="nav-item locked" title="Solo administrador">
                    <span className="dot"></span>
                    {item.label}
                    <span className="lock">🔒</span>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="role-card">
          <b>{usuario.usuario}</b>
          {usuario.rol === 'administrador' ? 'Acceso completo al sistema' : 'Rol trabajador — registro y consulta'}
          <button onClick={onLogout}>Cerrar sesión</button>
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
