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

  const [formPago, setFormPago] = useState({ id_trabajador: '', semana_inicio: '', semana_fin: '', dias_laborados: '' });

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

  const trabajadoresActivos = trabajadores.filter((t) => t.estado === 'activo');

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
      });
      setFormPago({ id_trabajador: '', semana_inicio: '', semana_fin: '', dias_laborados: '' });
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
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario vinculado</th>
                <th>Costo por día</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => (
                <tr key={t.id_trabajador}>
                  <td>{t.nombre}</td>
                  <td>{t.usuario_vinculado || <span style={{ color: 'var(--ink-soft)' }}>—</span>}</td>
                  <td>
                    {editandoCostoId === t.id_trabajador ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="number" step="0.01" value={costoTemporal}
                          onChange={(e) => setCostoTemporal(e.target.value)}
                          style={{ ...estiloClaro, width: '80px', fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }}
                        />
                        <button className="btn" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => handleGuardarCosto(t.id_trabajador)}>Guardar</button>
                        <button style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--ink-soft)' }} onClick={() => setEditandoCostoId(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <span>
                        {q(t.costo_dia)}{' '}
                        <button
                          style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--navy)', textDecoration: 'underline', padding: 0, marginLeft: '4px' }}
                          onClick={() => { setEditandoCostoId(t.id_trabajador); setCostoTemporal(t.costo_dia); }}
                        >
                          editar
                        </button>
                      </span>
                    )}
                  </td>
                  <td><span className={`tag ${t.estado === 'activo' ? 'ok' : 'low'}`}>{t.estado}</span></td>
                  <td>
                    <button
                      style={{ background: 'transparent', border: 'none', fontSize: '12px', color: t.estado === 'activo' ? 'var(--red)' : 'var(--green)', textDecoration: 'underline', padding: 0 }}
                      onClick={() => handleCambiarEstado(t.id_trabajador, t.estado)}
                    >
                      {t.estado === 'activo' ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <select value={formPago.id_trabajador} onChange={(e) => setFormPago({ ...formPago, id_trabajador: e.target.value })} required style={estiloClaro}>
                <option value="">Selecciona...</option>
                {trabajadoresActivos.map((t) => (
                  <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre} ({q(t.costo_dia)}/día)</option>
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
              <tr><th>Trabajador</th><th>Semana</th><th>Días</th><th>Costo/día</th><th>Total</th></tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id_pago}>
                  <td>{p.trabajador_nombre}</td>
                  <td>{p.semana_inicio?.slice(0, 10)} — {p.semana_fin?.slice(0, 10)}</td>
                  <td>{p.dias_laborados}</td>
                  <td>{q(p.costo_dia_registrado)}</td>
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