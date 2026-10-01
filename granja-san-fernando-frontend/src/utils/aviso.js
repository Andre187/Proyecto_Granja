// Aviso breve de éxito ("Guardado") visible aunque el usuario esté lejos del formulario.
// Cualquier página lo dispara; AvisoGlobal (en Layout) lo muestra.
export const EVENTO_AVISO = 'granja:aviso';

export function mostrarAviso(texto) {
  window.dispatchEvent(new CustomEvent(EVENTO_AVISO, { detail: texto }));
}
