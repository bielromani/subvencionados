// Pedanías con su municipio, de los registros oficiales con datos abiertos → datos/directorio/pedanias.json.
//   - Cataluña: Entitats municipals descentralitzades (Generalitat, conjunto cum6-qrjz).
//   - Euskadi: Registro de entidades locales (concejos de Álava y demás entidades por debajo del municipio).
// Se ejecuta en GitHub Actions (el proxy de las sesiones de trabajo bloquea estas webs).

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import type { Pedania } from '../subvencionesMunicipio.js';

const ua = { 'user-agent': 'Mozilla/5.0 (compatible; subvencionados)' };
const json = async <T>(url: string) => (await (await fetch(url, { headers: ua, signal: AbortSignal.timeout(120_000) })).json()) as T;
const salida: Pedania[] = [];

const emd = await json<{ nom_emd: string; codi_municipi: string }[]>('https://analisi.transparenciacatalunya.cat/resource/cum6-qrjz.json?$limit=1000');
for (const x of emd) if (x.nom_emd && /^\d{5}/.test(x.codi_municipi)) salida.push({ nombre: x.nom_emd, codigoIne: x.codi_municipi.slice(0, 5), fuente: 'Generalitat de Catalunya' });
console.log(`Cataluña: ${emd.length} EMD`);

const eus = await json<{ recName?: string; entType?: string; territorycode?: string; municipalitycode?: string }[]>(
  'https://opendata.euskadi.eus/contenidos/ds_registros/registro_entidades_locales/opendata/entidades.json',
);
const tipos = new Map<string, number>();
for (const x of eus) tipos.set(x.entType ?? '', (tipos.get(x.entType ?? '') ?? 0) + 1);
console.log('Euskadi, tipos de entidad:', Object.fromEntries(tipos));
for (const x of eus) {
  if (!x.recName || !/concejo|kontzeju|entidad local menor|junta/i.test(x.entType ?? '')) continue;
  if (!/^\d{2}$/.test(x.territorycode ?? '') || !/^\d{3}$/.test(x.municipalitycode ?? '')) continue;
  salida.push({ nombre: x.recName, codigoIne: `${x.territorycode}${x.municipalitycode}`, fuente: 'Gobierno Vasco' });
}
console.log(`Total: ${salida.length} pedanías`);
if (!salida.length) throw new Error('No se ha leído ninguna pedanía: no se sobrescribe el fichero.');
writeFileSync(join(config.rutaDatos, 'directorio', 'pedanias.json'), `[\n${salida.map((x) => JSON.stringify(x)).join(',\n')}\n]\n`);
