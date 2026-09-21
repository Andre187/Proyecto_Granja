import { useState, useEffect } from 'react';
import api from '../api/api';

const estiloClaro = { background: '#F5F1E6', color: '#232019', colorScheme: 'light' };

function SuperAdmin({ usuario: usuarioActivo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [gestionando, setGestionando] = useState(null);
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');

  const cargarTodo = async () => {
    try {
      const [rUsuarios, rRegistros] = await Promise.all([
        api.get('/superadmin/usuarios'),
        api.get('/superadmin/auditoria'),
      ]);
      setUsuarios(rUsuarios.data);
      setRegistros(rRegistros.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarTodo();
   
  }, []);

  const mostrarMensaje = (texto) => {
    setMensaje(texto);
    setError('');
    setTimeout(() => setMensaje(''), 3000);
  };

  const mostrarError = (texto) => {
    setError(texto);
    setTimeout(() => setError(''), 4000);
  };

  const abrirGestion = (u) => {
    setGestionando(u);
    setRolSeleccionado(u.rol);
    setPasswordNueva('');
  };

  const cerrarGestion = () => {
    setGestionando(null);
    setRolSeleccionado('');
    setPasswordNueva('');
  };

  const handleGuardarRol = async () => {
    if (rolSeleccionado === gestionando.rol) return;
    try {
      await api.put(`/superadmin/usuarios/${gestionando.id_usuario}/rol`, { rol: rolSeleccionado });
      mostrarMensaje('Rol actualizado');
      setGestionando({ ...gestionando, rol: rolSeleccionado });
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el rol');
    }
  };

  const handleGuardarPassword = async () => {
    if (passwordNueva.length < 8) {
      mostrarError('La contraseña debe tener al menos 8 caracteres, con letras y números');
      return;
    }
    try {
      await api.put(`/superadmin/usuarios/${gestionando.id_usuario}/password`, { contrasena: passwordNueva });
      setPasswordNueva('');
      mostrarMensaje('Contraseña actualizada');
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar la contraseña');
    }
  };

  const handleToggleActivo = async () => {
    const accion = gestionando.activo ? 'desactivar' : 'reactivar';
    if (accion === 'desactivar' && !window.confirm(`¿Desactivar al usuario "${gestionando.usuario}"? No podrá iniciar sesión hasta que lo reactives.`)) return;
    try {
      await api.put(`/superadmin/usuarios/${gestionando.id_usuario}/${accion}`);
      mostrarMensaje(accion === 'desactivar' ? 'Usuario desactivado' : 'Usuario reactivado');
      setGestionando({ ...gestionando, activo: accion === 'reactivar' });
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || `No se pudo ${accion} el usuario`);
    }
  };

  return (
    <>
      <section className="card" style={{ borderLeft: '4px solid var(--red)' }}>
        <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
          Estás en el panel de <b style={{ color: 'var(--red)' }}>superadministrador</b>. Desde aquí puedes ver y modificar
          cualquier cuenta del sistema, incluyendo administradores. Úsalo con cuidado.
        </p>
      </section>

      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      <section className="card">
        <div className="head">
          <h2>Todos los usuarios</h2>
          <span className="sub">{usuarios.length} cuentas totales</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Trabajador</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario} style={{ opacity: u.activo ? 1 : 0.6 }}>
                  <td>{u.nombre ? `${u.nombre} ${u.apellido || ''}`.trim() : <span style={{ color: 'var(--ink-soft)' }}>—</span>}</td>
                  <td>{u.usuario}</td>
                  <td>
                    <span className={`tag ${u.rol === 'superadministrador' ? 'low' : u.rol === 'administrador' ? 'ok' : 'pend'}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <span className={`tag ${u.activo ? 'ok' : 'low'}`}>{u.activo ? 'activo' : 'inactivo'}</span>
                  </td>
                  <td>{u.trabajador_nombre || <span style={{ color: 'var(--ink-soft)' }}>—</span>}</td>
                  <td>
                    <button
                      style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                      onClick={() => abrirGestion(u)}
                    >
                      ⚙️ Gestionar cuenta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="head">
          <h2>Registro de cambios en usuarios</h2>
          <span className="sub">Últimos 100 movimientos</span>
        </div>
        {registros.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin movimientos registrados todavía.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Acción</th><th>Usuario afectado</th><th>Rol anterior</th><th>Rol nuevo</th></tr>
              </thead>
              <tbody>
                {registros.map((a) => (
                  <tr key={a.id_auditoria}>
                    <td>{new Date(a.fecha_hora).toLocaleString('es-GT')}</td>
                    <td><span className={`tag ${a.accion === 'DELETE' ? 'low' : a.accion === 'INSERT' ? 'ok' : 'pend'}`}>{a.accion}</span></td>
                    <td>{a.usuario_afectado}</td>
                    <td>{a.rol_anterior || '—'}</td>
                    <td>{a.rol_nuevo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {gestionando && (
        <div className="modal-overlay" onClick={cerrarGestion}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="role-avatar">{gestionando.usuario.charAt(0).toUpperCase()}</div>
                <div>
                  <h3 className="modal-title" style={{ marginBottom: '6px' }}>{gestionando.usuario}</h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className={`tag ${gestionando.rol === 'superadministrador' ? 'low' : gestionando.rol === 'administrador' ? 'ok' : 'pend'}`}>
                      {gestionando.rol}
                    </span>
                    <span className={`tag ${gestionando.activo ? 'ok' : 'low'}`}>{gestionando.activo ? 'activo' : 'inactivo'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarGestion}
                aria-label="Cerrar"
                style={{ background: 'transparent', border: 'none', fontSize: '20px', lineHeight: 1, color: 'var(--ink-soft)', padding: '4px' }}
              >
                ×
              </button>
            </div>

            <div className="field" style={{ marginBottom: '16px' }}>
              <label>Rol</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={rolSeleccionado}
                  onChange={(e) => setRolSeleccionado(e.target.value)}
                  style={{ ...estiloClaro, flex: 1, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
                >
                  <option value="operador">operador</option>
                  <option value="administrador">administrador</option>
                  <option value="superadministrador">superadministrador</option>
                </select>
                <button
                  type="button" className="btn" style={{ padding: '8px 14px', fontSize: '12px' }}
                  disabled={rolSeleccionado === gestionando.rol}
                  onClick={handleGuardarRol}
                >
                  Guardar
                </button>
              </div>
            </div>

            <div className="field" style={{ marginBottom: '22px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
              <label>Nueva contraseña</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  placeholder="mínimo 8 caracteres, letras y números"
                  style={{ ...estiloClaro, flex: 1, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
                />
                <button type="button" className="btn" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={handleGuardarPassword}>
                  Actualizar
                </button>
              </div>
            </div>

            {gestionando.id_usuario !== usuarioActivo.id_usuario && (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className={`btn ${gestionando.activo ? 'danger' : ''}`}
                  style={{ width: '100%' }}
                  onClick={handleToggleActivo}
                >
                  {gestionando.activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default SuperAdmin;