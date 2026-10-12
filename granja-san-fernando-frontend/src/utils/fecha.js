// Fechas en pantalla: día/mes/año (11/10/2026). Internamente se siguen guardando como AAAA-MM-DD.
export const formatoFecha = (valor) => {
  if (!valor) return '';
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(valor);
};
