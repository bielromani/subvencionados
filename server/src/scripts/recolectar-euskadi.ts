// Contratos de música del sector público vasco (API de datos abiertos de Euskadi) → datos/contratos/.
// La API no filtra y da 10 por página (unas 73.000 páginas): se recorre con unas pocas peticiones a la vez y se
// guarda por dónde va, para seguir en la siguiente ejecución si se acaba el tiempo. Al terminar empieza otra vuelta.
//
//   npm run euskadi -- --minutos=320

import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { config } from '../config.js';
import { AlmacenContratos } from '../contratos/almacen.js';
import { API_EUSKADI, type ContratoEuskadi, contratoDeEuskadi, idPoder, type PoderEuskadi } from '../contratos/euskadi.js';
import { esDeMusica } from '../contratos/placsp.js';

const { values } = parseArgs({ options: { minutos: { type: 'string', default: '320' }, simultaneas: { type: 'string', default: '6' } } });
const hasta = Date.now() + Number(values.minutos) * 60_000;
const almacen = new AlmacenContratos(join(config.rutaDatos, 'contratos'));
const CURSOR = 'euskadi_pagina';

async function json<T>(url: string): Promise<T | null> {
  for (let intento = 1; intento <= 4; intento++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      if (r.status === 404) return null;
      if (r.ok) return (await r.json()) as T;
    } catch {
      /* reintento */
    }
    await new Promise((ok) => setTimeout(ok, intento * 3000));
  }
  return null;
}

// Poderes adjudicadores (unos 950): nombre, NIF, dirección y web.
const poderes = new Map<string, PoderEuskadi>();
for (let p = 1; ; p++) {
  const r = await json<{ items?: PoderEuskadi[]; totalPages?: number }>(`${API_EUSKADI}/contracting-authorities?_page=${p}`);
  for (const x of r?.items ?? []) poderes.set(String(x.id), x);
  if (!r?.items?.length || p >= (r.totalPages ?? 0)) break;
}
console.log(`Poderes adjudicadores: ${poderes.size}`);

const primera = await json<{ totalPages: number }>(`${API_EUSKADI}/contracts?_page=1`);
const total = primera?.totalPages ?? 0;
if (!total) throw new Error('La API de Euskadi no responde');
// Se retrocede un poco: los contratos nuevos desplazan las páginas.
let pagina = Math.max(1, Number(almacen.estado.fuentes[CURSOR] ?? '1') - 30);
const recuento = { paginas: 0, leidos: 0, musica: 0, guardados: 0, sinPoder: 0 };

async function trabajador() {
  while (Date.now() < hasta && pagina <= total) {
    const p = pagina++;
    const r = await json<{ items?: ContratoEuskadi[] }>(`${API_EUSKADI}/contracts?_page=${p}`);
    recuento.paginas++;
    for (const item of r?.items ?? []) {
      recuento.leidos++;
      const id = idPoder(item);
      let poder = id ? poderes.get(id) : undefined;
      if (id && !poder) {
        poder = (await json<PoderEuskadi>(`${API_EUSKADI}/contracting-authorities/${id}`)) ?? undefined;
        if (poder) poderes.set(id, poder);
      }
      if (!poder) recuento.sinPoder++;
      const c = contratoDeEuskadi(item, poder);
      if (!c || !esDeMusica(c)) continue;
      recuento.musica++;
      if (almacen.guardar(c)) recuento.guardados++;
    }
    if (recuento.paginas % 2000 === 0) console.log(`… página ${p} de ${total}: ${recuento.musica} de música`);
  }
}
await Promise.all(Array.from({ length: Number(values.simultaneas) }, trabajador));

const terminada = pagina > total;
almacen.estado.fuentes[CURSOR] = terminada ? '1' : String(pagina);
if (terminada) almacen.estado.fuentes.euskadi_vuelta = new Date().toISOString().slice(0, 10);
almacen.escribir();
console.log(
  `Euskadi: ${recuento.paginas} páginas, ${recuento.leidos} contratos, ${recuento.musica} de música, ${recuento.guardados} nuevos o actualizados` +
    `${recuento.sinPoder ? `, ${recuento.sinPoder} sin poder adjudicador` : ''}. ${terminada ? 'Vuelta completa.' : `Sigue en la página ${pagina} de ${total}.`}`,
);
