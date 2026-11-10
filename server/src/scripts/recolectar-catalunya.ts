// Contratos de música del Registre públic de contractes de Catalunya (datos abiertos de la Generalitat) → datos/contratos/.
// Se ejecuta en GitHub Actions (el proxy de las sesiones de trabajo bloquea transparenciacatalunya.cat).
//
//   npm run catalunya            desde la última fecha leída menos 60 días (las inscripciones llegan con retraso);
//                                la primera vez, todo el registro
//   npm run catalunya -- --todo  vuelve a leer todo el registro (al cambiar el criterio de qué es música)

import { join } from 'node:path';
import { normalizar } from '../clasificacion/musica.js';
import { config } from '../config.js';
import { AlmacenContratos } from '../contratos/almacen.js';
import type { Contrato } from '../contratos/placsp.js';
import {
  claveExpediente,
  consultaRegistre,
  contratoDeRegistre,
  DATASET_REGISTRE,
  type FilaRegistre,
  PREFIJO_REGISTRE,
} from '../contratos/registreCat.js';

const FUENTE = 'registre_cat';
const PAGINA = 20_000;

const almacen = new AlmacenContratos(join(config.rutaDatos, 'contratos'));
const ultima = almacen.estado.fuentes[FUENTE];
const todo = process.argv.includes('--todo');
const desde = ultima && !todo ? new Date(Date.parse(ultima) - 60 * 86_400_000).toISOString().slice(0, 10) : null;
const delEstado = new Set<string>();
// Datos del órgano tal como vienen en la Plataforma (NIF, DIR3, dirección): así el mismo ayuntamiento es un solo cliente.
const organos = new Map<string, Contrato['organo']>();
for (const c of almacen.contratos.values()) {
  if (c.id.startsWith(PREFIJO_REGISTRE)) continue;
  const k = claveExpediente(c);
  if (k) delEstado.add(k);
  if (c.organo.nif) organos.set(normalizar(c.organo.nombre), c.organo);
}

async function pedir(offset: number): Promise<FilaRegistre[]> {
  const url = new URL(DATASET_REGISTRE);
  url.searchParams.set('$where', consultaRegistre(desde));
  url.searchParams.set('$order', ':id');
  url.searchParams.set('$limit', String(PAGINA));
  url.searchParams.set('$offset', String(offset));
  for (let intento = 1; ; intento++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(300_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return (await r.json()) as FilaRegistre[];
    } catch (e) {
      if (intento >= 4) throw e;
      await new Promise((ok) => setTimeout(ok, intento * 10_000));
    }
  }
}

const hoy = new Date().toISOString().slice(0, 10);
const recuento = { leidas: 0, musica: 0, repetidas: 0, guardadas: 0 };
let reciente = ultima ?? '';
for (let offset = 0; ; offset += PAGINA) {
  const filas = await pedir(offset);
  for (const f of filas) {
    recuento.leidas++;
    const c = contratoDeRegistre(f);
    if (!c) continue;
    recuento.musica++;
    const k = claveExpediente(c);
    if (k && delEstado.has(k)) {
      recuento.repetidas++;
      continue;
    }
    const o = organos.get(normalizar(c.organo.nombre));
    if (o) c.organo = { ...o, nombre: c.organo.nombre };
    // Las fechas futuras son erratas del registro: no cuentan para saber hasta dónde se ha leído.
    if (c.actualizado > reciente && c.actualizado <= hoy) reciente = c.actualizado;
    if (almacen.guardar(c)) recuento.guardadas++;
  }
  console.log(`… ${offset + filas.length} filas`);
  if (filas.length < PAGINA) break;
}
if (reciente) almacen.estado.fuentes[FUENTE] = reciente;
almacen.escribir();
console.log(
  `Registre de Catalunya${desde ? ` desde ${desde}` : ''}: ${recuento.leidas} leídas, ${recuento.musica} de música, ` +
    `${recuento.repetidas} ya venían de la Plataforma, ${recuento.guardadas} nuevas o actualizadas. Total guardados: ${almacen.contratos.size}`,
);
