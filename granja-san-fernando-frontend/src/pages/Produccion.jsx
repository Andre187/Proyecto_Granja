import { useState, useEffect } from 'react';
import api from '../api/api';

const hoy = () => new Date().toISOString().slice(0, 10);

function Produccion({ usuario }) {
  const esAdmin = usuario.rol === 'administrador';

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

  const cargarTodo = async () => {
    try {
      const [rGaleras, rLotes, rPostura, rMortalidad] = await Promise.all([
        api.get('/produccion/galeras'),
        api.get('/produccion/lotes'),
        api.get('/produccion/postura'),
        api.get('/produccion/mortalidad'),
      ]);
      setGaleras(rGaleras.data);
      setLotes(rLotes.data);
      setPostura(rPostura.data);
      setMortalidad(rMortalidad.data);
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
            <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Galera</th>
                  <th>Fecha ingreso</th>
                  <th>Aves recibidas</th>
                  <th>Aves activas</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((l) => (
                  <tr key={l.id_lote}>
                    <td data-label="Galera">{l.galera_nombre}</td>
                    <td data-label="Fecha ingreso">{l.fecha_ingreso?.slice(0, 10)}</td>
                    <td data-label="Aves recibidas">{l.aves_recibidas}</td>
                    <td data-label="Aves activas">{l.aves_activas}</td>
                    <td data-label="Estado"><span className={`tag ${l.estado === 'activo' ? 'ok' : 'low'}`}>{l.estado}</span></td>
                    <td data-label="Acción">
                      {l.estado === 'activo' && (
                        <button
                          style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--red)', textDecoration: 'underline', padding: 0 }}
                          onClick={() => handleFinalizarLote(l.id_lote, l.galera_nombre)}
                        >
                          Finalizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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

      {/* ---- Historial: solo administrador ---- */}
      {esAdmin && (
        <div className="grid-2col" style={{ marginTop: '20px' }}>
          <section className="card">
            <div className="head">
              <h2>Historial de postura</h2>
              <span className="sub">Últimos 20 registros</span>
            </div>
            <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Galera</th><th>Fecha</th><th>Huevos</th><th>Tasa</th></tr>
              </thead>
              <tbody>
                {postura.map((p) => (
                  <tr key={p.id_postura}>
                    <td data-label="Galera">{p.galera_nombre}</td>
                    <td data-label="Fecha">{p.fecha?.slice(0, 10)}</td>
                    <td data-label="Huevos">{p.cantidad_huevos}</td>
                    <td data-label="Tasa">{p.tasa_postura}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>

          <section className="card">
            <div className="head">
              <h2>Historial de mortalidad</h2>
              <span className="sub">Últimos 20 registros</span>
            </div>
            <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Galera</th><th>Fecha</th><th>Cantidad</th><th>Causa</th></tr>
              </thead>
              <tbody>
                {mortalidad.map((m) => (
                  <tr key={m.id_mortalidad}>
                    <td data-label="Galera">{m.galera_nombre}</td>
                    <td data-label="Fecha">{m.fecha?.slice(0, 10)}</td>
                    <td data-label="Cantidad">{m.cantidad}</td>
                    <td data-label="Causa">{m.causa || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default Produccion;