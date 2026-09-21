import { useState, useRef, useEffect } from 'react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const toISO = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const formatoCorto = (iso) => (iso ? iso.slice(5).split('-').reverse().join('/') : '');

// Selector de rango de fechas con calendario interactivo (en vez de dos <input type="date"> sueltos).
// Se usa en todas las pantallas que tienen un filtro de período "Personalizado".
function SelectorRangoFechas({ desde, hasta, onAplicar, activo }) {
  const [abierto, setAbierto] = useState(false);
  const [mesVisible, setMesVisible] = useState(() => (desde ? new Date(`${desde}T00:00:00`) : new Date()));
  const [borrador, setBorrador] = useState({ desde: desde || '', hasta: hasta || '' });
  const contenedorRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrarSiFuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setAbierto(false);
    };
    const cerrarConEscape = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', cerrarSiFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarSiFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [abierto]);

  const abrir = () => {
    setBorrador({ desde: desde || '', hasta: hasta || '' });
    setMesVisible(desde ? new Date(`${desde}T00:00:00`) : new Date());
    setAbierto((v) => !v);
  };

  const clickDia = (iso) => {
    if (!borrador.desde || (borrador.desde && borrador.hasta)) {
      setBorrador({ desde: iso, hasta: '' });
    } else if (iso < borrador.desde) {
      setBorrador({ desde: iso, hasta: borrador.desde });
    } else {
      setBorrador({ ...borrador, hasta: iso });
    }
  };

  const aplicar = () => {
    if (!borrador.desde || !borrador.hasta) return;
    onAplicar(borrador.desde, borrador.hasta);
    setAbierto(false);
  };

  const year = mesVisible.getFullYear();
  const month = mesVisible.getMonth();
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const offsetInicio = new Date(year, month, 1).getDay();

  const celdas = [];
  for (let i = 0; i < offsetInicio; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  return (
    <div style={{ position: 'relative' }} ref={contenedorRef}>
      <button type="button" className={`drp-trigger ${activo ? 'active' : ''}`} onClick={abrir}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 8h14M6.5 3v3M13.5 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>{desde && hasta ? `${formatoCorto(desde)} – ${formatoCorto(hasta)}` : 'Personalizado'}</span>
      </button>

      {abierto && (
        <div className="date-range-popover">
          <div className="drp-header">
            <button type="button" onClick={() => setMesVisible(new Date(year, month - 1, 1))} aria-label="Mes anterior">‹</button>
            <span>{MESES[month]} {year}</span>
            <button type="button" onClick={() => setMesVisible(new Date(year, month + 1, 1))} aria-label="Mes siguiente">›</button>
          </div>

          <div className="drp-grid drp-dow">
            {DIAS.map((d, i) => <span key={i}>{d}</span>)}
          </div>

          <div className="drp-grid">
            {celdas.map((d, i) => {
              if (d === null) return <span key={i} />;
              const iso = toISO(year, month, d);
              const enRango = borrador.desde && borrador.hasta && iso > borrador.desde && iso < borrador.hasta;
              const esExtremo = iso === borrador.desde || iso === borrador.hasta;
              return (
                <button
                  type="button"
                  key={i}
                  className={`drp-day ${enRango ? 'in-range' : ''} ${esExtremo ? 'edge' : ''}`}
                  onClick={() => clickDia(iso)}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="drp-footer">
            <span className="drp-preview">
              {borrador.desde ? formatoCorto(borrador.desde) : '—'} → {borrador.hasta ? formatoCorto(borrador.hasta) : '—'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setAbierto(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                disabled={!borrador.desde || !borrador.hasta}
                onClick={aplicar}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectorRangoFechas;
