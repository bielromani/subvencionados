import { crearApp } from './app.js';
import { Almacen } from './bdns/almacen.js';
import { config } from './config.js';
import { Repositorio } from './db.js';

const repo = new Repositorio(config.rutaDb);
const almacen = new Almacen(config.rutaDatosBdns);
crearApp(repo, { leerTexto: (relativa) => almacen.leerTexto(relativa) }).listen(config.puerto, () => {
  console.log(`API escuchando en http://localhost:${config.puerto} (base de datos: ${config.rutaDb})`);
});
