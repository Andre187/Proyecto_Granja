import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/api';

const LABELS = { hoy: 'Hoy', semana: 'Últimos 7 días', mes: 'Este mes', personalizado: 'Personalizado' };

function eggClass(pct, idx) {
  const filled = Math.round((pct / 100) * 7);
  if (idx < filled - 1) return 'full';
  if (idx === filled - 1 || idx === filled) return 'mid';
  return '';
}

function Panel({ usuario }) {
  const esAdmin = usuario.rol === 'administrador';
  const [periodo, setPeriodo] = useState('semana');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [misTareas, setMisTareas] = useState([]);
  const [cargandoTareas, setCargandoTareas] = useState(true);
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const cargar = async (p) => {
    try {
      setCargando(true);
      const respuesta = await api.get(`/reportes/resumen?periodo=${p}`);
      setDatos(respuesta.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const cargarPersonalizado = async () => {
    if (!fechaDesde || !fechaHasta) return;
    try {
      setCargando(true);
      const respuesta = await api.get(`/reportes/resumen?desde=${fechaDesde}&hasta=${fechaHasta}`);
      setDatos(respuesta.data);
      setPeriodo('personalizado');
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (esAdmin && periodo !== 'personalizado') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargar(periodo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  useEffect(() => {
    if (!esAdmin) {
       
      (async () => {
        try {
          const respuesta = await api.get('/tareas/tareas');
          setMisTareas(respuesta.data.filter((t) => t.estado !== 'finalizado'));
        } catch (err) {
          console.error(err);
        } finally {
          setCargandoTareas(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
  const fechaCorta = (f) => f?.slice(5, 10).split('-').reverse().join('/');

  if (!esAdmin) {
    return (
      <section className="card">
        <div className="head">
          <h2>Tus tareas pendientes</h2>
          <span className="sub">Gestiónalas en el módulo Tareas</span>
        </div>
        {cargandoTareas ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Cargando...</p>
        ) : misTareas.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>¡No tienes tareas pendientes! 🎉</p>
        ) : (
          <div className="task-list">
            {misTareas.map((t, i) => (
              <div key={t.id_tarea} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0', borderBottom: i < misTareas.length - 1 ? '1px solid var(--line)' : 'none', gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '13px' }}>
                    {t.descripcion}
                    {t.galera_nombre && (
                      <span style={{
                        marginLeft: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--navy)',
                        background: 'var(--green-light)', padding: '2px 8px', borderRadius: '999px'
                      }}>
                        📍 {t.galera_nombre}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                    Asignada: {t.fecha_asignacion?.slice(0, 10)}
                    {t.fecha_limite && ` · Vence: ${t.fecha_limite.slice(0, 10)}`}
                  </div>
                </div>
                <span className={`status-pill ${t.estado}`}>{t.estado}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {mostrarPersonalizado && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
              style={{ fontSize: '12px', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: '6px', background: '#F5F1E6', colorScheme: 'light' }} />
            <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>a</span>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
              style={{ fontSize: '12px', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: '6px', background: '#F5F1E6', colorScheme: 'light' }} />
            <button className="btn" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={cargarPersonalizado}>Ver</button>
          </div>
        )}
        <div className="period-tabs">
          {['hoy', 'semana', 'mes'].map((p) => (
            <button key={p} className={periodo === p ? 'active' : ''} onClick={() => { setPeriodo(p); setMostrarPersonalizado(false); }}>
              {LABELS[p]}
            </button>
          ))}
          <button className={periodo === 'personalizado' ? 'active' : ''} onClick={() => setMostrarPersonalizado(!mostrarPersonalizado)}>
            Personalizado
          </button>
        </div>
      </div>

      {cargando || !datos ? (
        <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Cargando...</p>
      ) : (
        <>
          <div className="kpi-row">
            <div className="kpi">
              <div className="label">Huevos ({LABELS[periodo].toLowerCase()})</div>
              <div className="value">{datos.kpis.huevos.toLocaleString()}</div>
              <div className="delta up">{datos.kpis.tasa_prom}% tasa promedio</div>
            </div>
            <div className="kpi">
              <div className="label">Mortalidad ({LABELS[periodo].toLowerCase()})</div>
              <div className="value">{datos.kpis.mortalidad}</div>
            </div>
            <div className="kpi">
              <div className="label">Ventas ({LABELS[periodo].toLowerCase()})</div>
              <div className="value">{q(datos.kpis.total_ventas)}</div>
              <div className="delta up">{datos.kpis.num_ventas} transacciones</div>
            </div>
            <div className="kpi">
              <div className="label">Cuentas por cobrar</div>
              <div className="value">{q(datos.kpis.cuentas_por_cobrar)}</div>
              <div className="delta warn">{datos.kpis.clientes_con_saldo} clientes con saldo</div>
            </div>
          </div>

          <div className="grid-2col">
            <section className="card">
              <div className="head"><h2>Huevos por día</h2></div>
              <div className="chart-box">
                <ResponsiveContainer>
                  <BarChart data={datos.postura_por_dia.map(d => ({ fecha: fechaCorta(d.fecha), huevos: d.huevos }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="fecha" fontSize={11} stroke="var(--ink-soft)" />
                    <YAxis fontSize={11} stroke="var(--ink-soft)" />
                    <Tooltip />
                    <Bar dataKey="huevos" fill="var(--gold)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card">
              <div className="head"><h2>Ventas por día (Q)</h2></div>
              <div className="chart-box">
                <ResponsiveContainer>
                  <LineChart data={datos.ventas_por_dia.map(d => ({ fecha: fechaCorta(d.fecha), monto: d.monto }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="fecha" fontSize={11} stroke="var(--ink-soft)" />
                    <YAxis fontSize={11} stroke="var(--ink-soft)" />
                    <Tooltip formatter={(v) => q(v)} />
                    <Line type="monotone" dataKey="monto" stroke="var(--navy)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="card">
            <div className="head">
              <h2>Postura por galera</h2>
              <span className="sub">{LABELS[periodo]}</span>
            </div>
            {datos.postura_por_galera.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>No hay lotes activos todavía.</p>
            ) : (
              <>
                <div className="carton">
                  {datos.postura_por_galera.map((l) => (
                    <div className="carton-row" key={l.galera}>
                      <span className="gname">{l.galera}</span>
                      <div className="eggs">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <span key={i} className={`egg ${eggClass(l.tasa, i)}`}></span>
                        ))}
                      </div>
                      <span className="rate">{l.tasa}% tasa postura · {l.huevos} huevos</span>
                    </div>
                  ))}
                </div>
                <div className="carton-legend">
                  <span><span className="sw" style={{ background: 'var(--gold)' }}></span>Buena postura</span>
                  <span><span className="sw" style={{ background: 'var(--gold-light)' }}></span>Postura media</span>
                  <span><span className="sw" style={{ background: 'var(--green-light)' }}></span>Sin registrar / baja</span>
                </div>
              </>
            )}
          </section>

          <div className="grid-2col-wide">
            <section className="card">
              <div className="head">
                <h2>Ventas recientes</h2>
                <span className="sub">{LABELS[periodo]}</span>
              </div>
              {datos.ventas_recientes.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin ventas en este período.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {datos.ventas_recientes.map((v) => (
                      <tr key={v.id_venta}>
                        <td>{v.cliente_nombre}</td>
                        <td>{v.fecha?.slice(0, 10)}</td>
                        <td>{q(v.monto_total)}</td>
                        <td><span className={`tag ${v.estado === 'cancelado' ? 'ok' : 'pend'}`}>{v.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card">
              <div className="head"><h2>Alertas de inventario</h2></div>
              {datos.alertas.medicamentos.length === 0 && datos.alertas.concentrado.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin alertas por el momento.</p>
              ) : (
                <div className="alert-list">
                  {datos.alertas.medicamentos.map((m, i) => (
                    <div className="alert" key={`m${i}`}>
                      <span className="a-mark">!</span>
                      <div>
                        <div className="a-title">{m.nombre} bajo mínimo</div>
                        <div className="a-sub">Existencia: {m.existencia_actual} {m.unidad_medida} · Mínimo: {m.nivel_minimo} {m.unidad_medida}</div>
                      </div>
                    </div>
                  ))}
                  {datos.alertas.concentrado.map((c, i) => (
                    <div className="alert" key={`c${i}`}>
                      <span className="a-mark">!</span>
                      <div>
                        <div className="a-title">Concentrado {c.tipo_concentrado} bajo mínimo</div>
                        <div className="a-sub">Existencia: {c.existencia_actual} qq · Mínimo: {c.nivel_minimo} qq</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

export default Panel;