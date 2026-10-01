import { useState, useEffect } from 'react';
import { EVENTO_AVISO } from '../utils/aviso';

function AvisoGlobal() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let temporizador;
    const alRecibir = (e) => {
      clearTimeout(temporizador);
      setAviso({ texto: e.detail, id: Date.now() });
      temporizador = setTimeout(() => setAviso(null), 3000);
    };
    window.addEventListener(EVENTO_AVISO, alRecibir);
    return () => {
      window.removeEventListener(EVENTO_AVISO, alRecibir);
      clearTimeout(temporizador);
    };
  }, []);

  if (!aviso) return null;

  return (
    <div className="aviso-global" role="status" aria-live="polite" key={aviso.id}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="m6.5 10.2 2.5 2.5 4.5-4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{aviso.texto}</span>
    </div>
  );
}

export default AvisoGlobal;
