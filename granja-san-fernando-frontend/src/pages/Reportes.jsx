import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/api';

const LABELS = { hoy: 'Hoy', semana: 'Últimos 7 días', mes: 'Este mes', personalizado: 'Personalizado' };

function eggClass(pct, idx) {
  const filled = Math.round((pct / 100) * 7);
  if (idx < filled - 1) return 'full';
  if (idx === filled - 1 || idx === filled) return 'mid';
  return '';
}

function Reportes() {
  const [periodo, setPeriodo] = useState('hoy');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pestana, setPestana] = useState('resumen');

  const cargar = async (p) => {
    try {
      setCargando(true);
      const respuesta = await api.get(`/reportes/financiero?periodo=${p}`);
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
      const respuesta = await api.get(`/reportes/financiero?desde=${fechaDesde}&hasta=${fechaHasta}`);
      setDatos(respuesta.data);
      setPeriodo('personalizado');
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (periodo !== 'personalizado') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargar(periodo);
    }
   
  }, [periodo]);

  const q = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
  const fechaCorta = (f) => f?.slice(5, 10).split('-').reverse().join('/');

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
              <div className="label">Ingresos ({LABELS[periodo].toLowerCase()})</div>
              <div className="value">{q(datos.ingresos_total)}</div>
              <div className="delta up">ventas del período</div>
            </div>
            <div className="kpi">
              <div className="label">Egresos ({LABELS[periodo].toLowerCase()})</div>
              <div className="value">{q(datos.egresos_total)}</div>
              <div className="delta warn">gastos + insumos + personal</div>
            </div>
            <div className="kpi">
              <div className="label">Utilidad neta</div>
              <div className="value" style={{ color: datos.utilidad >= 0 ? 'var(--green)' : 'var(--red)' }}>{q(datos.utilidad)}</div>
              <div className={`delta ${datos.utilidad >= 0 ? 'up' : 'warn'}`}>{datos.utilidad >= 0 ? 'ganancia' : 'pérdida'}</div>
            </div>
            <div className="kpi">
              <div className="label">Huevos producidos</div>
              <div className="value">{datos.produccion.huevos.toLocaleString()}</div>
              <div className="delta up">{datos.produccion.tasa_prom}% tasa promedio</div>
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <div className="period-tabs" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
              <button className={pestana === 'resumen' ? 'active' : ''} onClick={() => setPestana('resumen')}>Resumen</button>
              <button className={pestana === 'ventas' ? 'active' : ''} onClick={() => setPestana('ventas')}>Ventas</button>
              <button className={pestana === 'gastos' ? 'active' : ''} onClick={() => setPestana('gastos')}>Gastos</button>
              <button className={pestana === 'concentrado' ? 'active' : ''} onClick={() => setPestana('concentrado')}>Concentrado</button>
              <button className={pestana === 'medicamentos' ? 'active' : ''} onClick={() => setPestana('medicamentos')}>Medicamentos</button>
              <button className={pestana === 'personal' ? 'active' : ''} onClick={() => setPestana('personal')}>Personal</button>
            </div>
          </div>

          {pestana === 'resumen' && (
            <>
              <section className="card">
                <div className="head"><h2>Ingresos vs. egresos por día</h2></div>
                <div className="chart-box" style={{ height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={datos.por_dia.map(d => ({ fecha: fechaCorta(d.fecha), Ingresos: d.ingresos, Egresos: d.egresos }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                      <XAxis dataKey="fecha" fontSize={11} stroke="var(--ink-soft)" />
                      <YAxis fontSize={11} stroke="var(--ink-soft)" />
                      <Tooltip formatter={(v) => q(v)} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="Ingresos" fill="var(--green)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Egresos" fill="var(--red)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="grid-2col">
                <section className="card">
                  <div className="head"><h2>Desglose de egresos</h2></div>
                  <table>
                    <thead><tr><th>Concepto</th><th>Monto</th></tr></thead>
                    <tbody>
                      <tr><td>Gastos operativos</td><td>{q(datos.desglose_egresos.gastos)}</td></tr>
                      <tr><td>Compras de concentrado</td><td>{q(datos.desglose_egresos.concentrado)}</td></tr>
                      <tr><td>Pagos de personal</td><td>{q(datos.desglose_egresos.personal)}</td></tr>
                      <tr style={{ fontWeight: 600 }}><td>Total</td><td>{q(datos.egresos_total)}</td></tr>
                    </tbody>
                  </table>
                  <p style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '10px' }}>
                    Los pagos de personal se contabilizan según la fecha de fin de semana laboral.
                  </p>
                </section>

                <section className="card">
                  <div className="head">
                    <h2>Postura por galera</h2>
                    <span className="sub">{LABELS[periodo]}</span>
                  </div>
                  {datos.postura_por_galera.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>No hay lotes activos todavía.</p>
                  ) : (
                    <div className="carton">
                      {datos.postura_por_galera.map((l) => (
                        <div className="carton-row" key={l.galera}>
                          <span className="gname">{l.galera}</span>
                          <div className="eggs">
                            {Array.from({ length: 7 }).map((_, i) => (
                              <span key={i} className={`egg ${eggClass(l.tasa, i)}`}></span>
                            ))}
                          </div>
                          <span className="rate">{l.tasa}% · {l.huevos} huevos</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '10px' }}>
                    Mortalidad del período: <b style={{ color: 'var(--ink)' }}>{datos.produccion.mortalidad}</b> aves
                  </p>
                </section>
              </div>
            </>
          )}

          {pestana === 'ventas' && (
            <section className="card">
              <div className="head">
                <h2>Detalle de ventas</h2>
                <span className="sub">{datos.detalle.ventas.length} ventas · {q(datos.ingresos_total)} total</span>
              </div>
              {datos.detalle.ventas.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin ventas en este período.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
                    <tbody>
                      {datos.detalle.ventas.map((v) => (
                        <tr key={v.id_venta}>
                          <td>{v.fecha?.slice(0, 10)}</td>
                          <td>{v.cliente_nombre}</td>
                          <td>{q(v.monto_total)}</td>
                          <td><span className={`tag ${v.estado === 'cancelado' ? 'ok' : 'pend'}`}>{v.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {pestana === 'gastos' && (
            <section className="card">
              <div className="head">
                <h2>Detalle de gastos operativos</h2>
                <span className="sub">{datos.detalle.gastos.length} registros · {q(datos.desglose_egresos.gastos)} total</span>
              </div>
              {datos.detalle.gastos.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin gastos en este período.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th></tr></thead>
                    <tbody>
                      {datos.detalle.gastos.map((g) => (
                        <tr key={g.id_gasto}>
                          <td>{g.fecha?.slice(0, 10)}</td>
                          <td>{g.descripcion}</td>
                          <td>{q(g.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {pestana === 'concentrado' && (
            <section className="card">
              <div className="head">
                <h2>Detalle de compras de concentrado</h2>
                <span className="sub">{datos.detalle.concentrado.length} compras · {q(datos.desglose_egresos.concentrado)} total</span>
              </div>
              {datos.detalle.concentrado.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin compras en este período.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Fecha</th><th>Tipo</th><th>Cant. (qq)</th><th>Costo/qq</th><th>Total</th></tr></thead>
                    <tbody>
                      {datos.detalle.concentrado.map((c) => (
                        <tr key={c.id_concentrado}>
                          <td>{c.fecha?.slice(0, 10)}</td>
                          <td>{c.tipo_concentrado}</td>
                          <td>{c.cantidad_qq}</td>
                          <td>{q(c.costo_unitario)}</td>
                          <td>{q(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {pestana === 'medicamentos' && (
            <section className="card">
              <div className="head">
                <h2>Detalle de movimientos de medicamento</h2>
                <span className="sub">{datos.detalle.medicamentos.length} movimientos</span>
              </div>
              {datos.detalle.medicamentos.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin movimientos en este período.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Fecha</th><th>Medicamento</th><th>Tipo</th><th>Cantidad</th></tr></thead>
                    <tbody>
                      {datos.detalle.medicamentos.map((m) => (
                        <tr key={m.id_movimiento}>
                          <td>{m.fecha?.slice(0, 10)}</td>
                          <td>{m.medicamento_nombre}</td>
                          <td><span className={`tag ${m.tipo_movimiento === 'entrada' ? 'ok' : 'pend'}`}>{m.tipo_movimiento}</span></td>
                          <td>{m.cantidad} {m.unidad_medida}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {pestana === 'personal' && (
            <section className="card">
              <div className="head">
                <h2>Detalle de pagos de personal</h2>
                <span className="sub">{datos.detalle.personal.length} pagos · {q(datos.desglose_egresos.personal)} total</span>
              </div>
              {datos.detalle.personal.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sin pagos en este período.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Trabajador</th><th>Semana</th><th>Días</th><th>Costo/día</th><th>Total</th></tr></thead>
                    <tbody>
                      {datos.detalle.personal.map((p) => (
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
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}

export default Reportes;