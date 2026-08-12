import { useState, useEffect } from 'react';
import api from '../api/api';

const hoy = () => new Date().toISOString().slice(0, 10);
const estiloClaro = { background: '#F5F1E6', color: '#232019', colorScheme: 'light' };

function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [total, setTotal] = useState(0);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [form, setForm] = useState({ fecha: hoy(), descripcion: '', monto: '' });

  const cargarTodo = async () => {
    try {
      const respuesta = await api.get('/gastos');
      setGastos(respuesta.data.gastos);
      setTotal(respuesta.data.total);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de gastos');
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

  const handleRegistrar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/gastos', { ...form, monto: parseFloat(form.monto) });
      setForm({ fecha: hoy(), descripcion: '', monto: '' });
      mostrarMensaje('Gasto registrado correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar el gasto');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      await api.delete(`/gastos/${id}`);
      mostrarMensaje('Gasto eliminado');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo eliminar el gasto');
    }
  };

  const q = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      <div className="kpi-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="kpi">
          <div className="label">Total en gastos registrados</div>
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
          <div className="field" style={{ flex: 1, minWidth: '220px' }}>
            <label>Descripción</label>
            <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="ej. Reparación de bomba de agua" required style={estiloClaro} />
          </div>
          <div className="field">
            <label>Monto (Q)</label>
            <input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required style={estiloClaro} />
          </div>
          <button type="submit" className="btn gold">Registrar gasto</button>
        </form>
      </section>

      <section className="card">
        <div className="head">
          <h2>Historial de gastos</h2>
          <span className="sub">Últimos 50</span>
        </div>
        {gastos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin gastos registrados todavía.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Fecha</th><th>Descripción</th><th>Monto</th><th></th></tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id_gasto}>
                  <td>{g.fecha?.slice(0, 10)}</td>
                  <td>{g.descripcion}</td>
                  <td>{q(g.monto)}</td>
                  <td>
                    <button
                      style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--red)', textDecoration: 'underline', padding: 0 }}
                      onClick={() => handleEliminar(g.id_gasto)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default Gastos;