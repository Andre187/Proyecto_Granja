import { useEffect, useRef } from 'react';

// Vuelve a ejecutar `refrescar` cada cierto tiempo y al regresar a la pestaña,
// para ver lo que otras personas registran desde otros dispositivos.
// No hace nada mientras la pestaña está oculta.
export default function useActualizacionAutomatica(refrescar, ms = 15000) {
  const ultima = useRef(refrescar);

  useEffect(() => {
    ultima.current = refrescar;
  });

  useEffect(() => {
    const ejecutar = () => {
      if (!document.hidden) ultima.current();
    };
    const intervalo = setInterval(ejecutar, ms);
    document.addEventListener('visibilitychange', ejecutar);
    window.addEventListener('focus', ejecutar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', ejecutar);
      window.removeEventListener('focus', ejecutar);
    };
  }, [ms]);
}
