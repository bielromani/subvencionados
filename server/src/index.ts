import { crearApp } from './app.js';
import { config } from './config.js';
import { Repositorio } from './db.js';

const repo = new Repositorio(config.rutaDb);
crearApp(repo).listen(config.puerto, () => {
  console.log(`API escuchando en http://localhost:${config.puerto} (base de datos: ${config.rutaDb})`);
});
