import { useState, useEffect } from 'react';
import api from '../api/api';

const estiloClaro = { background: '#F5F1E6', color: '#232019', colorScheme: 'light' };

function Personal() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [pagos, setPagos] = useState([]);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [editandoCostoId, setEditandoCostoId] = useState(null);
  const [costoTemporal, setCostoTemporal] = useState('');

  const [formPago, setFormPago] = useState({ id_trabajador: '', semana_inicio: '', semana_fin: '', dias_laborados: '', costo_dia_pago: '', horas_extra: '', costo_hora_extra: '' });

  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);

  const cargarTodo = async () => {
    try {
      const [rTrabajadores, rPagos] = await Promise.all([
        api.get('/personal/trabajadores'),
        api.get('/personal/pagos'),
      ]);
      setTrabajadores(rTrabajadores.data);
      setPagos(rPagos.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de personal');
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

  const trabajadoresActivos = trabajadores.filter((t) => t.estado === 'activo');

  useEffect(() => {
    if (trabajadores.length === 0) return;
    if (!trabajadorSeleccionado || !trabajadores.some((t) => t.id_trabajador === trabajadorSeleccionado)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrabajadorSeleccionado(trabajadores[0].id_trabajador);
    }
  }, [trabajadores, trabajadorSeleccionado]);

  const trabajador = trabajadores.find((t) => t.id_trabajador === trabajadorSeleccionado) || null;
  const pagosDelTrabajador = trabajador ? pagos.filter((p) => p.id_trabajador === trabajador.id_trabajador) : [];
  const ultimoPago = pagosDelTrabajador[0] || null;

  const handleGuardarCosto = async (id) => {
    try {
      await api.put(`/personal/trabajadores/${id}`, { costo_dia: parseFloat(costoTemporal) });
      setEditandoCostoId(null);
      mostrarMensaje('Costo por día actualizado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el costo');
    }
  };

  const handleCambiarEstado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await api.put(`/personal/trabajadores/${id}`, { estado: nuevoEstado });
      mostrarMensaje('Estado actualizado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el estado');
    }
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    try {
      await api.post('/personal/pagos', {
        ...formPago,
        dias_laborados: parseInt(formPago.dias_laborados),
        costo_dia_pago: formPago.costo_dia_pago ? parseFloat(formPago.costo_dia_pago) : null,
        horas_extra: formPago.horas_extra ? parseInt(formPago.horas_extra) : 0,
        costo_hora_extra: formPago.costo_hora_extra ? parseFloat(formPago.costo_hora_extra) : 0,
      });
      setFormPago({ id_trabajador: '', semana_inicio: '', semana_fin: '', dias_laborados: '', costo_dia_pago: '', horas_extra: '', costo_hora_extra: '' });
      mostrarMensaje('Pago registrado correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar el pago');
    }
  };

  const q = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      <section className="card">
        <div className="head">
          <h2>Trabajadores</h2>
          <span className="sub">{trabajadores.length} registrados</span>
        </div>

        {trabajadores.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            Aún no hay trabajadores. Se crean automáticamente al dar de alta un usuario operador en el módulo de Usuarios.
          </p>
        ) : (
          <>
            <div className="lote-cards">
              {trabajadores.map((t) => (
                <button
                  key={t.id_trabajador}
                  className={`lote-card ${trabajadorSeleccionado === t.id_trabajador ? 'selected' : ''}`}
                  onClick={() => setTrabajadorSeleccionado(t.id_trabajador)}
                >
                  <div className="lc-icon">👤</div>
                  <div className="lc-name">{t.nombre}</div>
                  <div className="lc-meta">{q(t.costo_dia)} / día</div>
                  <span className={`tag lc-tag ${t.estado === 'activo' ? 'ok' : 'low'}`}>{t.estado}</span>
                </button>
              ))}
            </div>

            {trabajador && (
              <div className="lote-detail">
                <div className="head">
                  <h3>{trabajador.nombre}</h3>
                  <span className="sub">{trabajador.usuario_vinculado ? `Usuario: ${trabajador.usuario_vinculado}` : 'Sin usuario vinculado'}</span>
                </div>
                <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="kpi">
                    <div className="label">Costo por día</div>
                    {editandoCostoId === trabajador.id_trabajador ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                        <input
                          type="number" step="0.01" value={costoTemporal}
                          onChange={(e) => setCostoTemporal(e.target.value)}
                          style={{ ...estiloClaro, width: '80px', fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }}
                        />
                        <button className="btn" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => handleGuardarCosto(trabajador.id_trabajador)}>Guardar</button>
                        <button style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--ink-soft)' }} onClick={() => setEditandoCostoId(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <div className="value">{q(trabajador.costo_dia)}</div>
                        <div className="delta">
                          <button
                            style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                            onClick={() => { setEditandoCostoId(trabajador.id_trabajador); setCostoTemporal(trabajador.costo_dia); }}
                          >
                            editar costo
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="kpi">
                    <div className="label">Último pago</div>
                    <div className="value">{ultimoPago ? q(ultimoPago.total_pagar) : '—'}</div>
                    <div className="delta">{ultimoPago ? `semana ${ultimoPago.semana_fin?.slice(0, 10)}` : 'Sin pagos registrados'}</div>
                  </div>
                  <div className="kpi">
                    <div className="label">Días pagados (último)</div>
                    <div className="value">{ultimoPago ? ultimoPago.dias_laborados : '—'}</div>
                    <div className="delta">{ultimoPago ? `a ${q(ultimoPago.costo_dia_registrado)}/día` : ''}</div>
                  </div>
                  <div className="kpi">
                    <div className="label">Horas extra (último pago)</div>
                    <div className="value">{ultimoPago?.horas_extra > 0 ? ultimoPago.horas_extra : '—'}</div>
                    <div className="delta">{ultimoPago?.horas_extra > 0 ? `a ${q(ultimoPago.costo_hora_extra)}/hora` : 'Sin horas extra'}</div>
                  </div>
                </div>
                <button
                  className="btn"
                  style={{
                    background: 'transparent',
                    color: trabajador.estado === 'activo' ? 'var(--red)' : 'var(--green)',
                    border: `1px solid ${trabajador.estado === 'activo' ? 'var(--red-light)' : 'var(--green-light)'}`,
                    marginTop: '4px',
                  }}
                  onClick={() => handleCambiarEstado(trabajador.id_trabajador, trabajador.estado)}
                >
                  {trabajador.estado === 'activo' ? 'Desactivar trabajador' : 'Reactivar trabajador'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card">
        <div className="head"><h2>Registrar pago semanal</h2></div>
        {trabajadoresActivos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>No hay trabajadores activos disponibles.</p>
        ) : (
          <form onSubmit={handleRegistrarPago} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field">
              <label>Trabajador</label>
              <select
                value={formPago.id_trabajador}
                onChange={(e) => {
                  const trabajadorElegido = trabajadoresActivos.find((t) => String(t.id_trabajador) === e.target.value);
                  setFormPago({
                    ...formPago,
                    id_trabajador: e.target.value,
                    costo_dia_pago: trabajadorElegido ? trabajadorElegido.costo_dia : '',
                  });
                }}
                required
                style={estiloClaro}
              >
                <option value="">Selecciona...</option>
                {trabajadoresActivos.map((t) => (
                  <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Semana inicio</label>
              <input type="date" value={formPago.semana_inicio} onChange={(e) => setFormPago({ ...formPago, semana_inicio: e.target.value })} required style={estiloClaro} />
            </div>
            <div className="field">
              <label>Semana fin</label>
              <input type="date" value={formPago.semana_fin} onChange={(e) => setFormPago({ ...formPago, semana_fin: e.target.value })} required style={estiloClaro} />
            </div>
            <div className="field">
              <label>Días laborados</label>
              <input type="number" min="0" max="7" value={formPago.dias_laborados} onChange={(e) => setFormPago({ ...formPago, dias_laborados: e.target.value })} required style={estiloClaro} />
            </div>
            <div className="field">
              <label>Costo por día a pagar (Q)</label>
              <input
                type="number" step="0.01" min="0.01"
                value={formPago.costo_dia_pago}
                onChange={(e) => setFormPago({ ...formPago, costo_dia_pago: e.target.value })}
                placeholder="ej. 75.00"
                required
                style={estiloClaro}
              />
            </div>
            <div className="field">
              <label>Horas extra (opcional)</label>
              <input
                type="number" min="0"
                value={formPago.horas_extra}
                onChange={(e) => setFormPago({ ...formPago, horas_extra: e.target.value })}
                placeholder="ej. 5"
                style={estiloClaro}
              />
            </div>
            <div className="field">
              <label>Costo por hora extra (Q)</label>
              <input
                type="number" step="0.01" min="0"
                value={formPago.costo_hora_extra}
                onChange={(e) => setFormPago({ ...formPago, costo_hora_extra: e.target.value })}
                placeholder="ej. 15.00"
                disabled={!formPago.horas_extra}
                style={estiloClaro}
              />
            </div>
            <button type="submit" className="btn gold">Registrar pago</button>
          </form>
        )}
      </section>

      <section className="card">
        <div className="head">
          <h2>Historial de pagos</h2>
          <span className="sub">Últimos 30</span>
        </div>
        {pagos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin pagos registrados todavía.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Trabajador</th><th>Semana</th><th>Días</th><th>Costo/día</th><th>Horas extra</th><th>Total</th></tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id_pago}>
                  <td>{p.trabajador_nombre}</td>
                  <td>{p.semana_inicio?.slice(0, 10)} — {p.semana_fin?.slice(0, 10)}</td>
                  <td>{p.dias_laborados}</td>
                  <td>{q(p.costo_dia_registrado)}</td>
                  <td>{p.horas_extra > 0 ? `${p.horas_extra} h × ${q(p.costo_hora_extra)}` : '—'}</td>
                  <td>{q(p.total_pagar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default Personal;