import { useState, useEffect } from 'react';
import api from '../api/api';
import SelectorRangoFechas from '../components/SelectorRangoFechas';

const hoy = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

const estiloClaro = { background: '#F5F1E6', color: '#232019', colorScheme: 'light' };

const CATEGORIAS = [
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento' },
  { valor: 'transporte', etiqueta: 'Transporte' },
  { valor: 'servicios', etiqueta: 'Servicios (luz, agua, etc.)' },
  { valor: 'insumos', etiqueta: 'Insumos varios' },
  { valor: 'otros', etiqueta: 'Otros' },
];

const LABELS = { hoy: 'Hoy', semana: 'Últimos 7 días', mes: 'Este mes', personalizado: 'Personalizado' };

function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [total, setTotal] = useState(0);
  const [porCategoria, setPorCategoria] = useState([]);

  const [periodo, setPeriodo] = useState('hoy');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [form, setForm] = useState({ fecha: hoy(), descripcion: '', categoria: 'otros', monto: '' });

  const [pestanaCategoria, setPestanaCategoria] = useState('todas');

  const [editandoId, setEditandoId] = useState(null);
  const [formEdicion, setFormEdicion] = useState({ fecha: '', descripcion: '', categoria: '', monto: '' });

  const cargar = async (p) => {
    try {
      const respuesta = await api.get(`/gastos?periodo=${p}`);
      setGastos(respuesta.data.gastos);
      setTotal(respuesta.data.total);
      setPorCategoria(respuesta.data.por_categoria);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de gastos');
    }
  };

  const cargarPersonalizado = async (desde, hasta) => {
    try {
      const respuesta = await api.get(`/gastos?desde=${desde}&hasta=${hasta}`);
      setGastos(respuesta.data.gastos);
      setTotal(respuesta.data.total);
      setPorCategoria(respuesta.data.por_categoria);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      setPeriodo('personalizado');
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de gastos');
    }
  };

  useEffect(() => {
    if (periodo !== 'personalizado') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargar(periodo);
    }
  
  }, [periodo]);

  const mostrarMensaje = (texto) => {
    setMensaje(texto);
    setError('');
    setTimeout(() => setMensaje(''), 3000);
  };

  const mostrarError = (texto) => {
    setError(texto);
    setTimeout(() => setError(''), 4000);
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/gastos', { ...form, monto: parseFloat(form.monto) });
      setForm({ fecha: hoy(), descripcion: '', categoria: 'otros', monto: '' });
      mostrarMensaje('Gasto registrado correctamente');
      cargar(periodo === 'personalizado' ? 'mes' : periodo);
      if (periodo === 'personalizado') setPeriodo('mes');
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar el gasto');
    }
  };

  const iniciarEdicion = (g) => {
    setEditandoId(g.id_gasto);
    setFormEdicion({ fecha: g.fecha.slice(0, 10), descripcion: g.descripcion, categoria: g.categoria, monto: g.monto });
  };

  const guardarEdicion = async (id) => {
    try {
      await api.put(`/gastos/${id}`, { ...formEdicion, monto: parseFloat(formEdicion.monto) });
      setEditandoId(null);
      mostrarMensaje('Gasto actualizado correctamente');
      cargar(periodo === 'personalizado' ? 'mes' : periodo);
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el gasto');
    }
  };

  const [gastoAAnular, setGastoAAnular] = useState(null);

  const confirmarAnular = async () => {
    try {
      await api.put(`/gastos/${gastoAAnular.id_gasto}/anular`);
      mostrarMensaje('Gasto anulado correctamente');
      setGastoAAnular(null);
      cargar(periodo === 'personalizado' ? 'mes' : periodo);
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo anular el gasto');
    }
  };

  const q = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
  const etiquetaCategoria = (valor) => CATEGORIAS.find((c) => c.valor === valor)?.etiqueta || valor;

  const gastosFiltrados = pestanaCategoria === 'todas' ? gastos : gastos.filter((g) => g.categoria === pestanaCategoria);

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div className="period-tabs">
          {['hoy', 'semana', 'mes'].map((p) => (
            <button key={p} className={periodo === p ? 'active' : ''} onClick={() => { setPeriodo(p); setFechaDesde(''); setFechaHasta(''); }}>
              {LABELS[p]}
            </button>
          ))}
          <SelectorRangoFechas
            desde={fechaDesde}
            hasta={fechaHasta}
            activo={periodo === 'personalizado'}
            onAplicar={cargarPersonalizado}
          />
        </div>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="kpi">
          <div className="label">Total en gastos ({LABELS[periodo].toLowerCase()})</div>
          <div className="value">{q(total)}</div>
        </div>
      </div>

      <section className="card">
        <div className="head"><h2>Registrar gasto</h2></div>
        <form onSubmit={handleRegistrar} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required style={estiloClaro} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: '200px' }}>
            <label>Descripción</label>
            <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="ej. Reparación de bomba de agua" required style={estiloClaro} />
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={estiloClaro}>
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto (Q)</label>
            <input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required style={estiloClaro} />
          </div>
          <button type="submit" className="btn">Registrar gasto</button>
        </form>
      </section>

      {porCategoria.length > 0 && (
        <section className="card">
          <div className="head"><h2>Desglose por categoría</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Categoría</th><th>Cantidad</th><th>Total</th></tr></thead>
              <tbody>
                {porCategoria.map((c) => (
                  <tr key={c.categoria}>
                    <td>{etiquetaCategoria(c.categoria)}</td>
                    <td>{c.cantidad}</td>
                    <td>{q(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div style={{ marginBottom: '18px' }}>
        <div className="period-tabs" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
          <button className={pestanaCategoria === 'todas' ? 'active' : ''} onClick={() => setPestanaCategoria('todas')}>
            Todas
          </button>
          {CATEGORIAS.map((c) => (
            <button key={c.valor} className={pestanaCategoria === c.valor ? 'active' : ''} onClick={() => setPestanaCategoria(c.valor)}>
              {c.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        <div className="head">
          <h2>Historial de gastos</h2>
          <span className="sub">{gastosFiltrados.length} registros</span>
        </div>
        {gastosFiltrados.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            {pestanaCategoria === 'todas' ? 'Sin gastos registrados en este período.' : `Sin gastos en la categoría "${etiquetaCategoria(pestanaCategoria)}".`}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {gastosFiltrados.map((g) => (
                  editandoId === g.id_gasto ? (
                    <tr key={g.id_gasto}>
                      <td>
                        <input type="date" value={formEdicion.fecha} onChange={(e) => setFormEdicion({ ...formEdicion, fecha: e.target.value })}
                          style={{ ...estiloClaro, fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }} />
                      </td>
                      <td>
                        <input value={formEdicion.descripcion} onChange={(e) => setFormEdicion({ ...formEdicion, descripcion: e.target.value })}
                          style={{ ...estiloClaro, fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px', width: '100%' }} />
                      </td>
                      <td>
                        <select value={formEdicion.categoria} onChange={(e) => setFormEdicion({ ...formEdicion, categoria: e.target.value })}
                          style={{ ...estiloClaro, fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }}>
                          {CATEGORIAS.map((c) => (
                            <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input type="number" step="0.01" value={formEdicion.monto} onChange={(e) => setFormEdicion({ ...formEdicion, monto: e.target.value })}
                          style={{ ...estiloClaro, width: '90px', fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }} />
                      </td>
                      <td><span className="tag ok">activo</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => guardarEdicion(g.id_gasto)}>Guardar</button>
                          <button
                            style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--ink-soft)' }}
                            onClick={() => setEditandoId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={g.id_gasto} style={{ opacity: g.estado === 'anulado' ? 0.6 : 1 }}>
                      <td data-label="Fecha">{g.fecha?.slice(0, 10)}</td>
                      <td data-label="Descripción">{g.descripcion}</td>
                      <td data-label="Categoría"><span className="tag pend">{etiquetaCategoria(g.categoria)}</span></td>
                      <td data-label="Monto">{q(g.monto)}</td>
                      <td data-label="Estado">
                        <span className={`tag ${g.estado === 'anulado' ? 'low' : 'ok'}`}>{g.estado === 'anulado' ? 'anulado' : 'activo'}</span>
                      </td>
                      <td data-label="Acciones">
                        {g.estado !== 'anulado' && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                              onClick={() => iniciarEdicion(g)}
                            >
                              Editar
                            </button>
                            <button
                              style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--red)', textDecoration: 'underline', padding: 0 }}
                              onClick={() => setGastoAAnular(g)}
                            >
                              Anular
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {gastoAAnular && (
        <div className="modal-overlay" onClick={() => setGastoAAnular(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M12 16.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M10.3 3.9 2.6 17.3c-.6 1 .1 2.2 1.3 2.2h16.2c1.2 0 1.9-1.2 1.3-2.2L13.7 3.9c-.6-1-2-1-2.6 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="modal-title">Anular gasto</h3>
            <p className="modal-text">
              Vas a anular el gasto de <b>{q(gastoAAnular.monto)}</b> ({gastoAAnular.descripcion}). Se conserva en el
              historial pero deja de contar en los totales. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn outline" onClick={() => setGastoAAnular(null)}>
                Cancelar
              </button>
              <button type="button" className="btn danger" onClick={confirmarAnular}>
                Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Gastos;