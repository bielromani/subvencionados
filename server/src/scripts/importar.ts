// Carga en la base de datos de la app lo descargado en datos/bdns/.
import { Almacen } from '../bdns/almacen.js';
import { desdeBdns } from '../bdns/normalizar.js';
import { config } from '../config.js';
import { Repositorio } from '../db.js';

const almacen = new Almacen(config.rutaDatosBdns);
const repo = new Repositorio(config.rutaDb);
const convocatorias = [...almacen.registros.values()].map(desdeBdns);
const nuevas = repo.guardarVarias(convocatorias);
repo.cerrar();
console.log(
  `Importadas ${convocatorias.length} convocatorias (${nuevas} nuevas, ` +
    `${convocatorias.filter((c) => c.clasificacion.musical).length} de música) desde ${config.rutaDatosBdns}`,
);
