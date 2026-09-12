import { useState, useEffect } from 'react';
import api from '../api/api';

const hoy = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

function Produccion({ usuario }) {
  const esAdmin = usuario.rol === 'administrador' || usuario.rol === 'superadministrador';

  const [galeras, setGaleras] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [postura, setPostura] = useState([]);
  const [mortalidad, setMortalidad] = useState([]);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [mostrarNuevaGalera, setMostrarNuevaGalera] = useState(false);
  const [nuevaGalera, setNuevaGalera] = useState({ nombre: '', ubicacion: '', capacidad: '', fecha_ingreso: hoy(), aves_recibidas: '' });

  const [mostrarNuevoLote, setMostrarNuevoLote] = useState(false);
  const [nuevoLote, setNuevoLote] = useState({ id_galera: '', fecha_ingreso: hoy(), aves_recibidas: '' });

  const [formPostura, setFormPostura] = useState({ id_lote: '', fecha: hoy(), cantidad_huevos: '' });
  const [formMortalidad, setFormMortalidad] = useState({ id_lote: '', fecha: hoy(), cantidad: '', causa: '' });

  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  const [clasificacionesHuevo, setClasificacionesHuevo] = useState([]);
  const [formClasificarHuevos, setFormClasificarHuevos] = useState({
    fecha: hoy(),
    items: [{ id_clasificacion: '', cantidad: '' }],
  });

  const cargarTodo = async () => {
    try {
      const [rGaleras, rLotes, rPostura, rMortalidad, rClasificaciones] = await Promise.all([
        api.get('/produccion/galeras'),
        api.get('/produccion/lotes'),
        api.get('/produccion/postura'),
        api.get('/produccion/mortalidad'),
        api.get('/ventas/clasificaciones'),
      ]);
      setGaleras(rGaleras.data);
      setLotes(rLotes.data);
      setPostura(rPostura.data);
      setMortalidad(rMortalidad.data);
      setClasificacionesHuevo(rClasificaciones.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de producción');
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

  const lotesActivos = lotes.filter((l) => l.estado === 'activo');

  useEffect(() => {
    if (lotes.length === 0) return;
    if (!loteSeleccionado || !lotes.some((l) => l.id_lote === loteSeleccionado)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoteSeleccionado(lotes[0].id_lote);
    }
  }, [lotes, loteSeleccionado]);

  const lote = lotes.find((l) => l.id_lote === loteSeleccionado) || null;
  const posturaDelLote = lote ? postura.filter((p) => p.id_lote === lote.id_lote) : [];
  const mortalidadDelLote = lote ? mortalidad.filter((m) => m.id_lote === lote.id_lote) : [];
  const ultimaPostura = posturaDelLote[0] || null;
  const ultimaMortalidad = mortalidadDelLote[0] || null;

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
      mostrarMensaje('Galera y lote creados correctamente');
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
      mostrarMensaje('Lote creado correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo crear el lote');
    }
  };

  const handleFinalizarLote = async (id_lote, nombreGalera) => {
    if (!window.confirm(`¿Finalizar el lote de ${nombreGalera}? Ya no podrás registrar postura ni mortalidad en él, pero su historial se conserva.`)) return;
    try {
      await api.put(`/produccion/lotes/${id_lote}/finalizar`);
      mostrarMensaje('Lote finalizado correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo finalizar el lote');
    }
  };

  const handleRegistrarPostura = async (e) => {
    e.preventDefault();
    try {
      await api.post('/produccion/postura', {
        ...formPostura,
        cantidad_huevos: parseInt(formPostura.cantidad_huevos),
      });
      setFormPostura({ id_lote: '', fecha: hoy(), cantidad_huevos: '' });
      mostrarMensaje('Postura registrada correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar la postura');
    }
  };

  const handleRegistrarMortalidad = async (e) => {
    e.preventDefault();
    try {
      await api.post('/produccion/mortalidad', {
        ...formMortalidad,
        cantidad: parseInt(formMortalidad.cantidad),
      });
      setFormMortalidad({ id_lote: '', fecha: hoy(), cantidad: '', causa: '' });
      mostrarMensaje('Mortalidad registrada correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar la mortalidad');
    }
  };

  const agregarItemHuevo = () => {
    setFormClasificarHuevos({
      ...formClasificarHuevos,
      items: [...formClasificarHuevos.items, { id_clasificacion: '', cantidad: '' }],
    });
  };

  const quitarItemHuevo = (index) => {
    if (formClasificarHuevos.items.length === 1) return;
    setFormClasificarHuevos({
      ...formClasificarHuevos,
      items: formClasificarHuevos.items.filter((_, i) => i !== index),
    });
  };

  const actualizarItemHuevo = (index, campo, valor) => {
    const copia = [...formClasificarHuevos.items];
    copia[index][campo] = valor;
    setFormClasificarHuevos({ ...formClasificarHuevos, items: copia });
  };

  const handleRegistrarClasificacionHuevos = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventario/huevos-clasificados', {
        fecha: formClasificarHuevos.fecha,
        items: formClasificarHuevos.items.map((it) => ({
          id_clasificacion: it.id_clasificacion,
          cantidad: parseInt(it.cantidad),
        })),
      });
      setFormClasificarHuevos({ fecha: hoy(), items: [{ id_clasificacion: '', cantidad: '' }] });
      mostrarMensaje('Clasificación de huevos registrada');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar la clasificación');
    }
  };

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      {/* ---- Lotes activos: solo administrador ---- */}
      {esAdmin && (
        <section className="card">
          <div className="head">
            <h2>Lotes activos</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)' }}
                onClick={() => setMostrarNuevaGalera(!mostrarNuevaGalera)}>
                + Galera
              </button>
              <button className="btn gold" onClick={() => setMostrarNuevoLote(!mostrarNuevoLote)}>
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
                <label>Galera</label>
                <select value={nuevoLote.id_galera} onChange={(e) => setNuevoLote({ ...nuevoLote, id_galera: e.target.value })} required>
                  <option value="">Selecciona...</option>
                  {galeras.map((g) => (
                    <option key={g.id_galera} value={g.id_galera}>{g.nombre}</option>
                  ))}
                </select>
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

          {lotes.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Aún no hay lotes registrados. Crea primero una galera y luego un lote.</p>
          ) : (
            <>
              <div className="lote-cards">
                {lotes.map((l) => (
                  <button
                    key={l.id_lote}
                    className={`lote-card ${loteSeleccionado === l.id_lote ? 'selected' : ''}`}
                    onClick={() => setLoteSeleccionado(l.id_lote)}
                  >
                    <div className="lc-icon">🐔</div>
                    <div className="lc-name">{l.galera_nombre}</div>
                    <div className="lc-meta">{l.aves_activas} / {l.aves_recibidas} aves</div>
                    <span className={`tag lc-tag ${l.estado === 'activo' ? 'ok' : 'low'}`}>{l.estado}</span>
                  </button>
                ))}
              </div>

              {lote && (
                <div className="lote-detail">
                  <div className="head">
                    <h3>{lote.galera_nombre}</h3>
                    <span className="sub">Lote desde {lote.fecha_ingreso?.slice(0, 10)}</span>
                  </div>
                  <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="kpi">
                      <div className="label">Existencia actual</div>
                      <div className="value">{lote.aves_activas}</div>
                      <div className="delta">de {lote.aves_recibidas} recibidas</div>
                    </div>
                    <div className="kpi">
                      <div className="label">Última postura</div>
                      <div className="value">{ultimaPostura ? ultimaPostura.cantidad_huevos : '—'}</div>
                      <div className="delta">{ultimaPostura ? ultimaPostura.fecha?.slice(0, 10) : 'Sin registros'}</div>
                    </div>
                    <div className="kpi">
                      <div className="label">Tasa de postura</div>
                      <div className="value">{ultimaPostura ? `${ultimaPostura.tasa_postura}%` : '—'}</div>
                      <div className="delta">último registro</div>
                    </div>
                    <div className="kpi">
                      <div className="label">Última mortalidad</div>
                      <div className="value">{ultimaMortalidad ? ultimaMortalidad.cantidad : '—'}</div>
                      <div className="delta warn">{ultimaMortalidad ? ultimaMortalidad.fecha?.slice(0, 10) : 'Sin registros'}</div>
                    </div>
                  </div>
                  {lote.estado === 'finalizado' ? (
                    <div className="alert">
                      <div className="a-mark">✕</div>
                      <div>
                        <div className="a-title">Este lote ya fue finalizado</div>
                        <div className="a-sub">
                          No se pueden registrar más datos de postura ni mortalidad para {lote.galera_nombre}. Su historial se conserva únicamente para consulta.
                        </div>
                      </div>
                    </div>
                  ) : (
                    esAdmin && (
                      <button
                        className="btn"
                        style={{ background: 'transparent', color: 'var(--red)', border: '1px solid var(--red-light)', marginTop: '4px' }}
                        onClick={() => handleFinalizarLote(lote.id_lote, lote.galera_nombre)}
                      >
                        Finalizar este lote
                      </button>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {!esAdmin && lotesActivos.length === 0 && (
        <section className="card">
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            Aún no hay lotes activos disponibles. Pide al administrador que registre una galera y un lote primero.
          </p>
        </section>
      )}

      {/* ---- Formularios de registro diario: ambos roles ---- */}
      <div className="grid-2col">
        <section className="card">
          <div className="head"><h2>Registrar postura diaria</h2></div>
          <form onSubmit={handleRegistrarPostura} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="field">
              <label>Lote</label>
              <select value={formPostura.id_lote} onChange={(e) => setFormPostura({ ...formPostura, id_lote: e.target.value })} required>
                <option value="">Selecciona un lote...</option>
                {lotesActivos.map((l) => (
                  <option key={l.id_lote} value={l.id_lote}>{l.galera_nombre} ({l.aves_activas} aves activas)</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={formPostura.fecha} onChange={(e) => setFormPostura({ ...formPostura, fecha: e.target.value })} required />
            </div>
            <div className="field">
              <label>Cantidad de huevos</label>
              <input type="number" value={formPostura.cantidad_huevos} onChange={(e) => setFormPostura({ ...formPostura, cantidad_huevos: e.target.value })} required />
            </div>
            <button type="submit" className="btn gold">Registrar postura</button>
          </form>
        </section>

        <section className="card">
          <div className="head"><h2>Registrar mortalidad</h2></div>
          <form onSubmit={handleRegistrarMortalidad} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="field">
              <label>Lote</label>
              <select value={formMortalidad.id_lote} onChange={(e) => setFormMortalidad({ ...formMortalidad, id_lote: e.target.value })} required>
                <option value="">Selecciona un lote...</option>
                {lotesActivos.map((l) => (
                  <option key={l.id_lote} value={l.id_lote}>{l.galera_nombre} ({l.aves_activas} aves activas)</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={formMortalidad.fecha} onChange={(e) => setFormMortalidad({ ...formMortalidad, fecha: e.target.value })} required />
            </div>
            <div className="field">
              <label>Cantidad</label>
              <input type="number" value={formMortalidad.cantidad} onChange={(e) => setFormMortalidad({ ...formMortalidad, cantidad: e.target.value })} required />
            </div>
            <div className="field">
              <label>Causa (opcional)</label>
              <input value={formMortalidad.causa} onChange={(e) => setFormMortalidad({ ...formMortalidad, causa: e.target.value })} />
            </div>
            <button type="submit" className="btn" style={{ background: 'var(--red)' }}>Registrar mortalidad</button>
          </form>
        </section>
      </div>

      {/* ---- Clasificar huevos por tamaño: ambos roles ---- */}
      <section className="card">
        <div className="head"><h2>Clasificar huevos por tamaño</h2></div>
        <form onSubmit={handleRegistrarClasificacionHuevos} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="field" style={{ maxWidth: '220px' }}>
            <label>Fecha</label>
            <input
              type="date"
              value={formClasificarHuevos.fecha}
              onChange={(e) => setFormClasificarHuevos({ ...formClasificarHuevos, fecha: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {formClasificarHuevos.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={item.id_clasificacion}
                  onChange={(e) => actualizarItemHuevo(i, 'id_clasificacion', e.target.value)}
                  required
                  style={{ flex: 2, background: '#F5F1E6', color: '#232019', border: '1px solid var(--line)', borderRadius: '7px', padding: '8px 10px', fontSize: '13px' }}
                >
                  <option value="">Tamaño...</option>
                  {clasificacionesHuevo.map((c) => (
                    <option key={c.id_clasificacion} value={c.id_clasificacion}>{c.nombre}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={item.cantidad}
                  onChange={(e) => actualizarItemHuevo(i, 'cantidad', e.target.value)}
                  required
                  style={{ flex: 1, minWidth: '80px', background: '#F5F1E6', color: '#232019', border: '1px solid var(--line)', borderRadius: '7px', padding: '8px 10px', fontSize: '13px' }}
                />
                {formClasificarHuevos.items.length > 1 && (
                  <button type="button" onClick={() => quitarItemHuevo(i)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '13px', cursor: 'pointer' }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <div>
            <button type="button" onClick={agregarItemHuevo} className="btn"
              style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)', fontSize: '12px', padding: '6px 12px' }}>
              + Agregar tamaño
            </button>
          </div>
          <div>
            <button type="submit" className="btn" style={{ background: 'var(--green)' }}>Registrar clasificación</button>
          </div>
        </form>
      </section>

      {/* ---- Historial: solo administrador ---- */}
      {esAdmin && (
        <div className="grid-2col" style={{ marginTop: '20px' }}>
          <section className="card">
            <div className="head">
              <h2>Historial de postura</h2>
              <span className="sub">{lote ? `${lote.galera_nombre} · últimos 20 registros` : 'Últimos 20 registros'}</span>
            </div>
            {posturaDelLote.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                {lote ? 'Sin registros de postura para este lote.' : 'Selecciona un lote arriba para ver su historial.'}
              </p>
            ) : (
              <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Huevos</th><th>Tasa</th></tr>
                </thead>
                <tbody>
                  {posturaDelLote.map((p) => (
                    <tr key={p.id_postura}>
                      <td data-label="Fecha">{p.fecha?.slice(0, 10)}</td>
                      <td data-label="Huevos">{p.cantidad_huevos}</td>
                      <td data-label="Tasa">{p.tasa_postura}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>

          <section className="card">
            <div className="head">
              <h2>Historial de mortalidad</h2>
              <span className="sub">{lote ? `${lote.galera_nombre} · últimos 20 registros` : 'Últimos 20 registros'}</span>
            </div>
            {mortalidadDelLote.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                {lote ? 'Sin registros de mortalidad para este lote.' : 'Selecciona un lote arriba para ver su historial.'}
              </p>
            ) : (
              <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Cantidad</th><th>Causa</th></tr>
                </thead>
                <tbody>
                  {mortalidadDelLote.map((m) => (
                    <tr key={m.id_mortalidad}>
                      <td data-label="Fecha">{m.fecha?.slice(0, 10)}</td>
                      <td data-label="Cantidad">{m.cantidad}</td>
                      <td data-label="Causa">{m.causa || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default Produccion;