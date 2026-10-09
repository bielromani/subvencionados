import { crearApp } from './app.js';
import { Almacen } from './bdns/almacen.js';
import { config } from './config.js';
import { Repositorio } from './db.js';
import { AlmacenFichas } from './ficha/fichas.js';

const repo = new Repositorio(config.rutaDb);
const almacen = new Almacen(config.rutaDatosBdns);
const fichas = new AlmacenFichas(`${config.rutaDatos}/fichas`);
crearApp(repo, {
  leerTexto: (relativa) => almacen.leerTexto(relativa),
  fichas: { leer: (codigo) => fichas.leer(codigo), tiene: (codigo) => fichas.tiene(codigo) },
}).listen(config.puerto, () => {
  console.log(`API escuchando en http://localhost:${config.puerto} (base de datos: ${config.rutaDb})`);
});
