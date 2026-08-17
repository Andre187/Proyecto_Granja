import { useState, useEffect } from 'react';
import api from '../api/api';

const hoy = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

function Tareas({ usuario }) {
  const esAdmin = usuario.rol === 'administrador' || usuario.rol === 'superadministrador';

  const [tareas, setTareas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [galeras, setGaleras] = useState([]);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [formTarea, setFormTarea] = useState({
    id_trabajador: '', id_galera: '', descripcion: '', fecha_asignacion: hoy(), fecha_limite: '',
  });

  const [pestanaEstado, setPestanaEstado] = useState('pendiente');

  const tareasVisibles = esAdmin ? tareas : tareas.filter((t) => t.estado !== 'finalizado');

  const ETIQUETAS_ESTADO = { pendiente: 'Pendientes', 'en proceso': 'En proceso', finalizado: 'Finalizadas', todas: 'Todas' };
  const tareasFiltradasPorEstado = pestanaEstado === 'todas' ? tareas : tareas.filter((t) => t.estado === pestanaEstado);

  const cargarTodo = async () => {
    try {
      const peticiones = [api.get('/tareas/tareas')];
      if (esAdmin) {
        peticiones.push(api.get('/tareas/trabajadores'));
        peticiones.push(api.get('/produccion/galeras'));
      }

      const [rTareas, rTrabajadores, rGaleras] = await Promise.all(peticiones);
      setTareas(rTareas.data);
      if (esAdmin) {
        setTrabajadores(rTrabajadores.data);
        setGaleras(rGaleras.data);
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de tareas');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleAsignarTarea = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tareas/tareas', {
        ...formTarea,
        id_galera: formTarea.id_galera || null,
        fecha_limite: formTarea.fecha_limite || null,
      });
      setFormTarea({ id_trabajador: '', id_galera: '', descripcion: '', fecha_asignacion: hoy(), fecha_limite: '' });
      mostrarMensaje('Tarea asignada correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo asignar la tarea');
    }
  };

  const cambiarEstado = async (id_tarea, nuevoEstado) => {
    try {
      await api.put(`/tareas/tareas/${id_tarea}/estado`, { estado: nuevoEstado });
      mostrarMensaje('Estado actualizado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el estado');
    }
  };

  const filaTarea = (t, i, total) => (
    <div
      key={t.id_tarea}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '13px 0', borderBottom: i < total - 1 ? '1px solid var(--line)' : 'none', gap: '14px'
      }}
    >
      <div>
        <div style={{ fontSize: '13.5px', fontWeight: 500 }}>
          {t.descripcion}
          {t.galera_nombre && (
            <span style={{
              marginLeft: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--navy)',
              background: 'var(--green-light)', padding: '2px 8px', borderRadius: '999px'
            }}>
              📍 {t.galera_nombre}
            </span>
          )}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '3px' }}>
          Asignada: {t.fecha_asignacion?.slice(0, 10)}
          {t.fecha_limite && ` · Vence: ${t.fecha_limite.slice(0, 10)}`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span className={`status-pill ${t.estado}`}>{t.estado}</span>

        {!esAdmin && t.estado === 'pendiente' && (
          <button className="btn" style={{ padding: '6px 12px', fontSize: '11.5px' }} onClick={() => cambiarEstado(t.id_tarea, 'en proceso')}>
            Iniciar
          </button>
        )}
        {!esAdmin && t.estado === 'en proceso' && (
          <button className="btn" style={{ padding: '6px 12px', fontSize: '11.5px', background: 'var(--green)' }} onClick={() => cambiarEstado(t.id_tarea, 'finalizado')}>
            Marcar finalizada
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      {!esAdmin && !usuario.id_trabajador && (
        <section className="card">
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            Tu cuenta todavía no está vinculada a un registro de trabajador, así que no se te pueden mostrar tareas asignadas.
            Pide al administrador que la vincule desde el módulo de Usuarios.
          </p>
        </section>
      )}

      {esAdmin && (
        <section className="card">
          <div className="head">
            <h2>Asignar tarea</h2>
          </div>

          {trabajadores.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              Aún no hay trabajadores disponibles para asignar tareas. Ve al módulo de <b>Usuarios</b> y crea un usuario
              con rol operador — ahí mismo se crea su registro de trabajador.
            </p>
          ) : (
            <form onSubmit={handleAsignarTarea} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: 1, minWidth: '180px' }}>
                  <label>Trabajador</label>
                  <select value={formTarea.id_trabajador} onChange={(e) => setFormTarea({ ...formTarea, id_trabajador: e.target.value })} required>
                    <option value="">Selecciona un trabajador...</option>
                    {trabajadores.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 1, minWidth: '180px' }}>
                  <label>Galera (opcional)</label>
                  <select value={formTarea.id_galera} onChange={(e) => setFormTarea({ ...formTarea, id_galera: e.target.value })}>
                    <option value="">Sin galera específica</option>
                    {galeras.map((g) => (
                      <option key={g.id_galera} value={g.id_galera}>{g.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Descripción de la tarea</label>
                <input value={formTarea.descripcion} onChange={(e) => setFormTarea({ ...formTarea, descripcion: e.target.value })} placeholder="ej. Aplicar vacuna Newcastle" required />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Fecha de asignación</label>
                  <input type="date" value={formTarea.fecha_asignacion} onChange={(e) => setFormTarea({ ...formTarea, fecha_asignacion: e.target.value })} required />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Fecha límite (opcional)</label>
                  <input type="date" value={formTarea.fecha_limite} onChange={(e) => setFormTarea({ ...formTarea, fecha_limite: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn gold">Asignar tarea</button>
            </form>
          )}
        </section>
      )}

      {/* ---- Administrador: pestañas de estado + un panel separado por cada trabajador ---- */}
      {esAdmin && trabajadores.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <div className="period-tabs" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
            {['pendiente', 'en proceso', 'finalizado', 'todas'].map((est) => (
              <button key={est} className={pestanaEstado === est ? 'active' : ''} onClick={() => setPestanaEstado(est)}>
                {ETIQUETAS_ESTADO[est]}
              </button>
            ))}
          </div>
        </div>
      )}

      {esAdmin && (
        trabajadores.length === 0 ? null : (
          trabajadores.map((trabajador) => {
            const tareasDeEste = tareasFiltradasPorEstado.filter((t) => t.id_trabajador === trabajador.id_trabajador);
            return (
              <section className="card" key={trabajador.id_trabajador}>
                <div className="head">
                  <h2>{trabajador.nombre}</h2>
                  <span className="sub">{tareasDeEste.length} tareas</span>
                </div>
                {tareasDeEste.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                    {pestanaEstado === 'todas' ? 'Sin tareas asignadas todavía.' : `Sin tareas en estado "${ETIQUETAS_ESTADO[pestanaEstado].toLowerCase()}".`}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {tareasDeEste.map((t, i) => filaTarea(t, i, tareasDeEste.length))}
                  </div>
                )}
              </section>
            );
          })
        )
      )}

      {/* ---- Operador: solo sus propias tareas ---- */}
      {!esAdmin && (
        <section className="card">
          <div className="head">
            <h2>Mis tareas</h2>
            <span className="sub">{tareasVisibles.length} tareas pendientes</span>
          </div>

          {tareasVisibles.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>¡No tienes tareas pendientes! 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tareasVisibles.map((t, i) => filaTarea(t, i, tareasVisibles.length))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default Tareas;