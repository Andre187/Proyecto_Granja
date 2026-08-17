import { useState, useEffect } from 'react';
import api from '../api/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const hoy = () => new Date().toISOString().slice(0, 10);

const estiloClaro = {
  background: '#F5F1E6',
  color: '#232019',
  colorScheme: 'light',
};

function Ventas({ usuario }) {
  const esAdmin = usuario.rol === 'administrador';

  const [resumen, setResumen] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [ventas, setVentas] = useState([]);

  const [pestanaHistorial, setPestanaHistorial] = useState('pendientes');

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteNit, setClienteNit] = useState('');
  const [fechaVenta, setFechaVenta] = useState(hoy());
  const [formaPago, setFormaPago] = useState('credito');
  const [items, setItems] = useState([{ id_clasificacion: '', cantidad: '', precio_unitario: '' }]);

  const [abonandoId, setAbonandoId] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [fechaAbono, setFechaAbono] = useState(hoy());

  const [mostrarEditarCliente, setMostrarEditarCliente] = useState(false);
  const [edicionCliente, setEdicionCliente] = useState({ nombre: '', telefono: '', nit: '', direccion: '' });

  const cargarTodo = async () => {
    try {
      const peticiones = [
        api.get('/ventas/clientes'),
        api.get('/ventas/clasificaciones'),
        api.get('/ventas/ventas'),
      ];
      if (esAdmin) peticiones.unshift(api.get('/ventas/resumen'));

      const resultados = await Promise.all(peticiones);
      if (esAdmin) {
        const [rResumen, rClientes, rClasificaciones, rVentas] = resultados;
        setResumen(rResumen.data);
        setClientes(rClientes.data);
        setClasificaciones(rClasificaciones.data);
        setVentas(rVentas.data);
      } else {
        const [rClientes, rClasificaciones, rVentas] = resultados;
        setClientes(rClientes.data);
        setClasificaciones(rClasificaciones.data);
        setVentas(rVentas.data);
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información de ventas');
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

  const agregarItem = () => {
    setItems([...items, { id_clasificacion: '', cantidad: '', precio_unitario: '' }]);
  };

  const quitarItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const actualizarItem = (index, campo, valor) => {
    const copia = [...items];
    copia[index][campo] = valor;
    setItems(copia);
  };

  const resetFormularioVenta = () => {
    setClienteSeleccionado('');
    setClienteNombre('');
    setClienteTelefono('');
    setClienteNit('');
    setClienteDireccion('');
    setFechaVenta(hoy());
    setFormaPago('credito');
    setItems([{ id_clasificacion: '', cantidad: '', precio_unitario: '' }]);
  };

  const handleRegistrarVenta = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        fecha: fechaVenta,
        forma_pago: formaPago,
        items: items.map((it) => ({
          id_clasificacion: it.id_clasificacion,
          cantidad: parseInt(it.cantidad),
          precio_unitario: parseFloat(it.precio_unitario),
        })),
      };
      if (clienteSeleccionado === 'nuevo') {
        payload.cliente_nombre = clienteNombre;
        payload.cliente_telefono = clienteTelefono;
        payload.cliente_nit = clienteNit;
        payload.cliente_direccion = clienteDireccion;
      } else {
        payload.id_cliente = clienteSeleccionado;
      }
      await api.post('/ventas/ventas', payload);
      resetFormularioVenta();
      mostrarMensaje(formaPago === 'contado' ? 'Venta registrada y marcada como pagada' : 'Venta registrada correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar la venta');
    }
  };

  const handleRegistrarAbono = async (id_venta) => {
    try {
      await api.post(`/ventas/ventas/${id_venta}/abonos`, {
        fecha: fechaAbono,
        monto: parseFloat(montoAbono),
      });
      setAbonandoId(null);
      setMontoAbono('');
      mostrarMensaje('Abono registrado correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo registrar el abono');
    }
  };

  const handleAnularVenta = async (id_venta) => {
    if (!window.confirm('¿Anular esta venta? Se devolverá la existencia de huevos correspondiente. Esta acción no se puede deshacer.')) return;
    try {
      await api.put(`/ventas/ventas/${id_venta}/anular`);
      mostrarMensaje('Venta anulada correctamente');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo anular la venta');
    }
  };

  const clienteActual = clientes.find((c) => String(c.id_cliente) === String(clienteSeleccionado));

  const abrirEdicionCliente = () => {
    if (!clienteActual) return;
    setEdicionCliente({
      nombre: clienteActual.nombre || '',
      telefono: clienteActual.telefono || '',
      nit: clienteActual.nit || '',
      direccion: clienteActual.direccion || '',
    });
    setMostrarEditarCliente(true);
  };

  const guardarEdicionCliente = async () => {
    try {
      await api.put(`/ventas/clientes/${clienteSeleccionado}`, edicionCliente);
      setMostrarEditarCliente(false);
      mostrarMensaje('Datos del cliente actualizados');
      cargarTodo();
    } catch (err) {
      mostrarError(err.response?.data?.error || 'No se pudo actualizar el cliente');
    }
  };

  const handleGenerarRecibo = async (id_venta) => {
    try {
      const respuesta = await api.get(`/ventas/ventas/${id_venta}`);
      const venta = respuesta.data;

      const faltantes = [];
      if (!venta.cliente_nombre) faltantes.push('nombre del cliente');
      if (!venta.nit) faltantes.push('NIT');
      if (!venta.direccion) faltantes.push('dirección');

      if (faltantes.length > 0) {
        const continuar = window.confirm(
          `A este cliente le falta: ${faltantes.join(', ')}.
Sin estos datos, el comprador NO podrá usar este recibo para facturar.

¿Generar el recibo de todas formas (sin esos datos)?`
        );
        if (!continuar) return;
      }

      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setTextColor(27, 59, 111);
      doc.text('Granja San Fernando', 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('Recibo de venta', 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(30);
      doc.text(`Recibo No.: ${venta.id_venta}`, 14, 36);
      doc.text(`Fecha: ${venta.fecha?.slice(0, 10)}`, 14, 42);
      doc.text(`Cliente: ${venta.cliente_nombre}`, 14, 48);
      doc.text(`NIT: ${venta.nit || 'N/A (no válido para facturar)'}`, 14, 54);
      doc.text(`Dirección: ${venta.direccion || 'N/A'}`, 14, 60);
      if (venta.telefono) doc.text(`Teléfono: ${venta.telefono}`, 14, 66);

      autoTable(doc, {
        startY: 74,
        head: [['Clasificación', 'Cantidad', 'Precio unitario', 'Subtotal']],
        body: venta.detalle.map((d) => [
          d.clasificacion,
          d.cantidad,
          q(d.precio_unitario),
          q(d.subtotal),
        ]),
        headStyles: { fillColor: [27, 59, 111] },
        styles: { fontSize: 10 },
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.text(`Total: ${q(venta.monto_total)}`, 140, finalY);
      doc.text(`Saldo pendiente: ${q(venta.saldo_pendiente)}`, 140, finalY + 7);
      doc.text(`Estado: ${venta.estado}`, 140, finalY + 14);

      if (venta.abonos && venta.abonos.length > 0) {
        autoTable(doc, {
          startY: finalY + 22,
          head: [['Fecha de abono', 'Monto']],
          body: venta.abonos.map((a) => [a.fecha?.slice(0, 10), q(a.monto)]),
          headStyles: { fillColor: [92, 138, 58] },
          styles: { fontSize: 9 },
        });
      }

      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Documento generado por el sistema de Granja San Fernando', 14, 285);

      doc.save(`recibo_venta_${venta.id_venta}.pdf`);
    } catch (err) {
      console.error(err);
      mostrarError('No se pudo generar el recibo');
    }
  };

  const q = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

  const ventasPendientes = ventas.filter((v) => Number(v.saldo_pendiente) > 0);
  const ventasPagadas = ventas.filter((v) => Number(v.saldo_pendiente) <= 0);
  const ventasAMostrar = pestanaHistorial === 'pendientes' ? ventasPendientes : ventasPagadas;

  const filaVenta = (v) => (
    <tr key={v.id_venta}>
      <td data-label="Fecha">{v.fecha?.slice(0, 10)}</td>
      <td data-label="Cliente">{v.cliente_nombre}</td>
      <td data-label="Total">{q(v.monto_total)}</td>
      <td data-label="Saldo pendiente">{q(v.saldo_pendiente)}</td>
      <td data-label="Estado"><span className={`tag ${v.estado === 'cancelado' ? 'ok' : 'pend'}`}>{v.estado}</span></td>
      <td data-label="Acción">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {v.saldo_pendiente > 0 && v.estado !== 'anulado' && (
            abonandoId === v.id_venta ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="number" step="0.01" placeholder="Monto"
                  value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)}
                  style={{ ...estiloClaro, width: '90px', fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }}
                />
                <input
                  type="date"
                  value={fechaAbono} onChange={(e) => setFechaAbono(e.target.value)}
                  style={{ ...estiloClaro, fontSize: '12px', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: '6px' }}
                />
                <button className="btn" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => handleRegistrarAbono(v.id_venta)}>
                  Guardar
                </button>
                <button
                  style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--ink-soft)' }}
                  onClick={() => { setAbonandoId(null); setMontoAbono(''); }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--navy)', textDecoration: 'underline', padding: 0 }}
                onClick={() => { setAbonandoId(v.id_venta); setMontoAbono(''); setFechaAbono(hoy()); }}
              >
                Registrar abono
              </button>
            )
          )}
          {esAdmin && v.estado !== 'anulado' && (
            <button
              style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--red)', textDecoration: 'underline', padding: 0 }}
              onClick={() => handleAnularVenta(v.id_venta)}
            >
              Anular
            </button>
          )}
          <button
            style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--green)', textDecoration: 'underline', padding: 0 }}
            onClick={() => handleGenerarRecibo(v.id_venta)}
          >
            Recibo
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '14px' }}>{mensaje}</p>}

      {esAdmin && resumen && (
        <div className="kpi-row">
          <div className="kpi">
            <div className="label">Total en ventas</div>
            <div className="value">{q(resumen.total_ventas)}</div>
          </div>
          <div className="kpi">
            <div className="label">Total cobrado</div>
            <div className="value">{q(resumen.total_cobrado)}</div>
            <div className="delta up">pagos confirmados</div>
          </div>
          <div className="kpi">
            <div className="label">Total pendiente</div>
            <div className="value">{q(resumen.total_pendiente)}</div>
            <div className="delta warn">por cobrar</div>
          </div>
          <div className="kpi">
            <div className="label">Clientes con saldo</div>
            <div className="value">{resumen.ventas_con_saldo}</div>
          </div>
        </div>
      )}

      <section className="card">
        <div className="head"><h2>Registrar venta</h2></div>
        <form onSubmit={handleRegistrarVenta} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field">
              <label>Cliente</label>
              <select
                value={clienteSeleccionado}
                onChange={(e) => { setClienteSeleccionado(e.target.value); setMostrarEditarCliente(false); }}
                required
                style={estiloClaro}
              >
                <option value="">Selecciona un cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
                ))}
                <option value="nuevo">+ Crear nuevo cliente</option>
              </select>
            </div>

            {clienteActual && !mostrarEditarCliente && (
              <div className="field">
                <label>&nbsp;</label>
                {clienteActual.nit ? (
                  <button
                    type="button"
                    onClick={abrirEdicionCliente}
                    style={{
                      background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)',
                      borderRadius: '7px', fontSize: '12px', padding: '9px 14px', fontWeight: 500,
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(27,59,111,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    ✏️ Editar datos de facturación
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={abrirEdicionCliente}
                    style={{
                      background: 'linear-gradient(180deg, #d6b366 0%, var(--gold) 100%)',
                      color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
                      padding: '9px 14px', boxShadow: '0 2px 6px rgba(138, 95, 23, 0.35)',
                    }}
                  >
                    ⚠️ Completar NIT / dirección
                  </button>
                )}
              </div>
            )}

            {clienteSeleccionado === 'nuevo' && (
              <>
                <div className="field">
                  <label>Nombre del cliente nuevo</label>
                  <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required style={estiloClaro} />
                </div>
                <div className="field">
                  <label>Teléfono (opcional)</label>
                  <input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} style={estiloClaro} />
                </div>
                <div className="field">
                  <label>NIT (para poder facturar)</label>
                  <input value={clienteNit} onChange={(e) => setClienteNit(e.target.value)} placeholder="ej. 1234567-8" style={estiloClaro} />
                </div>
                <div className="field">
                  <label>Dirección (para poder facturar)</label>
                  <input value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} style={estiloClaro} />
                </div>
              </>
            )}

            <div className="field">
              <label>Fecha</label>
              <input type="date" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} required style={estiloClaro} />
            </div>

            <div className="field">
              <label>Forma de pago</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} style={estiloClaro}>
                <option value="credito">Crédito (queda pendiente)</option>
                <option value="contado">Contado (pagó todo)</option>
              </select>
            </div>
          </div>

          {mostrarEditarCliente && (
            <div style={{ background: 'var(--cream)', padding: '16px', borderRadius: '10px', border: '1px solid var(--line)' }}>
              <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '12px', fontWeight: 500 }}>
                Datos de facturación del cliente
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: 1, minWidth: '140px' }}>
                  <label>Teléfono</label>
                  <input value={edicionCliente.telefono} onChange={(e) => setEdicionCliente({ ...edicionCliente, telefono: e.target.value })} style={estiloClaro} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: '140px' }}>
                  <label>NIT</label>
                  <input value={edicionCliente.nit} onChange={(e) => setEdicionCliente({ ...edicionCliente, nit: e.target.value })} placeholder="ej. 1234567-8" style={estiloClaro} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: '180px' }}>
                  <label>Dirección</label>
                  <input value={edicionCliente.direccion} onChange={(e) => setEdicionCliente({ ...edicionCliente, direccion: e.target.value })} style={estiloClaro} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn gold" style={{ padding: '10px 28px', fontSize: '13px' }} onClick={guardarEdicionCliente}>
                  Guardar
                </button>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--ink-soft)', textDecoration: 'underline' }}
                  onClick={() => setMostrarEditarCliente(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
              Artículos vendidos
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={item.id_clasificacion}
                    onChange={(e) => actualizarItem(i, 'id_clasificacion', e.target.value)}
                    required
                    style={{ ...estiloClaro, flex: 2, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
                  >
                    <option value="">Clasificación...</option>
                    {clasificaciones.map((c) => (
                      <option key={c.id_clasificacion} value={c.id_clasificacion}>
                        {c.nombre} ({c.existencia_actual} disponibles)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={item.cantidad}
                    onChange={(e) => actualizarItem(i, 'cantidad', e.target.value)}
                    required
                    style={{ ...estiloClaro, flex: 1, minWidth: '80px', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio unitario (Q)"
                    value={item.precio_unitario}
                    onChange={(e) => actualizarItem(i, 'precio_unitario', e.target.value)}
                    required
                    style={{ ...estiloClaro, flex: 1, minWidth: '110px', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => quitarItem(i)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '13px', cursor: 'pointer' }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={agregarItem} className="btn"
              style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)', marginTop: '8px', fontSize: '12px', padding: '6px 12px' }}>
              + Agregar artículo
            </button>
          </div>

          <div>
            <button type="submit" className="btn gold">Registrar venta</button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="head">
          <h2>Historial de ventas</h2>
          <span className="sub">{ventas.length} ventas totales</span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="period-tabs" style={{ display: 'inline-flex' }}>
            <button className={pestanaHistorial === 'pendientes' ? 'active' : ''} onClick={() => setPestanaHistorial('pendientes')}>
              Cuentas por cobrar ({ventasPendientes.length})
            </button>
            <button className={pestanaHistorial === 'pagadas' ? 'active' : ''} onClick={() => setPestanaHistorial('pagadas')}>
              Pagadas ({ventasPagadas.length})
            </button>
          </div>
        </div>

        {ventasAMostrar.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            {pestanaHistorial === 'pendientes' ? 'No hay cuentas pendientes por cobrar.' : 'Aún no hay ventas pagadas.'}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Saldo pendiente</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {ventasAMostrar.map(filaVenta)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default Ventas;