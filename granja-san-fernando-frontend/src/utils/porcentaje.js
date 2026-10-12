// La tasa de postura no puede pasar de 100 % (como máximo un huevo por ave al día).
// Si los datos dan más (p. ej. aves sin actualizar), en pantalla se muestra 100 %.
export const tasaVisible = (tasa) => (Number(tasa) > 100 ? 100 : tasa);
