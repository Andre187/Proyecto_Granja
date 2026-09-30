import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import logo from '../assets/logo_mini.png';

const svgProps = { viewBox: '0 0 20 20', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true };
const strokeProps = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const ICONS = {
  home: (
    <svg {...svgProps}>
      <path d="M3.5 10.5 10 4l6.5 6.5" {...strokeProps} />
      <path d="M5 9.5V16a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5" {...strokeProps} />
      <path d="M8 17v-3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V17" {...strokeProps} />
    </svg>
  ),
  egg: (
    <svg {...svgProps}>
      <path d="M10 3.2c3 3.6 5 7 5 9.8a5 5 0 0 1-10 0c0-2.8 2-6.2 5-9.8Z" {...strokeProps} />
    </svg>
  ),
  shieldPlus: (
    <svg {...svgProps}>
      <path d="M10 3 16 5.2v4.3c0 4-2.6 7-6 8.5-3.4-1.5-6-4.5-6-8.5V5.2L10 3Z" {...strokeProps} />
      <path d="M10 8v4M8 10h4" {...strokeProps} />
    </svg>
  ),
  checklist: (
    <svg {...svgProps}>
      <rect x="5" y="4" width="10" height="13" rx="1.5" {...strokeProps} />
      <path d="M8 3.5h4a1 1 0 0 1 1 1V5H7v-.5a1 1 0 0 1 1-1Z" {...strokeProps} />
      <path d="m7.5 10.3 1.8 1.8L12.5 9" {...strokeProps} />
    </svg>
  ),
  tag: (
    <svg {...svgProps}>
      <path d="M11 3.5H5.5A1.5 1.5 0 0 0 4 5v5.5c0 .4.16.78.44 1.06l7 7a1.5 1.5 0 0 0 2.12 0l4-4a1.5 1.5 0 0 0 0-2.12l-7-7A1.5 1.5 0 0 0 11 3.5Z" {...strokeProps} />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  box: (
    <svg {...svgProps}>
      <path d="M10 3.5 17 7v6l-7 3.5L3 13V7l7-3.5Z" {...strokeProps} />
      <path d="M3 7l7 3.5M17 7l-7 3.5M10 10.5V17" {...strokeProps} />
    </svg>
  ),
  barn: (
    <svg {...svgProps}>
      <path d="M3 10.5 10 4l7 6.5" {...strokeProps} />
      <path d="M4.7 9.5V16a1 1 0 0 0 1 1h8.6a1 1 0 0 0 1-1V9.5" {...strokeProps} />
      <path d="M8 17v-3.8a2 2 0 0 1 4 0V17" {...strokeProps} />
    </svg>
  ),
  people: (
    <svg {...svgProps}>
      <circle cx="7.5" cy="7" r="2.5" {...strokeProps} />
      <path d="M2.5 17c0-2.8 2.2-5 5-5s5 2.2 5 5" {...strokeProps} />
      <circle cx="14.2" cy="7.3" r="2" {...strokeProps} />
      <path d="M12.8 12.2c2.3.4 4 2.3 4 4.8" {...strokeProps} />
    </svg>
  ),
  receipt: (
    <svg {...svgProps}>
      <path d="M5 3.5h10v13l-1.4-1-1.4 1-1.4-1-1.4 1-1.4-1-1.4 1-1.4-1V3.5Z" {...strokeProps} />
      <path d="M7 7h6M7 10h6M7 13h3.5" {...strokeProps} />
    </svg>
  ),
  trending: (
    <svg {...svgProps}>
      <path d="M3.5 14.5 7.5 10l3 3 5.5-6.5" {...strokeProps} />
      <path d="M13 6h3.5v3.5" {...strokeProps} />
    </svg>
  ),
  user: (
    <svg {...svgProps}>
      <circle cx="10" cy="6.5" r="3" {...strokeProps} />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" {...strokeProps} />
    </svg>
  ),
  shield: (
    <svg {...svgProps}>
      <path d="M10 3 16 5.2v4.3c0 4-2.6 7-6 8.5-3.4-1.5-6-4.5-6-8.5V5.2L10 3Z" {...strokeProps} />
    </svg>
  ),
  gear: (
    <svg {...svgProps}>
      <circle cx="10" cy="10" r="2.6" {...strokeProps} />
      <path d="M10 3.5v2M10 14.5v2M16.5 10h-2M5.5 10h-2M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4M14.6 14.6l-1.4-1.4M6.8 6.8 5.4 5.4" {...strokeProps} />
    </svg>
  ),
};

// Ícono del avatar según el rol -- diferencia por forma, no por color
const AVATAR_ICONS = {
  operador: ICONS.user,
  administrador: ICONS.gear,
  superadministrador: ICONS.shield,
};

const NAV = [
  { group: null, to: '/', label: 'Panel general', icon: 'home', roles: ['administrador', 'operador', 'superadministrador'] },
  { group: 'Operación', to: '/produccion', label: 'Producción', icon: 'egg', roles: ['administrador', 'operador', 'superadministrador'] },
  { group: 'Operación', to: '/sanidad', label: 'Sanidad y vacunación', icon: 'shieldPlus', roles: ['administrador', 'operador', 'superadministrador'] },
  { group: 'Operación', to: '/tareas', label: 'Tareas', icon: 'checklist', roles: ['administrador', 'operador', 'superadministrador'] },
  { group: 'Operación', to: '/ventas', label: 'Ventas', icon: 'tag', roles: ['administrador', 'operador', 'superadministrador'] },
  { group: 'Operación', to: '/inventario', label: 'Inventario', icon: 'box', roles: ['administrador', 'operador', 'superadministrador'] },
  { group: 'Administración', to: '/galeras', label: 'Galeras', icon: 'barn', roles: ['administrador', 'superadministrador'] },
  { group: 'Administración', to: '/personal', label: 'Personal', icon: 'people', roles: ['administrador', 'superadministrador'] },
  { group: 'Administración', to: '/gastos', label: 'Gastos', icon: 'receipt', roles: ['administrador', 'superadministrador'] },
  { group: 'Administración', to: '/reportes', label: 'Reportes', icon: 'trending', roles: ['administrador', 'superadministrador'] },
  { group: 'Administración', to: '/usuarios', label: 'Usuarios', icon: 'user', roles: ['administrador', 'superadministrador'] },
  { group: 'Bitácora del Sistema', to: '/superadmin', label: 'Bitácora del Sistema', icon: 'shield', roles: ['superadministrador'] },
];

const TITLES = {
  '/': ['Panel general', 'Granja San Fernando'],
  '/produccion': ['Producción', 'Registro de postura diaria y mortalidad por galera'],
  '/sanidad': ['Sanidad y vacunación', 'Historial y registro de esquema de vacunación'],
  '/tareas': ['Tareas', 'Asignación y seguimiento de tareas del personal'],
  '/inventario': ['Inventario', 'Insumos, medicamentos y alertas de nivel mínimo'],
  '/ventas': ['Ventas', 'Registro de transacciones y cuentas por cobrar'],
  '/galeras': ['Galeras', 'Alta de galeras y lotes, y control de disponibilidad/desinfección'],
  '/personal': ['Personal', 'Trabajadores activos y costo por día'],
  '/gastos': ['Gastos operativos', 'Registro de gastos varios de la granja'],
  '/reportes': ['Reportes', 'Indicadores clave de producción, ventas y costos'],
  '/usuarios': ['Usuarios', 'Administración de cuentas y permisos del sistema'],
  '/superadmin': ['Bitácora del Sistema', 'Gestión total de cuentas y registro de cambios del sistema'],
};

function Layout({ usuario, onLogout, children }) {
  const location = useLocation();
  const [title, subtitle] = TITLES[location.pathname] || ['Granja San Fernando', ''];
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmarSalir, setConfirmarSalir] = useState(false);
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const perfilRef = useRef(null);

  useEffect(() => {
    if (!menuPerfilAbierto) return;
    const cerrarSiFuera = (e) => {
      if (perfilRef.current && !perfilRef.current.contains(e.target)) setMenuPerfilAbierto(false);
    };
    document.addEventListener('mousedown', cerrarSiFuera);
    return () => document.removeEventListener('mousedown', cerrarSiFuera);
  }, [menuPerfilAbierto]);

  const etiquetaRol = usuario.rol === 'administrador' ? 'Administrador' : usuario.rol === 'superadministrador' ? 'Superadmin' : 'Operador';
  const claseRol = usuario.rol === 'operador' ? 'operador' : 'admin';

  // El superadministrador figura explícitamente en los roles de cada opción de NAV
  const itemsVisibles = NAV.filter((item) => item.roles.includes(usuario.rol));

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
                    <span className="nav-icon">{ICONS[item.icon]}</span>
                    {item.label}
                  </NavLink>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="profile-menu-wrap" ref={perfilRef}>
          <button className="profile-trigger" onClick={() => setMenuPerfilAbierto((v) => !v)} aria-expanded={menuPerfilAbierto}>
            <div className="role-avatar">{AVATAR_ICONS[usuario.rol]}</div>
            <div className="profile-trigger-info">
              <b>{usuario.usuario}</b>
              <span className={`role-badge ${claseRol}`}>{etiquetaRol}</span>
            </div>
            <svg className="profile-chevron" width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="m5 12 5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {menuPerfilAbierto && (
            <div className="role-card profile-popover">
              <button className="logout-btn" onClick={() => { setMenuPerfilAbierto(false); setConfirmarSalir(true); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M6.5 6.5a8 8 0 1 0 11 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          )}
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

      {confirmarSalir && (
        <div className="modal-overlay" onClick={() => setConfirmarSalir(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M6.5 6.5a8 8 0 1 0 11 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <h3 className="modal-title">¿Cerrar sesión?</h3>
            <p className="modal-text">
              Tu sesión actual se cerrará y tendrás que volver a iniciar sesión para continuar.
            </p>
            <div className="modal-actions">
              <button className="btn outline" onClick={() => setConfirmarSalir(false)}>Cancelar</button>
              <button className="btn danger" onClick={onLogout}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;