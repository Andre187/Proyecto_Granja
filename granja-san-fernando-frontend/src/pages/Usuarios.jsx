import { useState, useEffect } from 'react';
import api from '../api/api';

function Usuarios({ usuario: usuarioActivo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [nuevoUsuario, setNuevoUsuario] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [nuevoRol, setNuevoRol] = useState('operador');

  const [editandoPasswordId, setEditandoPasswordId] = useState(null);
  const [passwordTemporal, setPasswordTemporal] = useState('');

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const respuesta = await api.get('/usuarios');
      setUsuarios(respuesta.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la lista de usuarios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarUsuarios();
  }, []);

  const mostrarMensaje = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/usuarios', {
        usuario: nuevoUsuario,
        contrasena: nuevaContrasena,
        rol: nuevoRol,
      });
      setNuevoUsuario('');
      setNuevaContrasena('');
      setNuevoRol('operador');
      mostrarMensaje('Usuario creado correctamente');
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el usuario');
    }
  };

  const handleCambiarRol = async (id, rolActual) => {
    const nuevoRolCambio = rolActual === 'administrador' ? 'operador' : 'administrador';
    try {
      await api.put(`/usuarios/${id}`, { rol: nuevoRolCambio });
      mostrarMensaje('Rol actualizado');
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el rol');
    }
  };

  const handleVincularTrabajador = async (id) => {
    try {
      await api.post(`/usuarios/${id}/vincular-trabajador`);
      mostrarMensaje('Registro de trabajador generado');
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo generar el registro de trabajador');
    }
  };

  const handleGuardarPassword = async (id) => {
    if (passwordTemporal.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await api.put(`/usuarios/${id}/password`, { contrasena: passwordTemporal });
      setEditandoPasswordId(null);
      setPasswordTemporal('');
      mostrarMensaje('Contraseña actualizada');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la contraseña');
    }
  };

  const handleDesactivar = async (id, nombre) => {
    if (!window.confirm(`¿Desactivar al usuario "${nombre}"? No podrá iniciar sesión hasta que lo reactives. Su historial se conserva.`)) return;
    try {
      await api.put(`/usuarios/${id}/desactivar`);
      mostrarMensaje('Usuario desactivado');
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo desactivar el usuario');
    }
  };

  const handleReactivar = async (id) => {
    try {
      await api.put(`/usuarios/${id}/reactivar`);
      mostrarMensaje('Usuario reactivado');
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo reactivar el usuario');
    }
  };

  return (
    <>
      <section className="card">
        <div className="head">
          <h2>Agregar usuario</h2>
        </div>
        <form onSubmit={handleCrear} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field">
            <label>Usuario</label>
            <input
              value={nuevoUsuario}
              onChange={(e) => setNuevoUsuario(e.target.value)}
              placeholder="nombre.usuario"
              required
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={nuevaContrasena}
              onChange={(e) => setNuevaContrasena(e.target.value)}
              placeholder="mínimo 6 caracteres"
              required
            />
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)}>
              <option value="operador">Operador</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
          <button type="submit" className="btn">Crear usuario</button>
        </form>
        {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
        {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginTop: '12px' }}>{mensaje}</p>}
      </section>

      <section className="card">
        <div className="head">
          <h2>Usuarios del sistema</h2>
          <span className="sub">{usuarios.length} usuarios registrados</span>
        </div>

        {cargando ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>Cargando...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Trabajador (para tareas)</th>
                  <th>Contraseña</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id_usuario} style={{ opacity: u.activo ? 1 : 0.6 }}>
                    <td>{u.usuario}</td>
                    <td>
                      <span className={`tag ${u.rol === 'administrador' ? 'ok' : 'pend'}`}>{u.rol}</span>
                    </td>
                    <td>
                      <span className={`tag ${u.activo ? 'ok' : 'low'}`}>{u.activo ? 'activo' : 'inactivo'}</span>
                    </td>
                    <td>
                      {u.rol !== 'operador' ? (
                        <span style={{ color: 'var(--ink-soft)' }}>—</span>
                      ) : u.trabajador_nombre ? (
                        u.trabajador_nombre
                      ) : (
                        <button
                          style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                          onClick={() => handleVincularTrabajador(u.id_usuario)}
                        >
                          Generar registro
                        </button>
                      )}
                    </td>
                    <td>
                      {editandoPasswordId === u.id_usuario ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="password"
                            value={passwordTemporal}
                            onChange={(e) => setPasswordTemporal(e.target.value)}
                            placeholder="nueva contraseña"
                            style={{
                              fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)',
                              borderRadius: '6px', minWidth: '120px'
                            }}
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
                          Cambiar contraseña
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
        )}
      </section>
    </>
  );
}

export default Usuarios;