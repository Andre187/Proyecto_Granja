import { useState, useRef, useEffect } from 'react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const toISO = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const hoyISO = () => { const d = new Date(); return toISO(d.getFullYear(), d.getMonth(), d.getDate()); };
const mostrar = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

// Campo de fecha con calendario propio (sustituye a <input type="date">).
// Mismo uso que el input: value 'AAAA-MM-DD' y onChange(e) con e.target.value.
// El calendario se abre pegado al botón, alineado a la derecha del campo.
function CampoFecha({ value, onChange, required, min, max, style }) {
  const [abierto, setAbierto] = useState(false);
  const [mesVisible, setMesVisible] = useState(() => (value ? new Date(`${value.slice(0, 10)}T00:00:00`) : new Date()));
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrarSiFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    const cerrarConEscape = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', cerrarSiFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarSiFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [abierto]);

  const abrir = () => {
    setMesVisible(value ? new Date(`${value.slice(0, 10)}T00:00:00`) : new Date());
    setAbierto((v) => !v);
  };

  const elegir = (iso) => {
    onChange({ target: { value: iso } });
    setAbierto(false);
  };

  const year = mesVisible.getFullYear();
  const month = mesVisible.getMonth();
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const offsetInicio = new Date(year, month, 1).getDay();
  const celdas = [];
  for (let i = 0; i < offsetInicio; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const hoy = hoyISO();
  const fueraDeRango = (iso) => (min && iso < min) || (max && iso > max);

  return (
    <div className="campo-fecha" ref={ref}>
      <button type="button" className="campo-fecha-btn" onClick={abrir} style={style} aria-haspopup="dialog" aria-expanded={abierto}>
        <span className={value ? '' : 'vacio'}>{value ? mostrar(value) : 'dd/mm/aaaa'}</span>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 8h14M6.5 3v3M13.5 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Permite que el formulario avise "completa este campo" si es obligatorio y está vacío */}
      {required && (
        <input className="campo-fecha-requerido" tabIndex={-1} aria-hidden="true" required value={value || ''} onChange={() => {}} />
      )}

      {abierto && (
        <div className="date-range-popover campo-fecha-popover" role="dialog">
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
              const seleccionado = value && value.slice(0, 10) === iso;
              return (
                <button
                  type="button"
                  key={i}
                  className={`drp-day ${seleccionado ? 'edge' : ''} ${iso === hoy ? 'hoy' : ''}`}
                  disabled={fueraDeRango(iso)}
                  onClick={() => elegir(iso)}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="drp-footer">
            {required ? <span /> : (
              <button type="button" className="btn outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => elegir('')}>
                Borrar
              </button>
            )}
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              disabled={fueraDeRango(hoy)}
              onClick={() => elegir(hoy)}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampoFecha;
