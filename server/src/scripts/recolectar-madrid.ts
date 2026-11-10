// Contratos menores de música del Ayuntamiento de Madrid (datos.madrid.es) → datos/contratos/.
// Se ejecuta en GitHub Actions. Lee los CSV de 2018 en adelante (los anteriores no traen la fecha de adjudicación).

import { join } from 'node:path';
import { config } from '../config.js';
import { AlmacenContratos } from '../contratos/almacen.js';
import { contratoDeMadrid, DATASET_MADRID, decodificarCsv, esMusicaMadrid, filasMadrid } from '../contratos/madrid.js';

const almacen = new AlmacenContratos(join(config.rutaDatos, 'contratos'));
const ua = { 'user-agent': 'Mozilla/5.0 (compatible; subvencionados)' };
const paquete = (await (await fetch(DATASET_MADRID, { headers: ua, signal: AbortSignal.timeout(60_000) })).json()) as {
  result: { resources: { format: string; description?: string; url: string }[] };
};
const csvs = paquete.result.resources.filter((r) => /csv/i.test(r.format) && Number(r.description?.match(/\d{4}/)?.[0] ?? 0) >= 2018);
let total = 0;
for (const r of csvs) {
  const res = await fetch(r.url, { headers: ua, signal: AbortSignal.timeout(300_000) });
  if (!res.ok) {
    console.warn(`${r.description}: HTTP ${res.status}`);
    continue;
  }
  const filas = filasMadrid(decodificarCsv(new Uint8Array(await res.arrayBuffer())));
  let musica = 0;
  for (const f of filas) {
    const c = contratoDeMadrid(f);
    if (!c || !esMusicaMadrid(c)) continue;
    musica++;
    almacen.guardar(c);
  }
  total += musica;
  console.log(`${r.description}: ${filas.length} contratos, ${musica} de música`);
}
almacen.estado.fuentes.madrid = new Date().toISOString().slice(0, 10);
almacen.escribir();
console.log(`Madrid: ${total} contratos menores de música`);
