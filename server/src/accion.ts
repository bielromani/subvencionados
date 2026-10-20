// "Qué hacer con esta ayuda": lo que el mánager necesita ver primero en la ficha de una convocatoria.
// Todo sale de datos ya guardados (BDNS, ficha de las bases si existe, frases literales de las bases); nada se inventa:
// si un dato no consta, va a null y la web no lo enseña.

import { estimarCierre } from './cierre.js';
import { type Plazo, plazo } from './emparejamiento.js';
import type { FichaBasica } from './ficha/basica.js';
import type { Ficha } from './ficha/esquema.js';
import type { Convocatoria } from './tipos.js';

export { estimarCierre } from './cierre.js';

export interface Accion {
  plazo: { estado: Plazo; texto: string; nota?: string; dias: number | null; urgente: boolean; estimado?: boolean; cierre?: string };
  cuanto: {
    importeMaximo: number | null;
    porcentajeMaximo: number | null;
    presupuesto: number | null;
    /** Lo que se concedió de verdad a cada entidad (esta edición o la anterior con concesiones). */
    concedido: { mediana: number; minimo: number; maximo: number; entidades: number; anio: number | null } | null;
  };
  quien: string[];
  /** Apartado de beneficiarios tal como lo dice el extracto o la ficha (literal, recortado). */
  quienLiteral: string | null;
  pasos: string[];
  presentacion: { lugar: string | null; url: string | null };
}

const DIA = 86_400_000;
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
let anioActual = new Date().getUTCFullYear();
/** "5 de noviembre"; con el año si no es el actual. */
const fechaLarga = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', ...(Number(iso.slice(0, 4)) !== anioActual && { year: 'numeric' }), timeZone: 'UTC' });
const diasHasta = (iso: string, hoy: Date) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${hoy.toISOString().slice(0, 10)}T00:00:00Z`)) / DIA);

function textoPlazo(c: Convocatoria, hoy: Date): Accion['plazo'] {
  anioActual = hoy.getUTCFullYear();
  const estado = c.tipo === 'directa' ? 'desconocido' : plazo(c, hoy);
  if (c.tipo === 'directa') return { estado, texto: 'Concesión directa: no hay plazo para pedirla.', dias: null, urgente: false };
  if (estado === 'proxima' && c.fechaInicioSolicitud) {
    const d = diasHasta(c.fechaInicioSolicitud, hoy);
    return { estado, texto: `Abre el ${fechaLarga(c.fechaInicioSolicitud)} (en ${d} ${d === 1 ? 'día' : 'días'}).`, dias: d, urgente: false };
  }
  if (estado === 'proxima') return { estado, texto: `Por abrir: ${c.textoInicio ?? 'depende de una publicación pendiente'}.`, dias: null, urgente: false };
  if (estado === 'abierta' && c.fechaFinSolicitud) {
    const d = diasHasta(c.fechaFinSolicitud, hoy);
    const cuando = d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`;
    return { estado, texto: `Cierra ${cuando}, el ${fechaLarga(c.fechaFinSolicitud)}.`, dias: d, urgente: d <= 7 };
  }
  if (estado === 'abierta' && !estimarCierre(c)) return { estado, texto: `Plazo abierto${c.textoFin ? `: ${c.textoFin}` : ' (sin fecha de cierre publicada)'}.`, dias: null, urgente: false };
  if (estado === 'cerrada' && c.fechaFinSolicitud) {
    const prevista = c.serie?.proximaPrevista;
    return {
      estado,
      texto: `Cerró el ${fechaLarga(c.fechaFinSolicitud!)}.`,
      ...(prevista && {
        nota: `Suele repetirse cada año: próxima prevista hacia ${new Date(`${prevista}-01T00:00:00Z`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })} (estimación a partir de años anteriores).`,
      }),
      dias: null,
      urgente: false,
    };
  }
  const est = c.fechaFinSolicitud ? null : estimarCierre(c);
  if (est) {
    const d = diasHasta(est.fecha, hoy);
    const origen =
      est.base === 'literal' ? '' : est.base === 'boletin' ? ' contando desde la publicación en el boletín' : est.base === 'inicio' ? ' contando desde el inicio del plazo' : ' contando desde su registro en la BDNS (el boletín suele publicarlo unos días después)';
    const nota = `Plazo publicado: «${c.textoFin}».${est.base === 'literal' ? '' : ` Fecha aproximada${origen}, sin festivos: confírmala en las bases.`}`;
    if (d < 0) {
      // Contado desde el registro, el cierre real es más tarde: si pasó hace poco, puede seguir abierta.
      return est.base === 'registro' && d >= -30
        ? { estado: 'desconocido', texto: `Puede que ya haya cerrado (hacia el ${fechaLarga(est.fecha)} o unos días después).`, nota, dias: null, urgente: false, estimado: true }
        : { estado: 'cerrada', texto: `Probablemente cerró hacia el ${fechaLarga(est.fecha)}.`, nota, dias: null, urgente: false, estimado: true };
    }
    return {
      estado: 'abierta',
      texto: `Cierra hacia el ${fechaLarga(est.fecha)} (${d === 0 ? 'hoy' : `en ${d} ${d === 1 ? 'día' : 'días'}`}).`,
      nota,
      dias: d,
      urgente: d <= 7,
      estimado: true,
      cierre: est.fecha,
    };
  }
  return { estado, texto: c.textoFin ?? c.textoInicio ?? 'Sin fechas publicadas: consúltalas en las bases.', dias: null, urgente: false };
}

function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}

/** Importes concedidos a entidades: los de esta edición o, si aún no hay, los de la anterior que se tenga. */
function concedido(c: Convocatoria, anteriores: Convocatoria[]): Accion['cuanto']['concedido'] {
  for (const x of [c, ...anteriores]) {
    const importes = (x.concesiones?.entidades ?? []).map((e) => e.importe).filter((i) => i > 0);
    if (importes.length >= 3) {
      return {
        mediana: mediana(importes),
        minimo: Math.min(...importes),
        maximo: Math.max(...importes),
        entidades: importes.length,
        anio: Number(x.fechaPublicacion?.slice(0, 4)) || null,
      };
    }
  }
  return null;
}

function quien(c: Convocatoria): string[] {
  const b = c.clasificacion.beneficiarios;
  const lista: string[] = [];
  if (b.entidadesLocales) lista.push('Ayuntamientos y otras entidades locales');
  if (b.empresas) lista.push('Autónomos y empresas (también agencias y productoras)');
  if (b.sinAnimoLucro) lista.push('Asociaciones y fundaciones');
  if (b.personasFisicas) lista.push('Personas físicas (músicos a título individual)');
  return lista;
}

const recortar = (t: string, n = 400) => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t);

function pasos(c: Convocatoria, hayContacto: boolean): string[] {
  const destino = c.clasificacion.destino;
  if (c.tipo === 'directa') return ['Es una concesión directa a una entidad concreta: no se puede pedir, pero dice quién tiene dinero para música.'];
  if (destino === 'programadores') {
    return [
      hayContacto
        ? 'Llama o escribe a la concejalía de cultura (contacto abajo) antes de que cierre el plazo.'
        : 'Localiza al responsable de programación de quien la pide (ayuntamientos, festivales, salas).',
      'Propón el concierto con fecha, caché cerrado y ficha técnica: así lo pueden incluir en su solicitud.',
      'Recuérdales que esta ayuda les cubre parte del coste del concierto.',
      'Si la conceden, el contrato con tu grupo suele hacerse después de la resolución: anota la fecha.',
    ];
  }
  if (destino === 'grupos') {
    return [
      'Lee las bases: requisitos, gastos que cubre y criterios de valoración.',
      'Prepara memoria del proyecto (gira, grabación, producción), presupuesto y calendario.',
      'Ten a mano certificado digital y estar al corriente con Hacienda y la Seguridad Social.',
      'Preséntala en la sede electrónica del organismo antes del cierre y guarda el justificante.',
    ];
  }
  return ['No encaja con lo que busca un mánager: revisa las bases antes de dedicarle tiempo.'];
}

export function accion(c: Convocatoria, ficha: Ficha | null, basica: FichaBasica | null, anteriores: Convocatoria[], hayContacto: boolean, hoy = new Date()): Accion {
  const d = ficha?.datos;
  const literal = (campo: 'importeMaximo' | 'porcentajeMaximo') => basica?.datos.find((x) => x.campo === campo && x.valor != null)?.valor ?? null;
  const importeMaximo = (d?.dinero.importeMaximo.valor as number | null | undefined) ?? literal('importeMaximo');
  const porcentajeMaximo = (d?.dinero.porcentajeMaximo.valor as number | null | undefined) ?? literal('porcentajeMaximo');
  const quienFicha = d?.beneficiarios.valor as string | null | undefined;
  const quienExtracto = basica?.extracto?.apartados.find((a) => a.tipo === 'beneficiarios')?.texto;
  return {
    plazo: textoPlazo(c, hoy),
    cuanto: { importeMaximo, porcentajeMaximo, presupuesto: c.presupuesto, concedido: concedido(c, anteriores) },
    quien: quien(c),
    quienLiteral: quienFicha || quienExtracto ? recortar((quienFicha || quienExtracto)!.replace(/\s+/g, ' ').trim()) : null,
    pasos: pasos(c, hayContacto),
    presentacion: {
      lugar: (d?.presentacion.lugar.valor as string | null | undefined) ?? null,
      url: (d?.presentacion.url.valor as string | null | undefined) ?? null,
    },
  };
}

/** Frase corta de cuánto dan, para la cabecera. */
export function frasesCuanto(a: Accion['cuanto']): string[] {
  const f: string[] = [];
  if (a.importeMaximo) f.push(`Hasta ${euros.format(a.importeMaximo)} por solicitud`);
  if (a.porcentajeMaximo) f.push(`hasta el ${a.porcentajeMaximo} % del coste`);
  return f;
}
