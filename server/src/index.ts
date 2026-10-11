import { crearApp } from './app.js';
import { Almacen } from './bdns/almacen.js';
import { config } from './config.js';
import { Repositorio } from './db.js';
import { AlmacenFichas } from './ficha/fichas.js';
import { AlmacenContratos } from './contratos/almacen.js';
import { enriquecer } from './contratos/vista.js';
import { esDeMusica } from './contratos/placsp.js';
import { Contactos } from './contactos.js';

const repo = new Repositorio(config.rutaDb);
const almacen = new Almacen(config.rutaDatosBdns);
const fichas = new AlmacenFichas(`${config.rutaDatos}/fichas`);
const contratos = [...new AlmacenContratos(`${config.rutaDatos}/contratos`).contratos.values()]
  // El filtro se vuelve a aplicar al cargar: si se afina, no hace falta volver a descargar.
  .filter((c) => esDeMusica(c))
  .map(({ anio: _a, ...c }) => enriquecer(c));
crearApp(repo, {
  leerTexto: (relativa) => almacen.leerTexto(relativa),
  fichas: { leer: (codigo) => fichas.leer(codigo), tiene: (codigo) => fichas.tiene(codigo) },
  contratos,
  contactos: Contactos.cargar(config.rutaDatos),
}).listen(config.puerto, () => {
  console.log(`API escuchando en http://localhost:${config.puerto} (base de datos: ${config.rutaDb})`);
});
