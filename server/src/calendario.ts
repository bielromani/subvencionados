import { estimarCierre } from './cierre.js';
import { plazo } from './emparejamiento.js';
import { idOrganismo } from './organismos.js';
import { tituloCorto } from './titulo.js';
import type { Convocatoria, Destino } from './tipos.js';

/**
 * Calendario del promotor: cuándo abren y cierran los plazos de los concursos que puede pedir, y cuándo se
 * espera la próxima edición de los que se repiten cada año (estimación, no dato oficial).
 */
export type TipoEvento = 'abre' | 'cierra' | 'prevista';

export interface EventoCalendario {
  tipo: TipoEvento;
  /** Cierre calculado desde el texto del plazo ("15 días hábiles desde la publicación"), no publicado como fecha. */
  aproximada?: boolean;
  /** aaaa-mm-dd; en las previstas solo se sabe el mes (aaaa-mm). */
  fecha: string;
  convocatoria: {
    id: string;
    codigoBdns: string;
    titulo: string;
    tituloCorto: string;
    organo: string;
    organismoId: string;
    ambito: string;
    presupuesto: number | null;
    culturaGeneral: boolean;
    destino: Destino | null;
    /** Las previstas enlazan a la última edición. */
    anio: number | null;
  };
}

/**
 * Lo que le sirve al mánager: convocatorias abiertas a concurso (no concesiones directas a una entidad concreta)
 * que pueden pedir sus grupos o que dan dinero a quien les contrata, de estilos compatibles si son de música.
 */
export function utilParaManager(c: Convocatoria): boolean {
  const cl = c.clasificacion;
  return c.tipo !== 'directa' && cl.destino !== null && (!cl.musical || cl.estilosCompatibles.length > 0);
}

export function interesaAlPromotor(c: Convocatoria): boolean {
  return c.tipo === 'concurrencia' && utilParaManager(c);
}

function ambito(c: Convocatoria): string {
  if (c.ambitoNacional) return 'Sin restricción territorial';
  return (c.provincias.length ? c.provincias : c.ccaa).join(', ') || 'Ámbito no indicado';
}

const resumen = (c: Convocatoria): EventoCalendario['convocatoria'] => ({
  id: c.id,
  codigoBdns: c.codigoBdns,
  titulo: c.titulo,
  tituloCorto: tituloCorto(c.titulo),
  organo: c.organoNiveles.slice(1).join(' · ') || c.organo,
  organismoId: idOrganismo(c.organoNiveles),
  ambito: ambito(c),
  presupuesto: c.presupuesto,
  culturaGeneral: !c.clasificacion.musical,
  destino: c.clasificacion.destino,
  anio: Number(c.fechaPublicacion?.slice(0, 4)) || null,
});

export function calendario(convocatorias: Convocatoria[], hoy = new Date(), meses = 12): EventoCalendario[] {
  const dia = hoy.toISOString().slice(0, 10);
  const mesActual = dia.slice(0, 7);
  const limite = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + meses, 1)).toISOString().slice(0, 7);
  const eventos: EventoCalendario[] = [];
  for (const c of convocatorias) {
    if (!interesaAlPromotor(c)) continue;
    const p = plazo(c, hoy);
    // Apertura y cierre (también el cierre aproximado de las que solo dan el plazo en días).
    eventos.push(...eventosDe(c, hoy).filter((e) => e.tipo !== 'prevista'));
    // La próxima edición de una serie, desde su última convocatoria ya cerrada. Solo música: las generales de
    // cultura son demasiadas y casi todas municipales.
    const ultima = c.serie?.convocatorias.at(-1);
    if (
      c.clasificacion.musical &&
      c.serie?.proximaPrevista &&
      ultima?.id === c.id &&
      p === 'cerrada' &&
      c.serie.proximaPrevista >= mesActual &&
      c.serie.proximaPrevista < limite
    ) {
      eventos.push({ tipo: 'prevista', fecha: c.serie.proximaPrevista, convocatoria: resumen(c) });
    }
  }
  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.tipo.localeCompare(b.tipo));
}

/** Eventos de una sola convocatoria, para "añadir al calendario" desde su ficha (le interese o no al promotor). */
export function eventosDe(c: Convocatoria, hoy = new Date()): EventoCalendario[] {
  const dia = hoy.toISOString().slice(0, 10);
  const p = plazo(c, hoy);
  const eventos: EventoCalendario[] = [];
  if (c.tipo === 'directa') return eventos;
  if (p === 'proxima' && c.fechaInicioSolicitud) eventos.push({ tipo: 'abre', fecha: c.fechaInicioSolicitud, convocatoria: resumen(c) });
  if ((p === 'abierta' || p === 'proxima') && c.fechaFinSolicitud && c.fechaFinSolicitud >= dia) {
    eventos.push({ tipo: 'cierra', fecha: c.fechaFinSolicitud, convocatoria: resumen(c) });
  }
  const est = eventos.length === 0 && (p === 'desconocido' || p === 'abierta') ? estimarCierre(c) : null;
  if (est && est.fecha >= dia) eventos.push({ tipo: 'cierra', fecha: est.fecha, convocatoria: resumen(c), aproximada: est.base !== 'literal' });
  if (p === 'cerrada' && c.serie?.proximaPrevista && c.serie.proximaPrevista >= dia.slice(0, 7)) {
    eventos.push({ tipo: 'prevista', fecha: c.serie.proximaPrevista, convocatoria: resumen(c) });
  }
  return eventos;
}

const escapar = (t: string) => t.replace(/[\;,]/g, (x) => `\\${x}`).replace(/\r?\n/g, '\\n');

/** Parte las líneas a 75 octetos como pide RFC 5545 (sin cortar caracteres multibyte). */
function plegar(linea: string): string {
  const partes: string[] = [];
  let actual = '';
  for (const ch of linea) {
    if (Buffer.byteLength(actual + ch) > (partes.length ? 74 : 75)) {
      partes.push(actual);
      actual = '';
    }
    actual += ch;
  }
  partes.push(actual);
  return partes.join('\r\n ');
}

/** Exportación iCal: eventos de día completo; las previstas, el día 1 de su mes. */
export function aICal(eventos: EventoCalendario[], urlBase: string, ahora = new Date()): string {
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const TITULO: Record<TipoEvento, string> = { abre: 'Abre', cierra: 'Cierra', prevista: 'Prevista' };
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Subvencionados//Calendario//ES', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Subvenciones de música'];
  for (const e of eventos) {
    const inicio = (e.tipo === 'prevista' ? `${e.fecha}-01` : e.fecha).replace(/-/g, '');
    const d = new Date(`${e.tipo === 'prevista' ? `${e.fecha}-01` : e.fecha}T00:00:00Z`);
    const fin = new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10).replace(/-/g, '');
    const nota =
      e.tipo === 'prevista'
        ? 'Estimación a partir de los años anteriores (no es un dato oficial). '
        : e.aproximada
          ? 'Fecha aproximada calculada desde el texto del plazo, sin festivos: confírmala en las bases. '
          : '';
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${e.tipo}-${e.convocatoria.id}@subvencionados`,
      `DTSTAMP:${sello}`,
      `DTSTART;VALUE=DATE:${inicio}`,
      `DTEND;VALUE=DATE:${fin}`,
      plegar(`SUMMARY:${escapar(`${TITULO[e.tipo]}${e.aproximada ? ' (aprox.)' : ''}: ${e.convocatoria.tituloCorto}`)}`),
      plegar(`DESCRIPTION:${escapar(`${nota}${e.convocatoria.organo}. ${e.convocatoria.ambito}. BDNS ${e.convocatoria.codigoBdns}.`)}`),
      plegar(`URL:${urlBase}/#/convocatoria/${e.convocatoria.id}`),
      'END:VEVENT',
    );
  }
  lineas.push('END:VCALENDAR');
  return `${lineas.join('\r\n')}\r\n`;
}
