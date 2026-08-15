import { useState, useEffect } from 'react';
import api from '../api/api';

const hoy = () => new Date().toISOString().slice(0, 10);

const estiloClaro = { background: '#F5F1E6', color: '#232019', colorScheme: 'light' };

function Inventario({ usuario }) {
  const esAdmin = usuario.rol === 'administrador';

  const [concentrado, setConcentrado] = useState([]);
  const [concentradoStock, setConcentradoStock] = useState([]);
  const [concentradoConsumo, setConcentradoConsumo] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [clasificacionesHuevo, setClasificacionesHuevo] = useState([]);
  const [huevosStock, setHuevosStock] = useState([]);
  const [huevosClasificados, setHuevosClasificados] = useState([]);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [formConcentrado, setFormConcentrado] = useState({ fecha: hoy(), tipo_concentrado: '', cantidad_qq: '', costo_unitario: '' });
  const [formConsumoConcentrado, setFormConsumoConcentrado] = useState({ id_stock: '', fecha: hoy(), cantidad_qq: '' });
  const [editandoMinimoId, setEditandoMinimoId] = useState(null);
  const [minimoTemporal, setMinimoTemporal] = useState('');

  const [mostrarNuevoMed, setMostrarNuevoMed] = useState(false);
  const [nuevoMed, setNuevoMed] = useState({ nombre: '', existencia_actual: '', nivel_minimo: '', unidad_medida: '' });

  const [formMovimientoAdmin, setFormMovimientoAdmin] = useState({ id_medicamento: '', fecha: hoy(), tipo_movimiento: 'entrada', cantidad: '' });
  const [formSalidaMed, setFormSalidaMed] = useState({ id_medicamento: '', fecha: hoy(), cantidad: '' });

  const [formClasificarHuevos, setFormClasificarHuevos] = useState({
    fecha: hoy(),
    items: [{ id_clasificacion: '', cantidad: '' }],
  });
  const [editandoMinimoHuevoId, setEditandoMinimoHuevoId] = useState(null);
  const [minimoHuevoTemporal, setMinimoHuevoTemporal] = useState('');

  const cargarTodo = async () => {
    try {
      const [rConcentrado, rStock, rConsumo, rMedicamentos, rMovimientos, rClasificaciones, rHuevosStock, rHuevosClasificados] = await Promise.all([
        api.get('/inventario/concentrado'),
        api.get('/inventario/concentrado-stock'),
        api.get('/inventario/concentrado-consumo'),
        api.get('/inventario/medicamentos'),
        api.get('/inventario/movimientos'),
        api.get('/ventas/clasificaciones'),
        api.get('/inventario/huevos-stock'),
        api.get('/inventario/huevos-clasificados'),
      ]);
      setConcentrado(rConcentrado.data);
      setConcentradoStock(rStock.data);
      setConcentradoConsumo(rConsumo.data);
      setMedicamentos(rMedicamentos.data);
      setMovimientos(rMovimientos.data);
      setClasificacionesHuevo(rClasificaciones.data);
      setHuevosStock(rHuevosStock.data);
      setHuevosClasificados(rHuevosClasificados.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de inventario');
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

  const medicamentosBajoMinimo = medicamentos.filter((m) => Number(m.existencia_actual) < Number(m.nivel_minimo));
  const concentradoBajoMinimo = concentradoStock.filter((c) => Number(c.existencia_actual) < Number(c.nivel_minimo) && Number(c.nivel_minimo) > 0);
  const huevosBajoMinimo = huevosStock.filter((h) => Number(h.existencia_actual) < Number(h.nivel_minimo) && Number(h.nivel_minimo) > 0);

  // ---- Concentrado: compra (solo admin) ----
  const handleRegistrarConcentrado = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventario/concentrado', {
        ...formConcentrado,
        cantidad_qq: parseFloat(formConcentrado.cantidad_qq),
        costo_unitario: parseFloat(formConcentrado.costo_unitario),
      });
      setFormConcentrado({ fecha: hoy(), tipo_concentrado: '', cantidad_qq: '', costo_unitario: '' });
      mostrarMensaje('Compra de concentrado registrada');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar la compra');
    }
  };

  // ---- Concentrado: consumo (cualquier usuario) ----
  const handleRegistrarConsumoConcentrado = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventario/concentrado-consumo', {
        ...formConsumoConcentrado,
        cantidad_qq: parseFloat(formConsumoConcentrado.cantidad_qq),
      });
      setFormConsumoConcentrado({ id_stock: '', fecha: hoy(), cantidad_qq: '' });
      mostrarMensaje('Consumo de concentrado registrado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar el consumo');
    }
  };

  const handleGuardarMinimo = async (id_stock) => {
    try {
      await api.put(`/inventario/concentrado-stock/${id_stock}`, { nivel_minimo: parseFloat(minimoTemporal) });
      setEditandoMinimoId(null);
      mostrarMensaje('Nivel mínimo actualizado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el nivel mínimo');
    }
  };

  // ---- Medicamentos ----
  const handleCrearMedicamento = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventario/medicamentos', {
        ...nuevoMed,
        existencia_actual: parseFloat(nuevoMed.existencia_actual),
        nivel_minimo: parseFloat(nuevoMed.nivel_minimo),
      });
      setNuevoMed({ nombre: '', existencia_actual: '', nivel_minimo: '', unidad_medida: '' });
      setMostrarNuevoMed(false);
      mostrarMensaje('Medicamento agregado al catálogo');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo agregar el medicamento');
    }
  };

  const handleRegistrarMovimientoAdmin = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventario/movimientos', {
        ...formMovimientoAdmin,
        cantidad: parseFloat(formMovimientoAdmin.cantidad),
      });
      setFormMovimientoAdmin({ id_medicamento: '', fecha: hoy(), tipo_movimiento: 'entrada', cantidad: '' });
      mostrarMensaje('Movimiento registrado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar el movimiento');
    }
  };

  // ---- Medicamentos: salida rápida (cualquier usuario) ----
  const handleRegistrarSalidaMed = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventario/movimientos', {
        ...formSalidaMed,
        cantidad: parseFloat(formSalidaMed.cantidad),
        tipo_movimiento: 'salida',
      });
      setFormSalidaMed({ id_medicamento: '', fecha: hoy(), cantidad: '' });
      mostrarMensaje('Salida registrada');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar la salida');
    }
  };

  // ---- Huevos: clasificación diaria por tamaño (admin u operador) ----
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

  const handleGuardarMinimoHuevo = async (id_stock) => {
    try {
      await api.put(`/inventario/huevos-stock/${id_stock}`, { nivel_minimo: parseInt(minimoHuevoTemporal) });
      setEditandoMinimoHuevoId(null);
      mostrarMensaje('Nivel mínimo actualizado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el nivel mínimo');
    }
  };

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      {(medicamentosBajoMinimo.length > 0 || concentradoBajoMinimo.length > 0 || huevosBajoMinimo.length > 0) && (
        <section className="card">
          <div className="head"><h2>Alertas de nivel mínimo</h2></div>
          <div className="alert-list">
            {medicamentosBajoMinimo.map((m) => (
              <div className="alert" key={`med-${m.id_medicamento}`}>
                <span className="a-mark">!</span>
                <div>
                  <div className="a-title">{m.nombre} bajo mínimo</div>
                  <div className="a-sub">Existencia: {m.existencia_actual} {m.unidad_medida} · Mínimo: {m.nivel_minimo} {m.unidad_medida}</div>
                </div>
              </div>
            ))}
            {concentradoBajoMinimo.map((c) => (
              <div className="alert" key={`con-${c.id_stock}`}>
                <span className="a-mark">!</span>
                <div>
                  <div className="a-title">Concentrado {c.tipo_concentrado} bajo mínimo</div>
                  <div className="a-sub">Existencia: {c.existencia_actual} qq · Mínimo: {c.nivel_minimo} qq</div>
                </div>
              </div>
            ))}
            {huevosBajoMinimo.map((h) => (
              <div className="alert" key={`huevo-${h.id_stock}`}>
                <span className="a-mark">!</span>
                <div>
                  <div className="a-title">Huevo {h.clasificacion} bajo mínimo</div>
                  <div className="a-sub">Existencia: {h.existencia_actual} · Mínimo: {h.nivel_minimo}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Clasificar huevos por tamaño (visible para todos) ---- */}
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
              style={estiloClaro}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {formClasificarHuevos.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={item.id_clasificacion}
                  onChange={(e) => actualizarItemHuevo(i, 'id_clasificacion', e.target.value)}
                  required
                  style={{ ...estiloClaro, flex: 2, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
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
                  style={{ ...estiloClaro, flex: 1, minWidth: '80px', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
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

      {/* ---- Registrar salida rápida (visible para todos) ---- */}
      <div className="grid-2col">
        <section className="card">
          <div className="head"><h2>Registrar consumo de concentrado</h2></div>
          {concentradoStock.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              Aún no hay concentrado en existencia. {esAdmin ? 'Registra una compra primero.' : 'Pide al administrador que registre una compra primero.'}
            </p>
          ) : (
            <form onSubmit={handleRegistrarConsumoConcentrado} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="field">
                <label>Tipo de concentrado</label>
                <select value={formConsumoConcentrado.id_stock} onChange={(e) => setFormConsumoConcentrado({ ...formConsumoConcentrado, id_stock: e.target.value })} required style={estiloClaro}>
                  <option value="">Selecciona...</option>
                  {concentradoStock.map((c) => (
                    <option key={c.id_stock} value={c.id_stock}>{c.tipo_concentrado} ({c.existencia_actual} qq disponibles)</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Cantidad (qq)</label>
                  <input type="number" step="0.01" value={formConsumoConcentrado.cantidad_qq} onChange={(e) => setFormConsumoConcentrado({ ...formConsumoConcentrado, cantidad_qq: e.target.value })} required style={estiloClaro} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Fecha</label>
                  <input type="date" value={formConsumoConcentrado.fecha} onChange={(e) => setFormConsumoConcentrado({ ...formConsumoConcentrado, fecha: e.target.value })} required style={estiloClaro} />
                </div>
              </div>
              <button type="submit" className="btn" style={{ background: 'var(--green)' }}>Registrar consumo</button>
            </form>
          )}
        </section>

        <section className="card">
          <div className="head"><h2>Registrar salida de medicamento</h2></div>
          {medicamentos.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              Aún no hay medicamentos en el catálogo. {esAdmin ? 'Agrega uno abajo.' : 'Pide al administrador que agregue uno primero.'}
            </p>
          ) : (
            <form onSubmit={handleRegistrarSalidaMed} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="field">
                <label>Medicamento</label>
                <select value={formSalidaMed.id_medicamento} onChange={(e) => setFormSalidaMed({ ...formSalidaMed, id_medicamento: e.target.value })} required style={estiloClaro}>
                  <option value="">Selecciona...</option>
                  {medicamentos.map((m) => (
                    <option key={m.id_medicamento} value={m.id_medicamento}>{m.nombre} ({m.existencia_actual} {m.unidad_medida} disponibles)</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Cantidad</label>
                  <input type="number" step="0.01" value={formSalidaMed.cantidad} onChange={(e) => setFormSalidaMed({ ...formSalidaMed, cantidad: e.target.value })} required style={estiloClaro} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Fecha</label>
                  <input type="date" value={formSalidaMed.fecha} onChange={(e) => setFormSalidaMed({ ...formSalidaMed, fecha: e.target.value })} required style={estiloClaro} />
                </div>
              </div>
              <button type="submit" className="btn" style={{ background: 'var(--green)' }}>Registrar salida</button>
            </form>
          )}
        </section>
      </div>

      {/* ---- Solo administrador: compras y catálogo ---- */}
      {esAdmin && (
        <div className="grid-2col" style={{ marginTop: '20px' }}>
          <section className="card">
            <div className="head"><h2>Registrar compra de concentrado</h2></div>
            <form onSubmit={handleRegistrarConcentrado} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="field">
                <label>Tipo de concentrado</label>
                <input value={formConcentrado.tipo_concentrado} onChange={(e) => setFormConcentrado({ ...formConcentrado, tipo_concentrado: e.target.value })} placeholder="ej. Pre-postura" required style={estiloClaro} />
              </div>
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={formConcentrado.fecha} onChange={(e) => setFormConcentrado({ ...formConcentrado, fecha: e.target.value })} required style={estiloClaro} />
              </div>
              <div className="field">
                <label>Cantidad (quintales)</label>
                <input type="number" step="0.01" value={formConcentrado.cantidad_qq} onChange={(e) => setFormConcentrado({ ...formConcentrado, cantidad_qq: e.target.value })} required style={estiloClaro} />
              </div>
              <div className="field">
                <label>Costo por quintal (Q)</label>
                <input type="number" step="0.01" value={formConcentrado.costo_unitario} onChange={(e) => setFormConcentrado({ ...formConcentrado, costo_unitario: e.target.value })} required style={estiloClaro} />
              </div>
              <button type="submit" className="btn gold">Registrar compra</button>
            </form>
          </section>

          <section className="card">
            <div className="head">
              <h2>Registrar entrada/salida de medicamento</h2>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)' }}
                onClick={() => setMostrarNuevoMed(!mostrarNuevoMed)}>
                + Medicamento
              </button>
            </div>

            {mostrarNuevoMed && (
              <form onSubmit={handleCrearMedicamento} style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="field">
                  <label>Nombre</label>
                  <input value={nuevoMed.nombre} onChange={(e) => setNuevoMed({ ...nuevoMed, nombre: e.target.value })} required style={estiloClaro} />
                </div>
                <div className="field">
                  <label>Existencia inicial</label>
                  <input type="number" step="0.01" value={nuevoMed.existencia_actual} onChange={(e) => setNuevoMed({ ...nuevoMed, existencia_actual: e.target.value })} required style={estiloClaro} />
                </div>
                <div className="field">
                  <label>Nivel mínimo</label>
                  <input type="number" step="0.01" value={nuevoMed.nivel_minimo} onChange={(e) => setNuevoMed({ ...nuevoMed, nivel_minimo: e.target.value })} required style={estiloClaro} />
                </div>
                <div className="field">
                  <label>Unidad de medida</label>
                  <input value={nuevoMed.unidad_medida} onChange={(e) => setNuevoMed({ ...nuevoMed, unidad_medida: e.target.value })} placeholder="ej. frascos" required style={estiloClaro} />
                </div>
                <button type="submit" className="btn">Guardar</button>
              </form>
            )}

            {medicamentos.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Agrega primero un medicamento con "+ Medicamento".</p>
            ) : (
              <form onSubmit={handleRegistrarMovimientoAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="field">
                  <label>Medicamento</label>
                  <select value={formMovimientoAdmin.id_medicamento} onChange={(e) => setFormMovimientoAdmin({ ...formMovimientoAdmin, id_medicamento: e.target.value })} required style={estiloClaro}>
                    <option value="">Selecciona...</option>
                    {medicamentos.map((m) => (
                      <option key={m.id_medicamento} value={m.id_medicamento}>{m.nombre} ({m.existencia_actual} {m.unidad_medida})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Tipo</label>
                    <select value={formMovimientoAdmin.tipo_movimiento} onChange={(e) => setFormMovimientoAdmin({ ...formMovimientoAdmin, tipo_movimiento: e.target.value })} style={estiloClaro}>
                      <option value="entrada">Entrada (compra)</option>
                      <option value="salida">Salida</option>
                    </select>
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Cantidad</label>
                    <input type="number" step="0.01" value={formMovimientoAdmin.cantidad} onChange={(e) => setFormMovimientoAdmin({ ...formMovimientoAdmin, cantidad: e.target.value })} required style={estiloClaro} />
                  </div>
                </div>
                <div className="field">
                  <label>Fecha</label>
                  <input type="date" value={formMovimientoAdmin.fecha} onChange={(e) => setFormMovimientoAdmin({ ...formMovimientoAdmin, fecha: e.target.value })} required style={estiloClaro} />
                </div>
                <button type="submit" className="btn" style={{ background: 'var(--navy)' }}>Registrar movimiento</button>
              </form>
            )}
          </section>
        </div>
      )}

      {/* ---- Existencia de concentrado ---- */}
      <section className="card">
        <div className="head">
          <h2>Existencia de concentrado</h2>
          <span className="sub">{concentradoStock.length} tipos</span>
        </div>
        {concentradoStock.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin existencia registrada todavía.</p>
        ) : (
          <div className="table-wrap">
            <table>
            <thead>
              <tr><th>Tipo</th><th>Existencia (qq)</th><th>Nivel mínimo</th><th>Estado</th>{esAdmin && <th>Editar mínimo</th>}</tr>
            </thead>
            <tbody>
              {concentradoStock.map((c) => (
                <tr key={c.id_stock}>
                  <td data-label="Tipo">{c.tipo_concentrado}</td>
                  <td data-label="Existencia (qq)">{c.existencia_actual}</td>
                  <td data-label="Nivel mínimo">{c.nivel_minimo}</td>
                  <td data-label="Estado">
                    <span className={`tag ${Number(c.existencia_actual) < Number(c.nivel_minimo) && Number(c.nivel_minimo) > 0 ? 'low' : 'ok'}`}>
                      {Number(c.existencia_actual) < Number(c.nivel_minimo) && Number(c.nivel_minimo) > 0 ? 'bajo mínimo' : 'normal'}
                    </span>
                  </td>
                  {esAdmin && (
                    <td data-label="Editar mínimo">
                      {editandoMinimoId === c.id_stock ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input type="number" step="0.01" value={minimoTemporal} onChange={(e) => setMinimoTemporal(e.target.value)}
                            style={{ ...estiloClaro, width: '70px', fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }} />
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => handleGuardarMinimo(c.id_stock)}>Guardar</button>
                        </div>
                      ) : (
                        <button
                          style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                          onClick={() => { setEditandoMinimoId(c.id_stock); setMinimoTemporal(c.nivel_minimo); }}
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
            </div>
        )}
      </section>

      {/* ---- Existencia de huevos por tamaño ---- */}
      <section className="card">
        <div className="head">
          <h2>Existencia de huevos por tamaño</h2>
          <span className="sub">{huevosStock.length} tamaños</span>
        </div>
        {huevosStock.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin existencia registrada todavía.</p>
        ) : (
          <div className="table-wrap">
            <table>
            <thead>
              <tr><th>Tamaño</th><th>Existencia</th><th>Nivel mínimo</th><th>Estado</th>{esAdmin && <th>Editar mínimo</th>}</tr>
            </thead>
            <tbody>
              {huevosStock.map((h) => (
                <tr key={h.id_stock}>
                  <td data-label="Tamaño">{h.clasificacion}</td>
                  <td data-label="Existencia">{h.existencia_actual}</td>
                  <td data-label="Nivel mínimo">{h.nivel_minimo}</td>
                  <td data-label="Estado">
                    <span className={`tag ${Number(h.existencia_actual) < Number(h.nivel_minimo) && Number(h.nivel_minimo) > 0 ? 'low' : 'ok'}`}>
                      {Number(h.existencia_actual) < Number(h.nivel_minimo) && Number(h.nivel_minimo) > 0 ? 'bajo mínimo' : 'normal'}
                    </span>
                  </td>
                  {esAdmin && (
                    <td data-label="Editar mínimo">
                      {editandoMinimoHuevoId === h.id_stock ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input type="number" value={minimoHuevoTemporal} onChange={(e) => setMinimoHuevoTemporal(e.target.value)}
                            style={{ ...estiloClaro, width: '70px', fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }} />
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => handleGuardarMinimoHuevo(h.id_stock)}>Guardar</button>
                        </div>
                      ) : (
                        <button
                          style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                          onClick={() => { setEditandoMinimoHuevoId(h.id_stock); setMinimoHuevoTemporal(h.nivel_minimo); }}
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
            </div>
        )}
      </section>

      {/* ---- Existencia de medicamentos ---- */}
      <section className="card">
        <div className="head">
          <h2>Existencia de medicamentos</h2>
          <span className="sub">{medicamentos.length} artículos</span>
        </div>
        {medicamentos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin medicamentos registrados todavía.</p>
        ) : (
          <div className="table-wrap">
            <table>
            <thead>
              <tr><th>Nombre</th><th>Existencia</th><th>Nivel mínimo</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {medicamentos.map((m) => (
                <tr key={m.id_medicamento}>
                  <td data-label="Nombre">{m.nombre}</td>
                  <td data-label="Existencia">{m.existencia_actual} {m.unidad_medida}</td>
                  <td data-label="Nivel mínimo">{m.nivel_minimo} {m.unidad_medida}</td>
                  <td data-label="Estado">
                    <span className={`tag ${Number(m.existencia_actual) < Number(m.nivel_minimo) ? 'low' : 'ok'}`}>
                      {Number(m.existencia_actual) < Number(m.nivel_minimo) ? 'bajo mínimo' : 'normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
        )}
      </section>

      {/* ---- Historiales (solo administrador) ---- */}
      {esAdmin && (
        <div className="grid-2col">
          <section className="card">
            <div className="head">
              <h2>Historial de consumo de concentrado</h2>
              <span className="sub">Últimos 30</span>
            </div>
            {concentradoConsumo.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin registros todavía.</p>
            ) : (
              <div className="table-wrap">
            <table>
                <thead>
                  <tr><th>Fecha</th><th>Tipo</th><th>Cant. (qq)</th></tr>
                </thead>
                <tbody>
                  {concentradoConsumo.map((c) => (
                    <tr key={c.id_consumo}>
                      <td data-label="Fecha">{c.fecha?.slice(0, 10)}</td>
                      <td data-label="Tipo">{c.tipo_concentrado}</td>
                      <td data-label="Cant. (qq)">{c.cantidad_qq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>

          <section className="card">
            <div className="head">
              <h2>Historial de movimientos de medicamento</h2>
              <span className="sub">Últimos 30</span>
            </div>
            {movimientos.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin registros todavía.</p>
            ) : (
              <div className="table-wrap">
            <table>
                <thead>
                  <tr><th>Fecha</th><th>Medicamento</th><th>Tipo</th><th>Cantidad</th></tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id_movimiento}>
                      <td data-label="Fecha">{m.fecha?.slice(0, 10)}</td>
                      <td data-label="Medicamento">{m.medicamento_nombre}</td>
                      <td data-label="Tipo"><span className={`tag ${m.tipo_movimiento === 'entrada' ? 'ok' : 'pend'}`}>{m.tipo_movimiento}</span></td>
                      <td data-label="Cantidad">{m.cantidad} {m.unidad_medida}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        </div>
      )}

      {esAdmin && concentrado.length > 0 && (
        <section className="card">
          <div className="head">
            <h2>Historial de compras de concentrado</h2>
            <span className="sub">Últimas 30</span>
          </div>
          <div className="table-wrap">
            <table>
            <thead>
              <tr><th>Fecha</th><th>Tipo</th><th>Cant. (qq)</th><th>Total</th></tr>
            </thead>
            <tbody>
              {concentrado.map((c) => (
                <tr key={c.id_concentrado}>
                  <td data-label="Fecha">{c.fecha?.slice(0, 10)}</td>
                  <td data-label="Tipo">{c.tipo_concentrado}</td>
                  <td data-label="Cant. (qq)">{c.cantidad_qq}</td>
                  <td data-label="Total">Q {Number(c.total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
        </section>
      )}

      {esAdmin && huevosClasificados.length > 0 && (
        <section className="card">
          <div className="head">
            <h2>Historial de clasificación de huevos</h2>
            <span className="sub">Últimos 30</span>
          </div>
          <div className="table-wrap">
            <table>
            <thead>
              <tr><th>Fecha</th><th>Tamaño</th><th>Cantidad</th></tr>
            </thead>
            <tbody>
              {huevosClasificados.map((h) => (
                <tr key={h.id_registro}>
                  <td data-label="Fecha">{h.fecha?.slice(0, 10)}</td>
                  <td data-label="Tamaño">{h.clasificacion}</td>
                  <td data-label="Cantidad">{h.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
        </section>
      )}
    </>
  );
}

export default Inventario;