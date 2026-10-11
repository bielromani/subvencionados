// Contratos de música en vivo de la Plataforma de Contratación del Sector Público (datos abiertos) → datos/contratos/.
// Se ejecuta en GitHub Actions (el proxy de las sesiones de trabajo bloquea gob.es).
//
//   npm run contratos -- --fuentes                       ATOM del día: licitaciones, contratos menores y plataformas
//                                                        autonómicas agregadas, hasta la última fecha ya leída
//   npm run contratos -- --zip=FICHERO --tipo=menores    un fichero histórico mensual o anual ya descargado

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';
import { config } from '../config.js';
import { AlmacenContratos } from '../contratos/almacen.js';
import { entradas, esDeMusica, leerEntrada, siguiente } from '../contratos/placsp.js';

const BASE = 'https://contrataciondelsectorpublico.gob.es/sindicacion';
export const FUENTES = {
  licitaciones: `${BASE}/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom`,
  menores: `${BASE}/sindicacion_1143/contratosMenoresPerfilesContratantes.atom`,
  agregadas: `${BASE}/sindicacion_1044/PlataformasAgregadasSinMenores.atom`,
} as const;
type Tipo = keyof typeof FUENTES;

const { values } = parseArgs({
  options: {
    fuentes: { type: 'boolean', default: false },
    zip: { type: 'string' },
    tipo: { type: 'string', default: 'licitaciones' },
    dias: { type: 'string', default: '3' },
    paginas: { type: 'string', default: '400' },
  },
});

const almacen = new AlmacenContratos(join(config.rutaDatos, 'contratos'));
const recuento = { leidas: 0, musica: 0, guardadas: 0 };

/** Procesa un ATOM; devuelve la fecha de actualización más antigua y la más reciente que contenía. */
function procesar(atom: string, tipo: Tipo): { antigua: string | null; reciente: string | null } {
  let antigua: string | null = null;
  let reciente: string | null = null;
  for (const e of entradas(atom)) {
    const c = leerEntrada(e, tipo === 'menores');
    if (!c) continue;
    recuento.leidas++;
    if (!antigua || c.actualizado < antigua) antigua = c.actualizado;
    if (!reciente || c.actualizado > reciente) reciente = c.actualizado;
    if (!esDeMusica(c)) continue;
    recuento.musica++;
    if (almacen.guardar(c)) recuento.guardadas++;
  }
  return { antigua, reciente };
}

async function descargar(url: string): Promise<string> {
  for (let intento = 1; ; intento++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (intento >= 4) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise((ok) => setTimeout(ok, intento * 5000));
    }
  }
}

/** Recorre el ATOM de la más reciente a la más antigua hasta llegar a lo ya leído. */
async function fuente(tipo: Tipo): Promise<void> {
  const hasta =
    almacen.estado.fuentes[tipo] ?? new Date(Date.now() - Number(values.dias) * 86_400_000).toISOString();
  let url: string | null = FUENTES[tipo];
  let masReciente: string | null = null;
  for (let pagina = 1; url && pagina <= Number(values.paginas); pagina++) {
    const atom = await descargar(url);
    const { antigua, reciente } = procesar(atom, tipo);
    if (reciente && (!masReciente || reciente > masReciente)) masReciente = reciente;
    if (!antigua || antigua < hasta) break;
    url = siguiente(atom);
  }
  if (masReciente) almacen.estado.fuentes[tipo] = masReciente;
}

if (values.fuentes) {
  for (const tipo of Object.keys(FUENTES) as Tipo[]) {
    const antes = { ...recuento };
    await fuente(tipo);
    console.log(`${tipo}: ${recuento.leidas - antes.leidas} leídas, ${recuento.musica - antes.musica} de música, ${recuento.guardadas - antes.guardadas} nuevas o actualizadas`);
  }
} else if (values.zip) {
  const tipo = values.tipo as Tipo;
  if (!(tipo in FUENTES)) throw new Error(`Tipo desconocido: ${tipo}`);
  const dir = mkdtempSync(join(tmpdir(), 'placsp-'));
  try {
    execFileSync('unzip', ['-q', '-o', values.zip, '-d', dir]);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.atom'))) procesar(readFileSync(join(dir, f), 'utf8'), tipo);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const clave = `${tipo}_${basename(values.zip).match(/_(\d{4,6})\.zip$/)?.[1] ?? basename(values.zip)}`;
  if (!almacen.estado.historicos.includes(clave)) almacen.estado.historicos.push(clave);
  console.log(`${clave}: ${recuento.leidas} leídas, ${recuento.musica} de música, ${recuento.guardadas} nuevas o actualizadas`);
} else {
  console.error('Indica --fuentes o --zip=FICHERO');
  process.exit(1);
}

almacen.escribir();
console.log(`Total guardados: ${almacen.contratos.size}`);
