import { config } from './config.js';
import { montarApp } from './servidor.js';

montarApp(config.rutaDb, config.rutaDatos).listen(config.puerto, () => {
  console.log(`API escuchando en http://localhost:${config.puerto} (base de datos: ${config.rutaDb})`);
});
