// Cartas y correos de la secuencia (cinco envíos escritos), generados con plantillas, sin IA. Tono personal, natural y
// concreto; nunca dan por cerrados precios, fechas ni financiación: las subvenciones se ofrecen como apoyo opcional y
// las condiciones se concretan en la conversación.

import type { Estilo } from '../tipos.js';
import { componerCarta, componerSeguimiento } from './cartas.js';
import type { AjustesCrm, Certeza, Entidad, Espectaculo, TipoEspectaculo, TipoOportunidad } from './tipos.js';

export interface DatosCarta {
  paso: number;
  entidad: Pick<Entidad, 'nombre' | 'persona' | 'municipio' | 'idioma' | 'tipo'>;
  oportunidad: { tipo: TipoOportunidad; titulo: string; certeza: Certeza };
  espectaculos: Pick<Espectaculo, 'nombre' | 'tipo' | 'enlace' | 'estadoInfo' | 'textoCarta' | 'textoCartaCa'>[];
  /** Convocatoria relacionada (si la oportunidad sale de una ayuda). */
  ayuda?: { titulo: string; enlace: string | null } | null;
  ajustes: AjustesCrm;
  /** Asunto de la primera carta (para los seguimientos). */
  asuntoInicial?: string;
  /** Estilos que ha programado la entidad. */
  historial?: Estilo[];
}

export const NOMBRE_TIPO: Record<'es' | 'ca', Record<TipoEspectaculo, string>> = {
  es: {
    opera: 'ópera',
    sinfonico_coral: 'repertorio sinfónico-coral',
    sinfonica: 'repertorio sinfónico',
    fusion: 'música mediterránea y fusión lírica',
    religiosa: 'música religiosa',
    camara: 'música de cámara',
    jazz: 'jazz',
    rock: 'rock clásico',
    navidad: 'programación de Navidad',
    festivales: 'diseño y gestión de festivales',
    otro: 'otras propuestas',
  },
  ca: {
    opera: 'òpera',
    sinfonico_coral: 'repertori simfònico-coral',
    sinfonica: 'repertori simfònic',
    fusion: 'música mediterrània i fusió lírica',
    religiosa: 'música religiosa',
    camara: 'música de cambra',
    jazz: 'jazz',
    rock: 'rock clàssic',
    navidad: 'programació de Nadal',
    festivales: 'disseny i gestió de festivals',
    otro: 'altres propostes',
  },
};

function lista(xs: string[], y: string): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} ${y} ${xs.at(-1)}`;
}

/** «Ayuntamiento de Lugo» → «el Ayuntamiento de Lugo»; para el saludo, la persona si se conoce. */
export function saludoA(persona: string | null, idioma: 'es' | 'ca'): string {
  if (persona) return idioma === 'ca' ? `Benvolgut/da ${persona},` : `Estimado/a ${persona}:`;
  return idioma === 'ca' ? 'Bon dia,' : 'Buenos días:';
}
const saludo = (e: DatosCarta['entidad'], idioma: 'es' | 'ca') => saludoA(e.persona, idioma);

function propuestas(d: DatosCarta, idioma: 'es' | 'ca'): string {
  const xs = d.espectaculos.slice(0, 4);
  if (xs.length === 0) return '';
  return xs
    .map((x) => `- ${x.nombre} (${NOMBRE_TIPO[idioma][x.tipo]})${x.enlace ? `: ${x.enlace}` : ''}`)
    .join('\n');
}

/** Frase sobre la ayuda: opcional y prudente; solo afirma la concesión si está confirmada oficialmente. */
function fraseAyuda(d: DatosCarta, idioma: 'es' | 'ca'): string {
  if (!d.ayuda) return '';
  const t = d.ayuda.titulo;
  if (d.oportunidad.certeza === 'confirmada') {
    return idioma === 'ca'
      ? `Hem vist que consta la concessió de la convocatòria «${t}». Si us sembla oportú, podríem estudiar com encaixar-hi aquesta proposta.`
      : `Hemos visto que consta la concesión de la convocatoria «${t}». Si os parece oportuno, podríamos estudiar cómo encajar en ella esta propuesta.`;
  }
  return idioma === 'ca'
    ? `D'altra banda, hem detectat una convocatòria («${t}») que potser podria facilitar la programació d'aquesta proposta. Si ho considereu interessant, en podem estudiar conjuntament les possibilitats, sense cap compromís.`
    : `Por otra parte, hemos detectado una convocatoria («${t}») que quizá podría facilitar la programación de esta propuesta. Si lo consideráis interesante, podemos estudiar conjuntamente las posibilidades, sin ningún compromiso.`;
}

export function firmaDe(a: AjustesCrm, idioma: 'es' | 'ca'): string {
  if (a.firma.trim()) return a.firma.trim();
  const lineas = [a.remitente, a.organizacion, a.telefono, a.email, a.web].filter((x) => x.trim());
  return lineas.length ? lineas.join('\n') : idioma === 'ca' ? '[La teva signatura]' : '[Tu firma]';
}

/**
 * Carta de una oportunidad creada a mano: la primera, por bloques con las plantillas de la cuenta; los seguimientos,
 * breves y con el asunto de la primera.
 */
export function generarCarta(d: DatosCarta): { asunto: string; cuerpo: string } {
  const lugar = d.entidad.municipio ?? d.entidad.nombre;
  if (d.paso > 1) return componerSeguimiento(d.paso, { idioma: d.entidad.idioma, lugar, persona: d.entidad.persona, ajustes: d.ajustes }, d.asuntoInicial ?? lugar);
  return componerCarta({
    idioma: d.entidad.idioma,
    lugar,
    persona: d.entidad.persona,
    historial: d.historial ?? [],
    espectaculos: d.espectaculos.map((e, i) => ({ id: String(i), ...e })),
    licitaciones: d.oportunidad.tipo === 'licitacion' ? [{ titulo: d.oportunidad.titulo, fin: null }] : [],
    ayudas: d.ayuda ? [{ titulo: d.ayuda.titulo }] : [],
    gestion: d.oportunidad.tipo === 'gestion_festival',
    ajustes: d.ajustes,
  });
}
