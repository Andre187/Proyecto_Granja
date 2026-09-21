import { useState, useEffect } from 'react';
import api from '../api/api';

const hoy = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

const ESTADO_INFO = {
  disponible: { tag: 'ok', label: 'disponible' },
  ocupada: { tag: 'pend', label: 'ocupada' },
  desinfeccion: { tag: 'low', label: 'en desinfección' },
};

function Galeras() {
  const [galeras, setGaleras] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [mostrarNuevaGalera, setMostrarNuevaGalera] = useState(false);
  const [nuevaGalera, setNuevaGalera] = useState({ nombre: '', ubicacion: '', capacidad: '', fecha_ingreso: hoy(), aves_recibidas: '' });

  const [mostrarNuevoLote, setMostrarNuevoLote] = useState(false);
  const [nuevoLote, setNuevoLote] = useState({ id_galera: '', fecha_ingreso: hoy(), aves_recibidas: '' });

  const [galeraAFinalizar, setGaleraAFinalizar] = useState(null);

  const cargarTodo = async () => {
    try {
      const { data } = await api.get('/produccion/galeras');
      setGaleras(data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de galeras');
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

  const galerasDisponibles = galeras.filter((g) => g.estado === 'disponible');

  const handleCrearGalera = async (e) => {
    e.preventDefault();
    try {
      await api.post('/produccion/galeras', {
        ...nuevaGalera,
        capacidad: parseInt(nuevaGalera.capacidad),
        aves_recibidas: nuevaGalera.aves_recibidas ? parseInt(nuevaGalera.aves_recibidas) : null,
      });
      setNuevaGalera({ nombre: '', ubicacion: '', capacidad: '', fecha_ingreso: hoy(), aves_recibidas: '' });
      setMostrarNuevaGalera(false);
      mostrarMensaje('Galera creada correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo crear la galera');
    }
  };

  const handleCrearLote = async (e) => {
    e.preventDefault();
    try {
      await api.post('/produccion/lotes', {
        ...nuevoLote,
        aves_recibidas: parseInt(nuevoLote.aves_recibidas),
      });
      setNuevoLote({ id_galera: '', fecha_ingreso: hoy(), aves_recibidas: '' });
      setMostrarNuevoLote(false);
      mostrarMensaje('Lote creado correctamente, la galera ya está en producción');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo crear el lote');
    }
  };

  const handleFinalizar = async (siguienteEstado) => {
    try {
      await api.put(`/produccion/lotes/${galeraAFinalizar.id_lote}/finalizar`, { siguiente_estado: siguienteEstado });
      mostrarMensaje(
        siguienteEstado === 'disponible'
          ? 'Lote finalizado. La galera ya quedó disponible para un nuevo lote.'
          : 'Lote finalizado. La galera quedó en desinfección.'
      );
      setGaleraAFinalizar(null);
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo finalizar el lote');
    }
  };

  const handleReactivar = async (id_galera) => {
    try {
      await api.put(`/produccion/galeras/${id_galera}/reactivar`);
      mostrarMensaje('Galera reactivada, ya está disponible para un nuevo lote');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo reactivar la galera');
    }
  };

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      <section className="card">
        <div className="head">
          <h2>Galeras</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)' }}
              onClick={() => setMostrarNuevaGalera(!mostrarNuevaGalera)}>
              + Galera
            </button>
            <button className="btn" onClick={() => setMostrarNuevoLote(!mostrarNuevoLote)}>
              + Lote
            </button>
          </div>
        </div>

        {mostrarNuevaGalera && (
          <form onSubmit={handleCrearGalera} style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginBottom: '10px' }}>
              Crea la galera y, si ya te llegaron las aves, registra su primer lote en el mismo paso.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
              <div className="field">
                <label>Nombre de galera</label>
                <input value={nuevaGalera.nombre} onChange={(e) => setNuevaGalera({ ...nuevaGalera, nombre: e.target.value })} required />
              </div>
              <div className="field">
                <label>Ubicación</label>
                <input value={nuevaGalera.ubicacion} onChange={(e) => setNuevaGalera({ ...nuevaGalera, ubicacion: e.target.value })} />
              </div>
              <div className="field">
                <label>Capacidad</label>
                <input type="number" value={nuevaGalera.capacidad} onChange={(e) => setNuevaGalera({ ...nuevaGalera, capacidad: e.target.value })} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--cream)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <div className="field">
                <label>Fecha de ingreso del primer lote (opcional)</label>
                <input type="date" value={nuevaGalera.fecha_ingreso} onChange={(e) => setNuevaGalera({ ...nuevaGalera, fecha_ingreso: e.target.value })} />
              </div>
              <div className="field">
                <label>Aves recibidas (opcional)</label>
                <input type="number" value={nuevaGalera.aves_recibidas} onChange={(e) => setNuevaGalera({ ...nuevaGalera, aves_recibidas: e.target.value })} placeholder="ej. 500" />
              </div>
              <button type="submit" className="btn">Guardar</button>
            </div>
          </form>
        )}

        {mostrarNuevoLote && (
          <form onSubmit={handleCrearLote} style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field">
              <label>Galera disponible</label>
              <select value={nuevoLote.id_galera} onChange={(e) => setNuevoLote({ ...nuevoLote, id_galera: e.target.value })} required>
                <option value="">Selecciona...</option>
                {galerasDisponibles.map((g) => (
                  <option key={g.id_galera} value={g.id_galera}>{g.nombre}</option>
                ))}
              </select>
              {galerasDisponibles.length === 0 && (
                <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>No hay galeras disponibles en este momento.</span>
              )}
            </div>
            <div className="field">
              <label>Fecha de ingreso</label>
              <input type="date" value={nuevoLote.fecha_ingreso} onChange={(e) => setNuevoLote({ ...nuevoLote, fecha_ingreso: e.target.value })} required />
            </div>
            <div className="field">
              <label>Aves recibidas</label>
              <input type="number" value={nuevoLote.aves_recibidas} onChange={(e) => setNuevoLote({ ...nuevoLote, aves_recibidas: e.target.value })} required />
            </div>
            <button type="submit" className="btn">Guardar lote</button>
          </form>
        )}

        {galeras.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Aún no hay galeras registradas. Crea la primera arriba.</p>
        ) : (
          <div className="lote-cards" style={{ flexWrap: 'wrap' }}>
            {galeras.map((g) => {
              const info = ESTADO_INFO[g.estado] || ESTADO_INFO.disponible;
              return (
                <div key={g.id_galera} className="lote-card" style={{ cursor: 'default' }}>
                  <div className="lc-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M3.5 11 12 4l8.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5.5 9.8V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="lc-name">{g.nombre}</div>
                  {g.estado === 'ocupada' ? (
                    <div className="lc-meta">{g.aves_activas} / {g.aves_recibidas} aves</div>
                  ) : (
                    <div className="lc-meta">Capacidad: {g.capacidad}</div>
                  )}
                  <span className={`tag lc-tag ${info.tag}`}>{info.label}</span>

                  <div style={{ marginTop: '10px' }}>
                    {g.estado === 'ocupada' && (
                      <button
                        className="btn"
                        style={{ width: '100%', background: 'transparent', color: 'var(--red)', border: '1px solid var(--red-light)', fontSize: '12px', padding: '7px 10px' }}
                        onClick={() => setGaleraAFinalizar(g)}
                      >
                        Finalizar lote
                      </button>
                    )}
                    {g.estado === 'desinfeccion' && (
                      <button
                        className="btn"
                        style={{ width: '100%', fontSize: '12px', padding: '7px 10px' }}
                        onClick={() => handleReactivar(g.id_galera)}
                      >
                        ✓ Marcar disponible
                      </button>
                    )}
                    {g.estado === 'disponible' && (
                      <p style={{ fontSize: '11px', color: 'var(--ink-soft)', textAlign: 'center', margin: 0 }}>
                        Lista para un nuevo lote
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {galeraAFinalizar && (
        <div className="modal-overlay" onClick={() => setGaleraAFinalizar(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M12 16.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M10.3 3.9 2.6 17.3c-.6 1 .1 2.2 1.3 2.2h16.2c1.2 0 1.9-1.2 1.3-2.2L13.7 3.9c-.6-1-2-1-2.6 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="modal-title">Finalizar lote de {galeraAFinalizar.nombre}</h3>
            <p className="modal-text">
              Ya no se podrá registrar postura ni mortalidad para este lote, pero su historial se conserva. ¿Cómo queda
              la galera después de finalizar?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <button type="button" className="btn" onClick={() => handleFinalizar('desinfeccion')}>
                Finalizar → enviar a desinfección
              </button>
              <button type="button" className="btn outline" onClick={() => handleFinalizar('disponible')}>
                Finalizar → dejar disponible de una vez
              </button>
            </div>
            <button
              type="button"
              onClick={() => setGaleraAFinalizar(null)}
              style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--ink-soft)', textDecoration: 'underline' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Galeras;
