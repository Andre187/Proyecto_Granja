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
      setError('No se pudo cargar la lista de usuarios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
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
    const nuevoRol = rolActual === 'administrador' ? 'operador' : 'administrador';
    try {
      await api.put(`/usuarios/${id}`, { rol: nuevoRol });
      mostrarMensaje('Rol actualizado');
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el rol');
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

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/usuarios/${id}`);
      mostrarMensaje('Usuario eliminado');
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el usuario');
    }
  };

  return (
    <>
      <section className="card">
        <div className="head">
          <h2>Agregar usuario</h2>
        </div>
        <form onSubmit={handleCrear} className="form-row" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
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
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Contraseña</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.usuario}</td>
                  <td>
                    <span className={`tag ${u.rol === 'administrador' ? 'ok' : 'pend'}`}>{u.rol}</span>
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
                        <button
                          style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--red)', textDecoration: 'underline', padding: 0 }}
                          onClick={() => handleEliminar(u.id_usuario, u.usuario)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default Usuarios;
