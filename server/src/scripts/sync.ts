// Descarga de la BDNS las convocatorias que pueden ser de música, las clasifica,
// las guarda y muestra estadísticas para medir el tamaño real del nicho.
//
//   npm run sync                       desde el 1 de enero del año pasado
//   npm run sync -- --desde=2024-01-01 --max-paginas=5 --refrescar

import { parseArgs } from 'node:util';
import { ClienteBdns, ErrorBdns } from '../bdns/cliente.js';
import { desdeBdns } from '../bdns/normalizar.js';
import { config } from '../config.js';
import { Repositorio } from '../db.js';
import type { Convocatoria } from '../tipos.js';

// La búsqueda de la BDNS es por texto del título; lanzamos varias y unimos resultados.
// El clasificador descarta después los falsos positivos (festivales de cine, "opera" verbo...).
const TERMINOS = [
  'música',
  'musica',
  'musical',
  'concierto',
  'orquesta',
  'lírica',
  'ópera',
  'zarzuela',
  'jazz',
  'festival',
];

const { values } = parseArgs({
  options: {
    desde: { type: 'string' },
    'max-paginas': { type: 'string', default: '20' },
    terminos: { type: 'string' },
    refrescar: { type: 'boolean', default: false },
  },
});

const desde = values.desde ? new Date(values.desde) : new Date(new Date().getFullYear() - 1, 0, 1);
const maxPaginas = Number(values['max-paginas']);
const terminos = values.terminos ? values.terminos.split(',') : TERMINOS;

const cliente = new ClienteBdns({ urlsBase: config.urlsBdns });
const repo = new Repositorio(config.rutaDb);

async function main() {
  console.log(`Buscando en la BDNS desde ${desde.toISOString().slice(0, 10)} (${terminos.length} términos)…`);

  const numeros = new Set<string>();
  for (const termino of terminos) {
    let encontrados = 0;
    for (let page = 0; page < maxPaginas; page++) {
      const pagina = await cliente.buscarConvocatorias({ texto: termino, fechaDesde: desde, page, pageSize: 50 });
      for (const r of pagina.content ?? []) {
        if (r.numeroConvocatoria) numeros.add(r.numeroConvocatoria);
        encontrados++;
      }
      if (pagina.last !== false || (pagina.content ?? []).length === 0) break;
    }
    console.log(`  «${termino}»: ${encontrados} resultados`);
  }

  const pendientes = [...numeros].filter((n) => values.refrescar || !repo.obtenerConvocatoria(`bdns-${n}`));
  console.log(`${numeros.size} convocatorias únicas, ${pendientes.length} por descargar en detalle.`);

  let nuevas = 0;
  let fallos = 0;
  for (const [i, numero] of pendientes.entries()) {
    try {
      const c = desdeBdns(await cliente.obtenerConvocatoria(numero));
      if (repo.guardarConvocatoria(c)) nuevas++;
    } catch (error) {
      fallos++;
      console.warn(`  ✗ ${numero}: ${(error as Error).message}`);
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${pendientes.length}`);
  }

  console.log(`\nGuardadas: ${nuevas} nuevas, ${fallos} fallos.\n`);
  imprimirEstadisticas(repo.listarConvocatorias().filter((c) => c.origen === 'bdns'));
}

function contar(valores: string[], porClave = false): string {
  const cuenta = new Map<string, number>();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  return [...cuenta.entries()]
    .sort((a, b) => (porClave ? a[0].localeCompare(b[0]) : b[1] - a[1]))
    .map(([k, n]) => `${k}: ${n}`)
    .join(' · ');
}

function imprimirEstadisticas(todas: Convocatoria[]) {
  const musicales = todas.filter((c) => c.clasificacion.musical);
  console.log('=== Estadísticas (convocatorias de la BDNS guardadas) ===');
  console.log(`Total: ${todas.length} · de música: ${musicales.length}`);
  console.log(`Por estilo compatible: ${contar(musicales.flatMap((c) => c.clasificacion.estilosCompatibles))}`);
  console.log(`Mención explícita: ${contar(musicales.flatMap((c) => c.clasificacion.estilosExplicitos))}`);
  console.log(`Por administración: ${contar(musicales.map((c) => c.administracion))}`);
  console.log(`Por comunidad: ${contar(musicales.flatMap((c) => (c.ccaa.length ? c.ccaa : ['Estatal'])))}`);
  console.log(`Encaje para un promotor: ${contar(musicales.map((c) => c.clasificacion.encajePromotor))}`);
  console.log(`Por línea: ${contar(musicales.flatMap((c) => c.clasificacion.lineas))}`);
  const porMes = musicales.map((c) => c.fechaPublicacion?.slice(0, 7) ?? 'sin fecha');
  console.log(`Por mes de publicación: ${contar(porMes, true)}`);
}

main()
  .catch((error) => {
    console.error(error instanceof ErrorBdns ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => repo.cerrar());
