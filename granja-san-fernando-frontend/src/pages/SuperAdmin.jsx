import { useState, useEffect } from 'react';
import api from '../api/api';

const estiloClaro = { background: '#F5F1E6', color: '#232019', colorScheme: 'light' };

function SuperAdmin({ usuario: usuarioActivo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [editandoPasswordId, setEditandoPasswordId] = useState(null);
  const [passwordTemporal, setPasswordTemporal] = useState('');

  const cargarTodo = async () => {
    try {
      const [rUsuarios, rAuditoria] = await Promise.all([
        api.get('/superadmin/usuarios'),
        api.get('/superadmin/auditoria'),
      ]);
      setUsuarios(rUsuarios.data);
      setAuditoria(rAuditoria.data);
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

  const handleCambiarRol = async (id, rolActual) => {
    const opciones = ['operador', 'administrador', 'superadministrador'];
    const siguiente = opciones[(opciones.indexOf(rolActual) + 1) % opciones.length];
    if (!window.confirm(`¿Cambiar el rol a "${siguiente}"?`)) return;
    try {
      await api.put(`/superadmin/usuarios/${id}/rol`, { rol: siguiente });
      mostrarMensaje('Rol actualizado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el rol');
    }
  };

  const handleGuardarPassword = async (id) => {
    if (passwordTemporal.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await api.put(`/superadmin/usuarios/${id}/password`, { contrasena: passwordTemporal });
      setEditandoPasswordId(null);
      setPasswordTemporal('');
      mostrarMensaje('Contraseña actualizada');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la contraseña');
    }
  };

  const handleDesactivar = async (id, nombre) => {
    if (!window.confirm(`¿Desactivar al usuario "${nombre}"? No podrá iniciar sesión hasta que lo reactives.`)) return;
    try {
      await api.put(`/superadmin/usuarios/${id}/desactivar`);
      mostrarMensaje('Usuario desactivado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo desactivar el usuario');
    }
  };

  const handleReactivar = async (id) => {
    try {
      await api.put(`/superadmin/usuarios/${id}/reactivar`);
      mostrarMensaje('Usuario reactivado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo reactivar el usuario');
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
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Trabajador</th>
                <th>Contraseña</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario} style={{ opacity: u.activo ? 1 : 0.6 }}>
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
                    {editandoPasswordId === u.id_usuario ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="password"
                          value={passwordTemporal}
                          onChange={(e) => setPasswordTemporal(e.target.value)}
                          placeholder="nueva contraseña"
                          style={{ ...estiloClaro, fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px', minWidth: '120px' }}
                        />
                        <button className="btn" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => handleGuardarPassword(u.id_usuario)}>
                          Guardar
                        </button>
                        <button
                          style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--ink-soft)' }}
                          onClick={() => { setEditandoPasswordId(null); setPasswordTemporal(''); }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                        onClick={() => { setEditandoPasswordId(u.id_usuario); setPasswordTemporal(''); }}
                      >
                        Resetear contraseña
                      </button>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--ink-soft)', textDecoration: 'underline', padding: 0 }}
                        onClick={() => handleCambiarRol(u.id_usuario, u.rol)}
                      >
                        Cambiar rol
                      </button>
                      {u.id_usuario !== usuarioActivo.id_usuario && (
                        u.activo ? (
                          <button
                            style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--red)', textDecoration: 'underline', padding: 0 }}
                            onClick={() => handleDesactivar(u.id_usuario, u.usuario)}
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--green)', textDecoration: 'underline', padding: 0 }}
                            onClick={() => handleReactivar(u.id_usuario)}
                          >
                            Reactivar
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="head">
          <h2> registrados de cambios en usuarios</h2>
          <span className="sub">Últimos 100 movimientos</span>
        </div>
        {auditoria.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin movimientos registrados todavía.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Acción</th><th>Usuario afectado</th><th>Rol anterior</th><th>Rol nuevo</th></tr>
              </thead>
              <tbody>
                {auditoria.map((a) => (
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
    </>
  );
}

export default SuperAdmin;