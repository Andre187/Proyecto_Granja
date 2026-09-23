import { useState, useEffect } from 'react';
import api from '../api/api';

const hoy = () => new Date().toISOString().slice(0, 10);

const estiloClaro = {
  background: '#F5F1E6',
  color: '#232019',
  colorScheme: 'light',
};

function Ventas({ usuario }) {
  const esAdmin = usuario.rol === 'administrador' || usuario.rol === 'superadministrador';

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
  const [fechaVenta, setFechaVenta] = useState(hoy());
  const [formaPago, setFormaPago] = useState('credito');
  const [items, setItems] = useState([{ id_clasificacion: '', presentacion: 'unidad', cantidadPresentacion: '', precio_unitario: '' }]);

  const CARTONES_POR_PRESENTACION = { caja: 12, media: 6, unidad: 1 };
  const cartonesDeItem = (item) => (parseInt(item.cantidadPresentacion) || 0) * CARTONES_POR_PRESENTACION[item.presentacion];

  const [abonandoId, setAbonandoId] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [fechaAbono, setFechaAbono] = useState(hoy());

  const [mostrarEditarCliente, setMostrarEditarCliente] = useState(false);
  const [edicionCliente, setEdicionCliente] = useState({ nombre: '', telefono: '', direccion: '' });

  const [stockInsuficiente, setStockInsuficiente] = useState(null);

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
    setItems([...items, { id_clasificacion: '', presentacion: 'unidad', cantidadPresentacion: '', precio_unitario: '' }]);
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
    setClienteDireccion('');
    setFechaVenta(hoy());
    setFormaPago('credito');
    setItems([{ id_clasificacion: '', presentacion: 'unidad', cantidadPresentacion: '', precio_unitario: '' }]);
  };

  const handleRegistrarVenta = async (e) => {
    e.preventDefault();

    const totalesPorClasificacion = {};
    for (const it of items) {
      const cant = cartonesDeItem(it);
      totalesPorClasificacion[it.id_clasificacion] = (totalesPorClasificacion[it.id_clasificacion] || 0) + cant;
    }
    for (const idClasificacion of Object.keys(totalesPorClasificacion)) {
      const clasificacion = clasificaciones.find((c) => String(c.id_clasificacion) === String(idClasificacion));
      const solicitado = totalesPorClasificacion[idClasificacion];
      if (clasificacion && solicitado > clasificacion.existencia_actual) {
        setStockInsuficiente({ nombre: clasificacion.nombre, disponible: clasificacion.existencia_actual, solicitado });
        return;
      }
    }

    try {
      const payload = {
        fecha: fechaVenta,
        forma_pago: formaPago,
        items: items.map((it) => ({
          id_clasificacion: it.id_clasificacion,
          cantidad: cartonesDeItem(it),
          precio_unitario: parseFloat(it.precio_unitario),
        })),
      };
      if (clienteSeleccionado === 'nuevo') {
        payload.cliente_nombre = clienteNombre;
        payload.cliente_telefono = clienteTelefono;
        payload.cliente_direccion = clienteDireccion;
      } else {
        payload.id_cliente = clienteSeleccionado;
      }
      await api.post('/ventas/ventas', payload);
      resetFormularioVenta();
      mostrarMensaje(formaPago === 'contado' ? 'Venta registrada y marcada como pagada' : 'Venta registrada correctamente');
      cargarTodo();
    } catch (err) {
      const mensajeError = err.response?.data?.error || '';
      if (mensajeError.includes('existencia disponible')) {
        setStockInsuficiente({ nombre: null, disponible: null, solicitado: null });
      } else {
        mostrarError(mensajeError || 'No se pudo registrar la venta');
      }
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

  const [ventaAAnular, setVentaAAnular] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  const confirmarAnularVenta = async () => {
    try {
      await api.put(`/ventas/ventas/${ventaAAnular}/anular`, { motivo: motivoAnulacion.trim() });
      mostrarMensaje('Venta anulada correctamente');
      setVentaAAnular(null);
      setMotivoAnulacion('');
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

  const q = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

  const ventasPendientes = ventas.filter((v) => Number(v.saldo_pendiente) > 0);
  const ventasPagadas = ventas.filter((v) => Number(v.saldo_pendiente) <= 0);
  const ventasAMostrar = (esAdmin && pestanaHistorial === 'pagadas') ? ventasPagadas : ventasPendientes;

  const filaVenta = (v) => (
    <tr key={v.id_venta}>
      <td data-label="Fecha">{v.fecha?.slice(0, 10)}</td>
      <td data-label="Cliente">{v.cliente_nombre}</td>
      <td data-label="Total">{q(v.monto_total)}</td>
      <td data-label="Saldo pendiente">{q(v.saldo_pendiente)}</td>
      <td data-label="Estado">
        <span
          className={`tag ${v.estado === 'cancelado' ? 'ok' : 'pend'}`}
          title={v.estado === 'anulado' && v.motivo_anulacion ? `Motivo: ${v.motivo_anulacion}` : undefined}
        >
          {v.estado}
        </span>
      </td>
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
              onClick={() => { setVentaAAnular(v.id_venta); setMotivoAnulacion(''); }}
            >
              Anular
            </button>
          )}
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
                  ✏️ Editar datos de contacto
                </button>
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
                  <label>Dirección (opcional)</label>
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
                <option value="credito">Crédito</option>
                <option value="contado">Contado</option>
              </select>
            </div>
          </div>

          {mostrarEditarCliente && (
            <div style={{ background: 'var(--cream)', padding: '16px', borderRadius: '10px', border: '1px solid var(--line)' }}>
              <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '12px', fontWeight: 500 }}>
                Datos de contacto del cliente
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="field" style={{ flex: 1, minWidth: '140px' }}>
                  <label>Teléfono</label>
                  <input value={edicionCliente.telefono} onChange={(e) => setEdicionCliente({ ...edicionCliente, telefono: e.target.value })} style={estiloClaro} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: '180px' }}>
                  <label>Dirección</label>
                  <input value={edicionCliente.direccion} onChange={(e) => setEdicionCliente({ ...edicionCliente, direccion: e.target.value })} style={estiloClaro} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn" style={{ padding: '10px 28px', fontSize: '13px' }} onClick={guardarEdicionCliente}>
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
                  <select
                    value={item.presentacion}
                    onChange={(e) => actualizarItem(i, 'presentacion', e.target.value)}
                    style={{ ...estiloClaro, flex: 1, minWidth: '110px', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
                  >
                    <option value="caja">Caja</option>
                    <option value="media">Media caja</option>
                    <option value="unidad">Unidad</option>
                  </select>
                  <div style={{ flex: 1, minWidth: '110px' }}>
                    <input
                      type="number"
                      min="1"
                      placeholder={`Cantidad de ${item.presentacion === 'caja' ? 'cajas' : item.presentacion === 'media' ? 'medias cajas' : 'unidades'}`}
                      value={item.cantidadPresentacion}
                      onChange={(e) => actualizarItem(i, 'cantidadPresentacion', e.target.value)}
                      required
                      style={{ ...estiloClaro, width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '7px', fontSize: '13px' }}
                    />
                    {item.presentacion !== 'unidad' && item.cantidadPresentacion > 0 && (
                      <span style={{ fontSize: '10.5px', color: 'var(--ink-soft)' }}>= {cartonesDeItem(item)} cartones</span>
                    )}
                  </div>
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
            <button type="submit" className="btn">Registrar venta</button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="head">
          <h2>{esAdmin ? 'Historial de ventas' : 'Cuentas por cobrar'}</h2>
          <span className="sub">{esAdmin ? `${ventas.length} ventas totales` : `${ventasPendientes.length} pendientes`}</span>
        </div>

        {esAdmin && (
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
        )}

        {ventasAMostrar.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            {(!esAdmin || pestanaHistorial === 'pendientes') ? 'No hay cuentas pendientes por cobrar.' : 'Aún no hay ventas pagadas.'}
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

      {ventaAAnular && (
        <div className="modal-overlay" onClick={() => setVentaAAnular(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M12 16.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M10.3 3.9 2.6 17.3c-.6 1 .1 2.2 1.3 2.2h16.2c1.2 0 1.9-1.2 1.3-2.2L13.7 3.9c-.6-1-2-1-2.6 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="modal-title">Anular venta</h3>
            <p className="modal-text">
              Se devolverá la existencia de huevos correspondiente. Esta acción no se puede deshacer.
            </p>
            <div className="field" style={{ textAlign: 'left', marginTop: '4px' }}>
              <label>Motivo (opcional)</label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
                maxLength={255}
                placeholder="Ej. Cliente canceló el pedido, error al registrar..."
                style={{ ...estiloClaro, width: '100%', border: '1px solid var(--line)', borderRadius: '7px', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '14px' }}>
              <button type="button" className="btn outline" onClick={() => setVentaAAnular(null)}>
                Cancelar
              </button>
              <button type="button" className="btn danger" onClick={confirmarAnularVenta}>
                Anular
              </button>
            </div>
          </div>
        </div>
      )}

      {stockInsuficiente && (
        <div className="modal-overlay" onClick={() => setStockInsuficiente(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M12 16.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M10.3 3.9 2.6 17.3c-.6 1 .1 2.2 1.3 2.2h16.2c1.2 0 1.9-1.2 1.3-2.2L13.7 3.9c-.6-1-2-1-2.6 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="modal-title">Existencia no disponible</h3>
            <p className="modal-text">
              {stockInsuficiente.nombre ? (
                <>
                  La cantidad de huevos que quieres vender de <b>{stockInsuficiente.nombre}</b> no está disponible:
                  pediste {stockInsuficiente.solicitado} y solo hay {stockInsuficiente.disponible} en existencia.
                </>
              ) : (
                'La cantidad de huevos que quieres vender no está disponible en existencia para ese tamaño.'
              )}
            </p>
            <div className="modal-actions">
              <button className="btn" style={{ width: '100%' }} onClick={() => setStockInsuficiente(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Ventas;