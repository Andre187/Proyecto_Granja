// Ventana de confirmación reutilizable (mismo estilo que "¿Cerrar sesión?")
function ConfirmModal({ confirmacion, onCancelar }) {
  if (!confirmacion) return null;
  const { titulo, texto, textoBoton = 'Confirmar', peligro = false, onConfirmar } = confirmacion;

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }} onClick={onCancelar}>
      <div className="modal-card" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-icon ${peligro ? '' : 'navy'}`}>!</div>
        <h3 className="modal-title">{titulo}</h3>
        <p className="modal-text">{texto}</p>
        <div className="modal-actions">
          <button type="button" className="btn outline" onClick={onCancelar}>Cancelar</button>
          <button
            type="button"
            className={`btn ${peligro ? 'danger' : ''}`}
            onClick={() => { onCancelar(); onConfirmar(); }}
          >
            {textoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
