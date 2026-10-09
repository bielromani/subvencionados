// Genera docs/informe-nicho.md a partir de lo descargado en datos/bdns/.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Almacen } from '../bdns/almacen.js';
import { desdeBdns } from '../bdns/normalizar.js';
import { config } from '../config.js';
import { generarInforme } from '../informe.js';
import { Referencias } from '../referencias.js';
import { calcularSeries } from '../series.js';

const referencias = Referencias.cargar(config.rutaDatos);
const normalizadas = [...new Almacen(config.rutaDatosBdns).registros.values()].map((r) => desdeBdns(r, referencias));
const series = calcularSeries(normalizadas);
const convocatorias = normalizadas.map((c) => ({ ...c, serie: series.get(c.id) ?? null }));

const ruta = fileURLToPath(new URL('../../../docs/informe-nicho.md', import.meta.url));
writeFileSync(ruta, generarInforme(convocatorias));
console.log(`Informe escrito en ${ruta} (${convocatorias.length} convocatorias)`);
