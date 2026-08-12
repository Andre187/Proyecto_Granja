import { useState, useEffect } from 'react';
import api from '../api/api';

const hoy = () => new Date().toISOString().slice(0, 10);

function Sanidad() {
  const [lotes, setLotes] = useState([]);
  const [vacunaciones, setVacunaciones] = useState([]);
  const [pesos, setPesos] = useState([]);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [formVacuna, setFormVacuna] = useState({ id_lote: '', fecha: hoy(), tipo_vacuna: '', semana_aplicacion: '' });
  const [formPeso, setFormPeso] = useState({ id_lote: '', fecha: hoy(), semana: '', peso_promedio: '', uniformidad: '' });

  const cargarTodo = async () => {
    try {
      const [rLotes, rVacunas, rPesos] = await Promise.all([
        api.get('/sanidad/lotes'),
        api.get('/sanidad/vacunacion'),
        api.get('/sanidad/peso'),
      ]);
      setLotes(rLotes.data);
      setVacunaciones(rVacunas.data);
      setPesos(rPesos.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de sanidad');
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

  const handleRegistrarVacuna = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sanidad/vacunacion', {
        ...formVacuna,
        semana_aplicacion: parseInt(formVacuna.semana_aplicacion),
      });
      setFormVacuna({ id_lote: '', fecha: hoy(), tipo_vacuna: '', semana_aplicacion: '' });
      mostrarMensaje('Vacunación registrada correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar la vacunación');
    }
  };

  const handleRegistrarPeso = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sanidad/peso', {
        ...formPeso,
        semana: parseInt(formPeso.semana),
        peso_promedio: parseFloat(formPeso.peso_promedio),
        uniformidad: parseFloat(formPeso.uniformidad),
      });
      setFormPeso({ id_lote: '', fecha: hoy(), semana: '', peso_promedio: '', uniformidad: '' });
      mostrarMensaje('Seguimiento de peso registrado correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar el seguimiento de peso');
    }
  };

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      {lotes.length === 0 && (
        <section className="card">
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            No hay lotes activos todavía. Ve al módulo de Producción para crear una galera y un lote primero.
          </p>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <section className="card">
          <div className="head"><h2>Registrar vacunación</h2></div>
          <form onSubmit={handleRegistrarVacuna} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="field">
              <label>Lote</label>
              <select value={formVacuna.id_lote} onChange={(e) => setFormVacuna({ ...formVacuna, id_lote: e.target.value })} required>
                <option value="">Selecciona un lote...</option>
                {lotes.map((l) => (
                  <option key={l.id_lote} value={l.id_lote}>{l.galera_nombre}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={formVacuna.fecha} onChange={(e) => setFormVacuna({ ...formVacuna, fecha: e.target.value })} required />
            </div>
            <div className="field">
              <label>Tipo de vacuna</label>
              <input value={formVacuna.tipo_vacuna} onChange={(e) => setFormVacuna({ ...formVacuna, tipo_vacuna: e.target.value })} placeholder="ej. Newcastle" required />
            </div>
            <div className="field">
              <label>Semana de aplicación</label>
              <input type="number" value={formVacuna.semana_aplicacion} onChange={(e) => setFormVacuna({ ...formVacuna, semana_aplicacion: e.target.value })} required />
            </div>
            <button type="submit" className="btn gold">Registrar vacunación</button>
          </form>
        </section>

        <section className="card">
          <div className="head"><h2>Registrar seguimiento de peso</h2></div>
          <form onSubmit={handleRegistrarPeso} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="field">
              <label>Lote</label>
              <select value={formPeso.id_lote} onChange={(e) => setFormPeso({ ...formPeso, id_lote: e.target.value })} required>
                <option value="">Selecciona un lote...</option>
                {lotes.map((l) => (
                  <option key={l.id_lote} value={l.id_lote}>{l.galera_nombre}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={formPeso.fecha} onChange={(e) => setFormPeso({ ...formPeso, fecha: e.target.value })} required />
            </div>
            <div className="field">
              <label>Semana</label>
              <input type="number" value={formPeso.semana} onChange={(e) => setFormPeso({ ...formPeso, semana: e.target.value })} required />
            </div>
            <div className="field">
              <label>Peso promedio (kg)</label>
              <input type="number" step="0.01" value={formPeso.peso_promedio} onChange={(e) => setFormPeso({ ...formPeso, peso_promedio: e.target.value })} required />
            </div>
            <div className="field">
              <label>Uniformidad (%)</label>
              <input type="number" step="0.1" value={formPeso.uniformidad} onChange={(e) => setFormPeso({ ...formPeso, uniformidad: e.target.value })} required />
            </div>
            <button type="submit" className="btn" style={{ background: 'var(--green)' }}>Registrar peso</button>
          </form>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <section className="card">
          <div className="head">
            <h2>Historial de vacunación</h2>
            <span className="sub">Últimos 20 registros</span>
          </div>
          <table>
            <thead>
              <tr><th>Galera</th><th>Fecha</th><th>Vacuna</th><th>Semana</th></tr>
            </thead>
            <tbody>
              {vacunaciones.map((v) => (
                <tr key={v.id_vacunacion}>
                  <td>{v.galera_nombre}</td>
                  <td>{v.fecha?.slice(0, 10)}</td>
                  <td>{v.tipo_vacuna}</td>
                  <td>{v.semana_aplicacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="head">
            <h2>Historial de peso</h2>
            <span className="sub">Últimos 20 registros</span>
          </div>
          <table>
            <thead>
              <tr><th>Galera</th><th>Semana</th><th>Peso (kg)</th><th>Uniformidad</th></tr>
            </thead>
            <tbody>
              {pesos.map((p) => (
                <tr key={p.id_seguimiento}>
                  <td>{p.galera_nombre}</td>
                  <td>{p.semana}</td>
                  <td>{p.peso_promedio}</td>
                  <td>{p.uniformidad}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

export default Sanidad;