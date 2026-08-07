// NOTA: los datos aquí son de ejemplo (igual que en el prototipo).
// Cuando construyamos los endpoints de /api/reportes en el backend,
// reemplazamos estos valores fijos por fetch() reales.

const kpisAdmin = [
  { label: 'Postura de hoy', value: '870', delta: '↑ 6% vs. ayer', tone: 'up' },
  { label: 'Mortalidad semana', value: '3', delta: 'dentro de rango normal', tone: 'up' },
  { label: 'Ventas del día', value: 'Q 5,310', delta: '4 transacciones', tone: 'up' },
  { label: 'Cuentas por cobrar', value: 'Q 380', delta: '2 clientes con saldo', tone: 'warn' },
];

const lotes = [
  { galera: 'Galera nueva', tasa: 88 },
  { galera: 'Galpón 1', tasa: 76 },
  { galera: 'Galpón 2', tasa: 61 },
];

const ventasRecientes = [
  { cliente: 'Casa Melissa', clasif: 'Mediano', cantidad: '4', total: 60, estado: 'Cancelado' },
  { cliente: 'Doña Toña', clasif: 'Grande', cantidad: '15 cajas', total: 4500, estado: 'Cancelado' },
  { cliente: 'Agua Viva', clasif: 'Piwi', cantidad: '3 cajas', total: 540, estado: 'Saldo Q170' },
  { cliente: 'Elmer', clasif: 'Extra', cantidad: '6 cartones', total: 210, estado: 'Saldo Q210' },
];

const alertas = [
  { titulo: 'Vitamina Maxifor bajo mínimo', sub: 'Existencia: 2 frascos · Mínimo: 5' },
  { titulo: 'Concentrado impulsor bajo mínimo', sub: 'Existencia: 6 quintales · Mínimo: 10' },
];

const tareas = [
  { desc: 'Aplicar vacuna Newcastle', quien: 'Dani · Galpón 2', estado: 'pendiente', vence: '27/07' },
  { desc: 'Registrar peso promedio del lote', quien: 'Carlos · Galera nueva', estado: 'progreso', vence: '26/07' },
  { desc: 'Reponer cartones y limpieza de bodega', quien: 'Dani · General', estado: 'pendiente', vence: '28/07' },
];

function eggClass(pct, idx) {
  const filled = Math.round((pct / 100) * 7);
  if (idx < filled - 1) return 'full';
  if (idx === filled - 1 || idx === filled) return 'mid';
  return '';
}

function Panel({ usuario }) {
  const esAdmin = usuario.rol === 'administrador';

  return (
    <>
      {esAdmin && (
        <div className="kpi-row">
          {kpisAdmin.map((k) => (
            <div className="kpi" key={k.label}>
              <div className="label">{k.label}</div>
              <div className="value">{k.value}</div>
              <div className={`delta ${k.tone}`}>{k.delta}</div>
            </div>
          ))}
        </div>
      )}

      {esAdmin && (
        <section className="card">
          <div className="head">
            <h2>Postura por galera</h2>
            <span className="sub">Últimos 7 días</span>
          </div>
          <div className="carton">
            {lotes.map((l) => (
              <div className="carton-row" key={l.galera}>
                <span className="gname">{l.galera}</span>
                <div className="eggs">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <span key={i} className={`egg ${eggClass(l.tasa, i)}`}></span>
                  ))}
                </div>
                <span className="rate">{l.tasa}% tasa postura</span>
              </div>
            ))}
          </div>
          <div className="carton-legend">
            <span><span className="sw" style={{ background: 'var(--gold)' }}></span>Buena postura</span>
            <span><span className="sw" style={{ background: 'var(--gold-light)' }}></span>Postura media</span>
            <span><span className="sw" style={{ background: 'var(--green-light)' }}></span>Sin registrar / baja</span>
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: esAdmin ? '1.3fr 1fr' : '1fr', gap: '20px' }}>
        {esAdmin ? (
          <section className="card">
            <div className="head">
              <h2>Ventas recientes</h2>
              <span className="sub">Hoy</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Clasificación</th>
                  <th>Cant.</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventasRecientes.map((v, i) => (
                  <tr key={i}>
                    <td>{v.cliente}</td>
                    <td>{v.clasif}</td>
                    <td>{v.cantidad}</td>
                    <td>Q {v.total.toLocaleString()}</td>
                    <td>
                      <span className={`tag ${v.estado.startsWith('Saldo') ? 'pend' : 'ok'}`}>{v.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section className="card">
            <div className="head">
              <h2>Tareas próximas</h2>
              <span className="sub">Vencimiento más cercano primero</span>
            </div>
            <div className="task-list">
              {tareas.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '11px 0', borderBottom: i < tareas.length - 1 ? '1px solid var(--line)' : 'none', gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px' }}>{t.desc}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>{t.quien} · vence {t.vence}</div>
                  </div>
                  <span className={`status-pill ${t.estado}`}>{t.estado}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {esAdmin && (
          <section className="card">
            <div className="head">
              <h2>Alertas de inventario</h2>
            </div>
            <div className="alert-list">
              {alertas.map((a, i) => (
                <div className="alert" key={i}>
                  <span className="a-mark">!</span>
                  <div>
                    <div className="a-title">{a.titulo}</div>
                    <div className="a-sub">{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export default Panel;