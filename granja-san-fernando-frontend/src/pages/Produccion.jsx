import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import CampoFecha from '../components/CampoFecha';
import { mostrarAviso } from '../utils/aviso';

const hoy = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

function Produccion({ usuario }) {
  const esAdmin = usuario.rol === 'administrador' || usuario.rol === 'superadministrador';

  const [lotes, setLotes] = useState([]);
  const [postura, setPostura] = useState([]);
  const [mortalidad, setMortalidad] = useState([]);

  const [error, setError] = useState('');

  const [formPostura, setFormPostura] = useState({ fecha: hoy(), cartones: '', sueltos: '' });
  const [formMortalidad, setFormMortalidad] = useState({ fecha: hoy(), cantidad: '', causa: '' });

  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  const [clasificacionesHuevo, setClasificacionesHuevo] = useState([]);
  const [formClasificarHuevos, setFormClasificarHuevos] = useState({
    fecha: hoy(),
    items: [{ id_clasificacion: '', cantidad: '' }],
  });

  const cargarTodo = async () => {
    try {
      const [rLotes, rPostura, rMortalidad, rClasificaciones] = await Promise.all([
        api.get('/produccion/lotes'),
        api.get('/produccion/postura'),
        api.get('/produccion/mortalidad'),
        api.get('/ventas/clasificaciones'),
      ]);
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
    mostrarAviso(texto);
    setError('');
  };

  const mostrarError = (texto) => {
    setError(texto);
    setTimeout(() => setError(''), 4000);
  };

  const lotesActivos = lotes.filter((l) => l.estado === 'activo');

  useEffect(() => {
    if (lotesActivos.length === 0) return;
    if (!loteSeleccionado || !lotesActivos.some((l) => l.id_lote === loteSeleccionado)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoteSeleccionado(lotesActivos[0].id_lote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotes, loteSeleccionado]);

  const lote = lotesActivos.find((l) => l.id_lote === loteSeleccionado) || null;
  const posturaDelLote = lote ? postura.filter((p) => p.id_lote === lote.id_lote) : [];
  const mortalidadDelLote = lote ? mortalidad.filter((m) => m.id_lote === lote.id_lote) : [];
  const ultimaPostura = posturaDelLote[0] || null;
  const ultimaMortalidad = mortalidadDelLote[0] || null;

  const HUEVOS_POR_CARTON = 30;
  const huevosDePostura = (f) => (parseInt(f.cartones) || 0) * HUEVOS_POR_CARTON + (parseInt(f.sueltos) || 0);
  // Ej. 2550 -> "2,550 huevos (85 cartones)"; 2562 -> "2,562 huevos (85 cartones y 12 huevos)"
  const textoHuevos = (h) => {
    const n = Number(h) || 0;
    const cartones = Math.floor(n / HUEVOS_POR_CARTON);
    const sueltos = n % HUEVOS_POR_CARTON;
    return `${n.toLocaleString('es-GT')} huevos (${cartones} cartones${sueltos ? ` y ${sueltos} huevos` : ''})`;
  };

  const handleRegistrarPostura = async (e) => {
    e.preventDefault();
    if (!lote) return mostrarError('Selecciona un galpón arriba para registrar');
    try {
      // Se captura en cartones (+ huevos sueltos); el sistema guarda el total en huevos
      await api.post('/produccion/postura', {
        id_lote: lote.id_lote,
        fecha: formPostura.fecha,
        cantidad_huevos: huevosDePostura(formPostura),
      });
      setFormPostura({ fecha: hoy(), cartones: '', sueltos: '' });
      mostrarMensaje('Postura registrada correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar la postura');
    }
  };

  const handleRegistrarMortalidad = async (e) => {
    e.preventDefault();
    if (!lote) return mostrarError('Selecciona un galpón arriba para registrar');
    try {
      await api.post('/produccion/mortalidad', {
        ...formMortalidad,
        id_lote: lote.id_lote,
        cantidad: parseInt(formMortalidad.cantidad),
      });
      setFormMortalidad({ fecha: hoy(), cantidad: '', causa: '' });
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

      {/* ---- Lotes activos: solo administrador, solo lectura/selección ---- */}
      {(esAdmin || lotesActivos.length > 0) && (
        <section className="card">
          <div className="head">
            <h2>{esAdmin ? 'Lotes activos' : 'Galpón a registrar'}</h2>
            {esAdmin && (
              <Link
                to="/galeras"
                className="btn"
                style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)', textDecoration: 'none' }}
              >
                Gestionar galeras →
              </Link>
            )}
          </div>

          {lotesActivos.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              No hay galeras activas en este momento. Ve al módulo de <Link to="/galeras">Galeras</Link> para habilitar una.
            </p>
          ) : (
            <>
              <div className="lote-cards">
                {lotesActivos.map((l) => (
                  <button
                    key={l.id_lote}
                    className={`lote-card ${loteSeleccionado === l.id_lote ? 'selected' : ''}`}
                    onClick={() => setLoteSeleccionado(l.id_lote)}
                  >
                    <div className="lc-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M3.5 11 12 4l8.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5.5 9.8V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="lc-name">{l.galera_nombre}</div>
                    <div className="lc-meta">{l.aves_activas} / {l.aves_recibidas} aves</div>
                    <span className="tag lc-tag ok">activo</span>
                  </button>
                ))}
              </div>

              {esAdmin && lote && (
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
                      <div className="value">{ultimaPostura ? `${Math.floor(Number(ultimaPostura.cantidad_huevos) / HUEVOS_POR_CARTON)} cartones` : '—'}</div>
                      <div className="delta">{ultimaPostura ? `${Number(ultimaPostura.cantidad_huevos).toLocaleString('es-GT')} huevos · ${ultimaPostura.fecha?.slice(0, 10)}` : 'Sin registros'}</div>
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
                </div>
              )}
            </>
          )}
        </section>
      )}

      {!esAdmin && lotesActivos.length === 0 && (
        <section className="card">
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            Aún no hay galeras activas disponibles. Pide al administrador que habilite una en el módulo de Galeras.
          </p>
        </section>
      )}

      {/* ---- Formularios de registro diario: ambos roles ---- */}
      <div className="grid-2col">
        <section className="card">
          <div className="head"><h2>Registrar postura diaria</h2></div>
          <form onSubmit={handleRegistrarPostura} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p className="galpon-registro">
              {lote ? <>Galpón: <b>{lote.galera_nombre}</b> · {lote.aves_activas} aves activas</> : 'Selecciona un galpón arriba'}
            </p>
            <div className="field">
              <label>Fecha</label>
              <CampoFecha value={formPostura.fecha} onChange={(e) => setFormPostura({ ...formPostura, fecha: e.target.value })} required />
            </div>
            <div className="field">
              <label>Cartones</label>
              <input type="number" min="0" step="1" value={formPostura.cartones} onChange={(e) => setFormPostura({ ...formPostura, cartones: e.target.value })} required />
            </div>
            <div className="field">
              <label>Huevos sueltos (opcional)</label>
              <input type="number" min="0" max="29" step="1" value={formPostura.sueltos} onChange={(e) => setFormPostura({ ...formPostura, sueltos: e.target.value })} />
              {huevosDePostura(formPostura) > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                  Total: {huevosDePostura(formPostura).toLocaleString('es-GT')} huevos
                </span>
              )}
            </div>
            <button type="submit" className="btn" disabled={!lote}>Registrar postura</button>
          </form>
        </section>

        <section className="card">
          <div className="head"><h2>Registrar mortalidad</h2></div>
          <form onSubmit={handleRegistrarMortalidad} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p className="galpon-registro">
              {lote ? <>Galpón: <b>{lote.galera_nombre}</b> · {lote.aves_activas} aves activas</> : 'Selecciona un galpón arriba'}
            </p>
            <div className="field">
              <label>Fecha</label>
              <CampoFecha value={formMortalidad.fecha} onChange={(e) => setFormMortalidad({ ...formMortalidad, fecha: e.target.value })} required />
            </div>
            <div className="field">
              <label>Cantidad</label>
              <input type="number" value={formMortalidad.cantidad} onChange={(e) => setFormMortalidad({ ...formMortalidad, cantidad: e.target.value })} required />
            </div>
            <div className="field">
              <label>Causa (opcional)</label>
              <input value={formMortalidad.causa} onChange={(e) => setFormMortalidad({ ...formMortalidad, causa: e.target.value })} />
            </div>
            <button type="submit" className="btn" disabled={!lote}>Registrar mortalidad</button>
          </form>
        </section>
      </div>

      {/* ---- Clasificar huevos por tamaño: ambos roles ---- */}
      <section className="card">
        <div className="head"><h2>Clasificar huevos por tamaño</h2></div>
        <form onSubmit={handleRegistrarClasificacionHuevos} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="field" style={{ maxWidth: '220px' }}>
            <label>Fecha</label>
            <CampoFecha
              value={formClasificarHuevos.fecha}
              onChange={(e) => setFormClasificarHuevos({ ...formClasificarHuevos, fecha: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {formClasificarHuevos.items.map((item, i) => (
              <div key={i} className="fila-form" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            <button type="submit" className="btn">Registrar clasificación</button>
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
                  <tr><th>Fecha</th><th>Producción</th><th>Tasa</th></tr>
                </thead>
                <tbody>
                  {posturaDelLote.map((p) => (
                    <tr key={p.id_postura}>
                      <td data-label="Fecha">{p.fecha?.slice(0, 10)}</td>
                      <td data-label="Producción">{textoHuevos(p.cantidad_huevos)}</td>
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
