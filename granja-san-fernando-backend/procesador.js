// Cada usuario virtual usa una IP distinta, para no chocar con el límite de 300 peticiones por IP
module.exports = {
  asignarIp(contexto, eventos, listo) {
    const r = () => Math.floor(Math.random() * 250) + 1;
    contexto.vars.ip = `10.${r()}.${r()}.${r()}`;
    return listo();
  },
};