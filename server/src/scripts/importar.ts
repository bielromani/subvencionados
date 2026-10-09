// Carga en la base de datos de la app lo descargado en datos/bdns/.
import { Almacen } from '../bdns/almacen.js';
import { desdeBdns } from '../bdns/normalizar.js';
import { config } from '../config.js';
import { Repositorio } from '../db.js';
import { Referencias } from '../referencias.js';
import { calcularSeries } from '../series.js';

const almacen = new Almacen(config.rutaDatosBdns);
const repo = new Repositorio(config.rutaDb);
const referencias = Referencias.cargar(config.rutaDatos);
if (!referencias) console.warn('Sin datos/referencia: no se ubicarán los organismos locales en su municipio.');
const normalizadas = [...almacen.registros.values()].map((r) => desdeBdns(r, referencias));
const series = calcularSeries(normalizadas);
const convocatorias = normalizadas.map((c) => ({ ...c, serie: series.get(c.id) ?? null }));
const nuevas = repo.guardarVarias(convocatorias);
repo.cerrar();
console.log(
  `Importadas ${convocatorias.length} convocatorias (${nuevas} nuevas, ` +
    `${convocatorias.filter((c) => c.clasificacion.musical).length} de música, ` +
    `${new Set([...series.values()].map((s) => s.id)).size} series que se repiten) desde ${config.rutaDatosBdns}`,
);
