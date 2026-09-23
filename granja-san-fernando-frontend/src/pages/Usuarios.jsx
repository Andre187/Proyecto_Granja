import { useState, useEffect } from 'react';
import api from '../api/api';

// Misma regla que utils/contrasenaSegura.js del backend
const REGEX_CONTRASENA_SEGURA = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function Usuarios({ usuario: usuarioActivo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [nuevoUsuario, setNuevoUsuario] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [nuevoRol, setNuevoRol] = useState('operador');

  const [usuarioCambiandoPassword, setUsuarioCambiandoPassword] = useState(null);
  const [passwordTemporal, setPasswordTemporal] = useState('');
  const [errorPassword, setErrorPassword] = useState('');

  const [usuarioGestionando, setUsuarioGestionando] = useState(null);
  const [rolPermisoTemp, setRolPermisoTemp] = useState('operador');
  const [activoPermisoTemp, setActivoPermisoTemp] = useState(true);
  const [errorPermisos, setErrorPermisos] = useState('');

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
        nombre: nuevoNombre,
        apellido: nuevoApellido,
        contrasena: nuevaContrasena,
        rol: nuevoRol,
      });
      setNuevoUsuario('');
      setNuevoNombre('');
      setNuevoApellido('');
      setNuevaContrasena('');
      setNuevoRol('operador');
      mostrarMensaje('Usuario creado correctamente');
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el usuario');
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

  const cerrarModalPassword = () => {
    setUsuarioCambiandoPassword(null);
    setPasswordTemporal('');
    setErrorPassword('');
  };

  const handleGuardarPassword = async () => {
    if (!REGEX_CONTRASENA_SEGURA.test(passwordTemporal)) {
      setErrorPassword('La contraseña debe tener al menos 8 caracteres, incluyendo al menos una letra y un número');
      return;
    }
    try {
      await api.put(`/usuarios/${usuarioCambiandoPassword.id_usuario}/password`, { contrasena: passwordTemporal });
      mostrarMensaje(`Contraseña actualizada para ${usuarioCambiandoPassword.usuario}`);
      cerrarModalPassword();
    } catch (err) {
      setErrorPassword(err.response?.data?.error || 'No se pudo actualizar la contraseña');
    }
  };

  const cerrarModalPermisos = () => {
    setUsuarioGestionando(null);
    setErrorPermisos('');
  };

  const handleGuardarPermisos = async () => {
    setErrorPermisos('');
    try {
      if (rolPermisoTemp !== usuarioGestionando.rol) {
        await api.put(`/usuarios/${usuarioGestionando.id_usuario}`, { rol: rolPermisoTemp });
      }
      const esUnoMismo = usuarioGestionando.id_usuario === usuarioActivo.id_usuario;
      if (!esUnoMismo && activoPermisoTemp !== !!usuarioGestionando.activo) {
        if (activoPermisoTemp) {
          await api.put(`/usuarios/${usuarioGestionando.id_usuario}/reactivar`);
        } else {
          await api.put(`/usuarios/${usuarioGestionando.id_usuario}/desactivar`);
        }
      }
      mostrarMensaje(`Permisos actualizados para ${usuarioGestionando.usuario}`);
      cerrarModalPermisos();
      cargarUsuarios();
    } catch (err) {
      setErrorPermisos(err.response?.data?.error || 'No se pudo actualizar los permisos');
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
            <label>Nombre</label>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Andrea"
              required
            />
          </div>
          <div className="field">
            <label>Apellido</label>
            <input
              value={nuevoApellido}
              onChange={(e) => setNuevoApellido(e.target.value)}
              placeholder="Estévez"
              required
            />
          </div>
          <div className="field">
            <label>Usuario (para iniciar sesión)</label>
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
              placeholder="mínimo 8 caracteres, al menos una letra y un número"
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
                  <th>Nombre</th>
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
                    <td>{u.nombre ? `${u.nombre} ${u.apellido || ''}`.trim() : <span style={{ color: 'var(--ink-soft)' }}>—</span>}</td>
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
                      <button
                        style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                        onClick={() => { setUsuarioCambiandoPassword(u); setPasswordTemporal(''); setErrorPassword(''); }}
                      >
                        Cambiar contraseña
                      </button>
                    </td>
                    <td>
                      <button
                        style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                        onClick={() => {
                          setUsuarioGestionando(u);
                          setRolPermisoTemp(u.rol);
                          setActivoPermisoTemp(!!u.activo);
                          setErrorPermisos('');
                        }}
                      >
                        Permisos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {usuarioCambiandoPassword && (
        <div className="modal-overlay" onClick={cerrarModalPassword}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon navy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h3 className="modal-title">Cambiar contraseña</h3>
            <p className="modal-text">
              Vas a establecer una nueva contraseña para <b>{usuarioCambiandoPassword.usuario}</b>.
            </p>
            <div className="field" style={{ textAlign: 'left', marginBottom: '18px' }}>
              <label>Nueva contraseña</label>
              <input
                type="password"
                autoFocus
                value={passwordTemporal}
                onChange={(e) => setPasswordTemporal(e.target.value)}
                placeholder="mínimo 8 caracteres, al menos una letra y un número"
                onKeyDown={(e) => e.key === 'Enter' && handleGuardarPassword()}
              />
            </div>
            {errorPassword && <p style={{ color: 'var(--red)', fontSize: '12.5px', marginTop: '-10px', marginBottom: '16px' }}>{errorPassword}</p>}
            <div className="modal-actions">
              <button className="btn outline" onClick={cerrarModalPassword}>Cancelar</button>
              <button className="btn" onClick={handleGuardarPassword}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {usuarioGestionando && (
        <div className="modal-overlay" onClick={cerrarModalPermisos}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon navy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3.5 18.5 6v5.2c0 4.4-2.9 7.6-6.5 8.8-3.6-1.2-6.5-4.4-6.5-8.8V6L12 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="modal-title">Permisos de {usuarioGestionando.usuario}</h3>
            <p className="modal-text">
              Cambia el rol o el estado de la cuenta.
            </p>
            <div className="field" style={{ textAlign: 'left', marginBottom: '14px' }}>
              <label>Rol</label>
              <select value={rolPermisoTemp} onChange={(e) => setRolPermisoTemp(e.target.value)}>
                <option value="operador">Operador</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
            {usuarioGestionando.id_usuario !== usuarioActivo.id_usuario ? (
              <div className="field" style={{ textAlign: 'left', marginBottom: '18px' }}>
                <label>Estado de la cuenta</label>
                <select value={activoPermisoTemp ? 'activo' : 'inactivo'} onChange={(e) => setActivoPermisoTemp(e.target.value === 'activo')}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo (no podrá iniciar sesión)</option>
                </select>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '18px' }}>
                No puedes desactivar tu propia cuenta.
              </p>
            )}
            {errorPermisos && <p style={{ color: 'var(--red)', fontSize: '12.5px', marginTop: '-10px', marginBottom: '16px' }}>{errorPermisos}</p>}
            <div className="modal-actions">
              <button className="btn outline" onClick={cerrarModalPermisos}>Cancelar</button>
              <button className="btn" onClick={handleGuardarPermisos}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Usuarios;