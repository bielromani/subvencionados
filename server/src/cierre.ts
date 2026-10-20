// Fecha de cierre aproximada a partir del texto libre del plazo, para las convocatorias que no publican fecha de fin.

import type { Convocatoria } from './tipos.js';

const DIA = 86_400_000;
const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cinco: 5, diez: 10, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cuarenta_y_cinco: 45,
};
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const iso = (d: Date) => d.toISOString().slice(0, 10);
function sumarDias(desde: string, n: number, habiles: boolean): string {
  const d = new Date(`${desde}T00:00:00Z`);
  // Se cuenta desde el día siguiente; en hábiles no cuentan sábados ni domingos (los festivos no se conocen).
  for (let i = 0; i < n; ) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dia = d.getUTCDay();
    if (!habiles || (dia !== 0 && dia !== 6)) i++;
  }
  return iso(d);
}
function sumarMeses(desde: string, n: number): string {
  const d = new Date(`${desde}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return iso(d);
}

export interface CierreEstimado {
  fecha: string;
  /** De dónde se cuenta: fecha escrita en el texto, publicación en el boletín, registro en la BDNS o inicio del plazo. */
  base: 'literal' | 'boletin' | 'registro' | 'inicio';
}

/**
 * Fecha de cierre a partir del texto del plazo ("15 días hábiles desde la publicación del extracto"). Es una
 * aproximación: no tiene en cuenta festivos y, sin fecha de boletín, se cuenta desde el registro en la BDNS.
 */
export function estimarCierre(c: Convocatoria): CierreEstimado | null {
  const texto = (c.textoFin ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!texto) return null;
  const literal = texto.match(/\b(\d{1,2}) de ([a-z]+) de (\d{4})\b/);
  if (literal && MESES_ES.includes(literal[2]!)) {
    return { fecha: `${literal[3]}-${String(MESES_ES.indexOf(literal[2]!) + 1).padStart(2, '0')}-${literal[1]!.padStart(2, '0')}`, base: 'literal' };
  }
  const barras = texto.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (barras) return { fecha: `${barras[3]}-${barras[2]!.padStart(2, '0')}-${barras[1]!.padStart(2, '0')}`, base: 'literal' };
  const m = texto.match(/\b(\d{1,3}|un|uno|una|dos|tres|cinco|diez|quince|veinte|treinta|cuarenta)\b(?:º|o)?\s+(dias?|mes|meses)\b\s*(habiles?|naturales?)?/);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]!) ? Number(m[1]) : NUMEROS[m[1]!]!;
  const desdeInicio = /\binicio\b/.test(texto);
  const boletin = c.anuncios.map((a) => a.fecha).filter((f): f is string => !!f).sort()[0] ?? null;
  const [desde, base]: [string | null, CierreEstimado['base']] = desdeInicio
    ? [c.fechaInicioSolicitud, 'inicio']
    : boletin
      ? [boletin, 'boletin']
      : [c.fechaPublicacion, 'registro'];
  if (!desde || n <= 0 || n > 120) return null;
  // "Desde el inicio" incluye el primer día; "desde la publicación" empieza a contar al día siguiente.
  const origen = desdeInicio ? iso(new Date(Date.parse(`${desde}T00:00:00Z`) - DIA)) : desde;
  const fecha = m[2]!.startsWith('mes') ? sumarMeses(origen, n) : sumarDias(origen, n, m[3]?.startsWith('habil') ?? false);
  return { fecha, base };
}
