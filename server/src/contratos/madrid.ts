import { normalizar } from '../clasificacion/musica.js';
import { leerCsv } from '../contactos.js';
import { type Contrato, esDeMusica, esPersonaFisica } from './placsp.js';

/**
 * Contratos menores del Ayuntamiento de Madrid (datos.madrid.es, un CSV por año). El Ayuntamiento no los publica
 * en la Plataforma del Estado. Tres formatos según el año: se reconocen las columnas por su nombre.
 */
export const DATASET_MADRID = 'https://datos.madrid.es/api/3/action/package_show?id=300253-0-contratos-actividad-menores';
export const PREFIJO_MADRID = 'mad-';

/** El CSV viene en UTF-8 o en Latin-1 según el año. */
export function decodificarCsv(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  return utf8.includes('�') ? new TextDecoder('latin1').decode(bytes) : utf8.replace(/^﻿/, '');
}

const clave = (x: string) => normalizar(x).replace(/[^a-z]+/g, ' ').trim();
function columna(fila: Record<string, string>, ...patrones: RegExp[]): string | null {
  for (const p of patrones) {
    const k = Object.keys(fila).find((x) => p.test(clave(x)));
    if (k && fila[k]?.trim()) return fila[k]!.replace(/\s+/g, ' ').trim();
  }
  return null;
}

/** «1.392,11 » → 1392.11 */
const importe = (x: string | null) => {
  if (!x) return null;
  const n = Number(x.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
/** «28/12/2023» o «28/12/23» → «2023-12-28» */
const fecha = (x: string | null) => {
  // Algunos años traen el año con dos cifras («23/12/21»).
  const m = x?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/);
  return m ? `${m[3]!.length === 2 ? `20${m[3]}` : m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : null;
};

/** Filas de un CSV de Madrid (salta las líneas de título que algunos años llevan antes de la cabecera). */
export function filasMadrid(texto: string): Record<string, string>[] {
  const lineas = texto.split(/\r?\n/);
  const i = lineas.findIndex((l) => /OBJETO/i.test(l) && l.includes(';'));
  return i < 0 ? [] : leerCsv(lineas.slice(i).join('\n'), ';');
}

export function contratoDeMadrid(f: Record<string, string>): Contrato | null {
  const titulo = columna(f, /^objeto/);
  const fechaAdj = fecha(columna(f, /^fecha de adjudicacion/, /^f aprobacion/, /^fecha aprobacion/));
  if (!titulo || !fechaAdj) return null;
  const registro = columna(f, /registro de contrato/, /^n recon$/, /^recon$/, /^contrato$/);
  const expediente = columna(f, /expediente/);
  const seccion = columna(f, /^centro seccion/, /^seccion/);
  const nif = columna(f, /^nif adjudicatario/, /^n i f$/, /^cif$/, /^nif$/);
  const nombre = columna(f, /^razon social/, /^contratista/);
  const persona = esPersonaFisica(nif, nombre);
  const conIva = importe(columna(f, /^importe adjudicacion/, /^importe$/));
  return {
    id: `${PREFIJO_MADRID}${normalizar(registro ?? `${expediente}-${fechaAdj}`).replace(/[^a-z0-9]+/g, '-')}`,
    expediente,
    titulo,
    estado: 'ADJ',
    menor: true,
    actualizado: fechaAdj,
    enlace: null,
    organo: {
      // El nombre lleva «Ayuntamiento de Madrid» para que se reconozca el municipio; entre paréntesis, quién contrata.
      nombre: `Ayuntamiento de Madrid${seccion ? ` (${seccion.replace(/\s*\(.*$/, '')})` : ''}`,
      dir3: null,
      nif: null,
      ciudad: 'Madrid',
      codigoPostal: null,
      web: 'https://www.madrid.es',
      jerarquia: ['Madrid', 'Comunidad de Madrid'],
    },
    tipoContrato: null,
    procedimiento: null,
    importe: null,
    importeConIva: null,
    cpv: [],
    lugar: { nuts: 'ES300', nombre: 'Madrid' },
    finPlazo: null,
    ejecucion: { inicio: null, fin: null },
    adjudicaciones: [
      // Los CSV dan el importe con IVA: no se calcula el importe sin IVA.
      { adjudicatario: persona ? null : nombre, nif: persona ? null : nif, personaFisica: persona, importe: null, importeConIva: conIva, fecha: fechaAdj, ofertas: null, lote: null },
    ],
    documentos: [],
  };
}

/** Sin CPV en los CSV: cuenta si el título habla de música (92000000 hace de CPV afín, que exige título de música). */
/** Lo que no es contratar un concierto: refuerzos de la Banda Municipal, transporte, mesas redondas, sintonías... */
const NO_ES_CONCIERTO = /\b(transporte|mesas? redondas?|composicion|colaboracion(es)? en (la|las) categoria|identidad sonora|alquiler|sonorizacion|grabacion)\b/;
export const esMusicaMadrid = (c: Pick<Contrato, 'titulo'>) =>
  !NO_ES_CONCIERTO.test(normalizar(c.titulo)) && esDeMusica({ titulo: c.titulo, cpv: ['92000000'] });
