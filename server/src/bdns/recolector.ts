// Recolección de convocatorias de música de la BDNS:
// 1. Descubrir: listados baratos (hasta 10.000 por petición) de la finalidad Cultura
//    y de búsquedas por texto en todas las finalidades. Se filtra por el título.
// 2. Descargar el detalle y las concesiones de cada convocatoria nueva.
// 3. Refrescar las recientes, cuyas fechas, plazos y concesiones aún cambian.

import { clasificar } from '../clasificacion/musica.js';
import type { Almacen } from './almacen.js';
import { type ClienteBdns, ErrorBdns, FINALIDAD_CULTURA } from './cliente.js';
import { anonimizarConcesion, type RegistroBdns } from './normalizar.js';
import type { BdnsResultadoBusqueda } from './tipos.js';

// La búsqueda de la BDNS no distingue tildes pero busca subcadenas ("opera" encuentra
// "cooperación"): el clasificador descarta después el ruido mirando el título.
export const TERMINOS = [
  'musica',
  'musical',
  'concierto',
  'concert',
  'orquesta',
  'orquestra',
  'sinfonica',
  'filarmonica',
  'jazz',
  'lirica',
  'opera',
  'zarzuela',
  'coral',
  'orfeon',
  'escolania',
  'recital',
  'festival',
  'musika',
  'conservatorio',
];

/** El título (y su versión en lengua cooficial) indica que puede ser de música. */
export function pareceMusical(r: BdnsResultadoBusqueda): boolean {
  return clasificar({ texto: [r.descripcion, r.descripcionLeng].filter(Boolean).join('\n') }).musical;
}

export interface OpcionesRecoleccion {
  cliente: ClienteBdns;
  almacen: Almacen;
  desde: Date;
  hasta: Date;
  /** Se para ordenadamente al agotar este tiempo; lo que falte queda en pendientes. */
  limiteMs: number;
  /** Vuelve a descargar las publicadas en los últimos N días. */
  refrescarDias: number;
  /** Cada cuántas descargas se escriben los ficheros. */
  guardarCada?: number;
  ahora?: () => Date;
  log?: (mensaje: string) => void;
}

export interface ResultadoRecoleccion {
  descubiertas: number;
  nuevas: number;
  refrescadas: number;
  fallidas: string[];
  pendientes: number;
  completada: boolean;
}

const dia = (d: Date) => d.toISOString().slice(0, 10);

/** Ventanas de un año natural como máximo, para no superar los 10.000 resultados por página. */
export function ventanasAnuales(desde: Date, hasta: Date): [Date, Date][] {
  const ventanas: [Date, Date][] = [];
  let inicio = new Date(desde);
  while (inicio <= hasta) {
    const finAnio = new Date(inicio.getFullYear(), 11, 31);
    const fin = finAnio < hasta ? finAnio : hasta;
    ventanas.push([inicio, fin]);
    inicio = new Date(inicio.getFullYear() + 1, 0, 1);
  }
  return ventanas;
}

export async function recolectar(o: OpcionesRecoleccion): Promise<ResultadoRecoleccion> {
  const log = o.log ?? console.log;
  const ahora = o.ahora ?? (() => new Date());
  const inicio = Date.now();
  const quedaTiempo = () => Date.now() - inicio < o.limiteMs;

  // 1. Descubrir
  const encontradas = new Map<string, BdnsResultadoBusqueda>();
  const anotar = (resultados: BdnsResultadoBusqueda[]) => {
    for (const r of resultados) if (r.numeroConvocatoria && pareceMusical(r)) encontradas.set(r.numeroConvocatoria, r);
  };
  for (const [desde, hasta] of ventanasAnuales(o.desde, o.hasta)) {
    const cultura = await o.cliente.buscarTodas({ finalidad: FINALIDAD_CULTURA, fechaDesde: desde, fechaHasta: hasta });
    anotar(cultura);
    log(`Cultura ${dia(desde)} → ${dia(hasta)}: ${cultura.length} convocatorias`);
  }
  for (const termino of TERMINOS) {
    const resultados = await o.cliente.buscarTodas({ texto: termino, fechaDesde: o.desde, fechaHasta: o.hasta });
    anotar(resultados);
    log(`«${termino}»: ${resultados.length} resultados`);
  }
  log(`Con título musical: ${encontradas.size}`);

  const estado = o.almacen.estado;
  const pendientes = new Set(estado.pendientes);
  for (const numero of encontradas.keys()) if (!o.almacen.registros.has(numero)) pendientes.add(numero);
  estado.descubiertoHasta = dia(o.hasta);

  // 2 y 3. Descargar las nuevas (las más recientes primero) y refrescar las recientes.
  const limiteRefresco = dia(new Date(ahora().getTime() - o.refrescarDias * 86_400_000));
  const refrescar = [...o.almacen.registros.values()]
    .filter((r) => (r.detalle.fechaRecepcion ?? '') >= limiteRefresco)
    .map((r) => r.detalle.codigoBDNS!)
    .filter((n) => n && !pendientes.has(n));
  const cola = [
    ...[...pendientes].sort((a, b) => b.localeCompare(a, 'es', { numeric: true })),
    ...refrescar,
  ];
  log(`Por descargar: ${pendientes.size} nuevas y ${refrescar.length} para refrescar`);

  const resultado: ResultadoRecoleccion = {
    descubiertas: encontradas.size,
    nuevas: 0,
    refrescadas: 0,
    fallidas: [],
    pendientes: 0,
    completada: false,
  };
  const guardarCada = o.guardarCada ?? 200;
  let hechas = 0;

  for (const numero of cola) {
    if (!quedaTiempo()) break;
    try {
      const detalle = await o.cliente.obtenerConvocatoria(numero);
      const concesiones = (await o.cliente.concesionesDe(numero)).map(anonimizarConcesion);
      const marca = ahora().toISOString();
      const registro: RegistroBdns = { detalle, concesiones, primeraDescarga: marca, actualizado: marca };
      const eraNueva = !o.almacen.registros.has(numero);
      o.almacen.guardar(registro);
      if (eraNueva) resultado.nuevas++;
      else resultado.refrescadas++;
      pendientes.delete(numero);
    } catch (error) {
      resultado.fallidas.push(numero);
      log(`  ✗ ${numero}: ${(error as Error).message.split('\n').slice(0, 2).join(' ')}`);
      // Un error permanente (404...) se descarta; uno temporal se reintenta en la próxima ejecución.
      if (error instanceof ErrorBdns && error.permanente) pendientes.delete(numero);
    }
    if (++hechas % guardarCada === 0) {
      estado.pendientes = [...pendientes];
      o.almacen.escribir();
      log(`  ${hechas}/${cola.length} (${Math.round((Date.now() - inicio) / 60_000)} min)`);
    }
  }

  estado.pendientes = [...pendientes];
  estado.ultimaEjecucion = ahora().toISOString();
  o.almacen.escribir();
  resultado.pendientes = pendientes.size;
  resultado.completada = pendientes.size === 0;
  return resultado;
}
