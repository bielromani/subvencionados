// Importa el catálogo publicado en arsvia.org (su API pública: secciones y propuestas). Solo se copia lo que dice la
// web, literal: nombre, tipo según la sección, formato y duración, disponibilidad, necesidades técnicas y el dosier.
// La web no publica precios, así que van vacíos, y las fichas quedan «pendientes» hasta que el usuario las revise.

import type { Espectaculo, TipoEspectaculo } from './tipos.js';

export const WEB_ARSVIA = 'https://arsvia.org';

interface SeccionWeb {
  id: number;
  title_es: string;
  title_ca?: string;
}
interface MediaWeb {
  media_type: string;
  url: string;
  lang?: string;
}
interface PropuestaWeb {
  id: number;
  title_es: string;
  title_ca?: string;
  description_es?: string | null;
  description_ca?: string | null;
  media?: MediaWeb[];
}

/** Tipo del catálogo según el nombre de la sección de la web. */
export function tipoDeSeccion(titulo: string): TipoEspectaculo {
  const t = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (/opera/.test(t)) return 'opera';
  if (/coral/.test(t)) return 'sinfonico_coral';
  if (/sinfon|simfon/.test(t)) return 'sinfonica';
  if (/camara|cambra/.test(t)) return 'camara';
  if (/navidad|nadal/.test(t)) return 'navidad';
  if (/jazz|swing/.test(t)) return 'jazz';
  if (/rock/.test(t)) return 'rock';
  if (/religios|sacra/.test(t)) return 'religiosa';
  if (/festival/.test(t)) return 'festivales';
  if (/mediterr|fusio/.test(t)) return 'fusion';
  return 'otro';
}

const ENTIDADES: Record<string, string> = { '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&ndash;': '–', '&mdash;': '—' };

/** Texto plano por líneas, sin emojis decorativos al principio. */
export function lineas(html: string | null | undefined): string[] {
  return (html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h\d|li|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTIDADES[e] ?? ' ')
    .split('\n')
    .map((l) => l.replace(/^[\s\p{Extended_Pictographic}\u{FE0F}\u{200D}👉•·-]+/u, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Líneas que empiezan por una etiqueta («Duración:», «Público:»...), juntando la etiqueta suelta con la línea siguiente. */
/** Títulos de apartado sin contenido («Formato», «Formato disponible», «Duración»): no son datos. */
const SOLO_TITULO = /^(formato( disponible)?|duraci[oó]n|informaci[oó]n pr[aá]ctica|p[uú]blico)$/i;

function campos(ls: string[], etiquetas: RegExp): string[] {
  const salida: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    if (!etiquetas.test(l) || SOLO_TITULO.test(l)) continue;
    if (/:$/.test(l) && ls[i + 1]) salida.push(`${l} ${ls[i + 1]}`);
    else salida.push(l);
  }
  return [...new Set(salida)];
}

export function espectaculoDeWeb(p: PropuestaWeb, seccion: SeccionWeb, base = WEB_ARSVIA): Omit<Espectaculo, 'id'> {
  const ls = lineas(p.description_es || p.description_ca);
  const formato = campos(ls, /^(duraci[oó]n|p[uú]blico|formato( adaptable| disponible)?\b|producci[oó]n adaptable|plantilla|\(?\d+ m[uú]sicos)/i);
  const musicos = ls.find((l) => /\b\d+ m[uú]sicos\b/i.test(l) && !formato.includes(l));
  const requisitos = campos(ls, /^(necesidades t[eé]cnicas|requisitos|rider|montaje)/i);
  const disponibilidad = ls.filter(
    (l) =>
      !SOLO_TITULO.test(l) &&
      !/documento|dossier|dosier/i.test(l) &&
      /\b(disponible a partir|disponible desde|disponibilidad|condiciones especiales)\b|\b\d{1,2}(, \d{1,2})* y \d{1,2} de \w+ de \d{4}/i.test(l),
  );
  // El dosier en PDF (mejor en castellano), si no la web.
  const pdfs = (p.media ?? []).filter((m) => m.media_type === 'pdf');
  const pdf = pdfs.find((m) => m.lang === 'es') ?? pdfs[0];
  const absoluta = (u: string) => (/^https?:\/\//.test(u) ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`);
  return {
    nombre: (p.title_es || p.title_ca || '').trim(),
    tipo: tipoDeSeccion(seccion.title_es || seccion.title_ca || ''),
    formato: [musicos, ...formato].filter(Boolean).join('\n'),
    requisitos: requisitos.join('\n'),
    precioMin: null,
    precioMax: null,
    disponibilidad: disponibilidad.join('\n'),
    fechasCerradas: '',
    ambito: '',
    enlace: pdf ? absoluta(pdf.url) : base,
    estadoInfo: 'pendiente',
    revisado: null,
    origen: `arsvia.org#${p.id}`,
    enWeb: true,
  };
}

/** Descarga el catálogo de la web (secciones y propuestas de cada una). */
export async function descargarCatalogoArsvia(base = WEB_ARSVIA, pedir: typeof fetch = fetch): Promise<Omit<Espectaculo, 'id'>[]> {
  const json = async <T>(accion: string): Promise<T> => {
    const r = await pedir(`${base}/api.php?action=${accion}`, { headers: { accept: 'application/json' } });
    if (r.status === 403)
      throw new Error(
        'La web de ArsVia está bloqueando la descarga automática (error 403, probablemente el cortafuegos del alojamiento). Puedes seguir editando las fichas a mano; para volver a importar, hay que permitir el acceso a /api.php en el alojamiento de arsvia.org.',
      );
    if (!r.ok) throw new Error(`arsvia.org respondió ${r.status}`);
    return (await r.json()) as T;
  };
  const secciones = await json<SeccionWeb[]>('public_sections');
  const salida: Omit<Espectaculo, 'id'>[] = [];
  for (const s of secciones) {
    for (const p of await json<PropuestaWeb[]>(`public_concerts&section_id=${s.id}`)) {
      const e = espectaculoDeWeb(p, s, base);
      if (e.nombre) salida.push(e);
    }
  }
  return salida;
}
