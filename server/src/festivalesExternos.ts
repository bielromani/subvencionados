import { normalizar } from './clasificacion/musica.js';

/**
 * Festivales de los directorios de las asociaciones del sector (FestClásica, Redescena, REMA), tal como los publican
 * en sus webs. Solo datos de la entidad: organizador, web, teléfono y emails genéricos (info@, festival@...);
 * nunca nombres ni emails personales de quienes los dirigen.
 */
export interface FestivalExterno {
  /** De dónde viene la ficha. */
  directorio: 'FestClásica' | 'Redescena' | 'REMA';
  url: string;
  nombre: string;
  municipio: string | null;
  provincia: string | null;
  ccaa: string | null;
  organizador: string | null;
  web: string | null;
  telefono: string | null;
  email: string | null;
  /** Fechas de la última edición publicada (aaaa-mm-dd), si las hay. */
  inicio: string | null;
  fin: string | null;
  /** Lo que dice la ficha (recortado). */
  descripcion: string | null;
}

const decodificar = (t: string) =>
  t
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z])(acute|grave|tilde|uml|cedil);/gi, (_, l) => l);

/** Texto de la página en líneas (sin scripts ni estilos). */
export function lineas(html: string): string[] {
  return decodificar(
    html
      .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '\n'),
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Solo emails de la entidad (info@, festival@, prensa@...), no los que llevan nombre de una persona. */
const EMAIL_GENERICO = /^(info|informacion|informacio|festival|festivales|contact|contacto|contacte|hola|hello|admin|administracion|administracio|oficina|secretaria|secretaria\w*|prensa|premsa|comunicacion|comunicacio|press|produccion|produccio|cultura|taquilla|entradas|tickets|programacion|programacio|musica|music|direccion|direccio|gestion|gestio)[\w.-]*$/i;
export function emailGenerico(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase();
  if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return EMAIL_GENERICO.test(e.split('@')[0]!) ? e : null;
}

const web = (x: string | null | undefined) => {
  const w = x?.trim().replace(/[),.;]+$/, '');
  if (!w || !/^(https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(w)) return null;
  return /^https?:\/\//i.test(w) ? w : `https://${w}`;
};
const telefono = (x: string | null | undefined) => {
  const t = x?.replace(/[\s.-]/g, '').replace(/^(\+34|0034)/, '');
  // Fijos (8 y 9); los móviles (6 y 7) pueden ser personales.
  return t && /^[89]\d{8}$/.test(t) ? t.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3') : null;
};
/** Hasta `n` caracteres, cortando en la última frase completa (o, si no hay, en la última palabra). */
function recorte(t: string | undefined, n = 700): string | null {
  if (!t) return null;
  if (t.length <= n) return t;
  const trozo = t.slice(0, n);
  const fin = Math.max(trozo.lastIndexOf('. '), trozo.lastIndexOf('.\n'));
  return fin > n / 3 ? trozo.slice(0, fin + 1) : `${trozo.replace(/\s+\S*$/, '')}…`;
}

/** El valor que sigue a una etiqueta («Teléfono» / «: 935 038 646»). */
function tras(ls: string[], etiqueta: RegExp): string | null {
  const i = ls.findIndex((l) => etiqueta.test(l));
  if (i < 0) return null;
  for (const l of ls.slice(i + 1, i + 4)) {
    const v = l.replace(/^:\s*/, '').trim();
    if (v) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// FestClásica: https://www.festclasica.com/es/festivales.html y una ficha por festival.

export const FESTCLASICA = 'https://www.festclasica.com/es/festivales.html';

export const enlacesFestclasica = (html: string) => [
  ...new Set([...html.matchAll(/https:\/\/www\.festclasica\.com\/es\/festivales\/c\/\d+[^"'\s<>]*/g)].map((m) => m[0])),
];

const fechaCorta = (d: string, m: string, a: string) => `20${a}-${m}-${d}`;

export function fichaFestclasica(html: string, url: string): FestivalExterno | null {
  const nombre = decodificar(html.match(/<title>([^<|]+)/i)?.[1] ?? '').trim();
  if (!nombre) return null;
  const ls = lineas(html);
  const i = ls.findIndex((l) => l === nombre);
  const cuerpo = i >= 0 ? ls.slice(i) : ls;
  const fechas = [...cuerpo.slice(0, 6).join(' ').matchAll(/(\d{2})\.(\d{2})\.(\d{2})\b/g)];
  const iCcaa = cuerpo.findIndex((l) => /^Comunidad Aut[oó]noma$/i.test(l));
  const email = cuerpo.join(' ').match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g)?.map(emailGenerico).find(Boolean) ?? null;
  return {
    directorio: 'FestClásica',
    url,
    nombre,
    ccaa: iCcaa >= 0 ? (cuerpo[iCcaa + 1] ?? null) : null,
    municipio: iCcaa >= 0 ? (cuerpo[iCcaa + 2] ?? null) : null,
    provincia: null,
    organizador: tras(cuerpo, /^Entidad organizadora$/i),
    web: web(tras(cuerpo, /^P[aá]gina web$/i)),
    telefono: telefono(tras(cuerpo, /^Tel[eé]fono$/i)),
    email,
    inicio: fechas[0] ? fechaCorta(fechas[0][1]!, fechas[0][2]!, fechas[0][3]!) : null,
    fin: fechas[1] ? fechaCorta(fechas[1][1]!, fechas[1][2]!, fechas[1][3]!) : null,
    descripcion: recorte(cuerpo.find((l) => l.length > 200)),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Redescena: festivales socios de La Red (https://www.redescena.net/festivales-socios/?pagina=N). Solo los de música.

export const REDESCENA = 'https://www.redescena.net/festivales-socios/';

export const enlacesRedescena = (html: string) => [
  ...new Set([...html.matchAll(/https:\/\/www\.redescena\.net\/festival\/\d+\/[^"'\s<>]+/g)].map((m) => m[0])),
];

export function fichaRedescena(html: string, url: string): FestivalExterno | null {
  const ls = lineas(html);
  const i = ls.findIndex((l) => l === 'VOLVER');
  if (i < 0) return null;
  const [nombre, genero] = [ls[i + 1], ls[i + 2]];
  if (!nombre || !genero || !/m[uú]sica/i.test(genero)) return null;
  const iLugar = ls.slice(i, i + 8).findIndex((l) => /^.+\(.+\)$/.test(l));
  const lugar = iLugar >= 0 ? ls[i + iLugar]! : null;
  const contacto = ls.findIndex((l) => /^INFORMACI[OÓ]N DE CONTACTO$/i.test(l));
  const fin = ls.findIndex((l) => /^DESCRIPCI[OÓ]N$/i.test(l));
  const datos = contacto >= 0 ? ls.slice(contacto + 1, fin > contacto ? fin : contacto + 12) : [];
  const desc = fin >= 0 ? ls.slice(fin + 1, fin + 12).join(' ') : undefined;
  return {
    directorio: 'Redescena',
    url,
    nombre,
    municipio: lugar ? lugar.replace(/\s*\(.*$/, '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : null,
    provincia: lugar?.match(/\(([^)]+)\)/)?.[1] ?? null,
    ccaa: iLugar >= 0 ? (ls[i + iLugar + 1] ?? null) : null,
    organizador: null,
    web: web(datos.find((l) => /^(https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(l) && !l.includes('@'))),
    telefono: datos.map(telefono).find(Boolean) ?? null,
    email: datos.map(emailGenerico).find(Boolean) ?? null,
    inicio: null,
    fin: null,
    descripcion: recorte(desc),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// REMA (red europea de música antigua): miembros de España que son festivales.

export const REMA = 'https://www.rema-eemn.net/members/?country_codes%5B%5D=ES';

export function miembrosRema(html: string): { nombre: string; url: string }[] {
  const salida: { nombre: string; url: string }[] = [];
  for (const b of html.split(/class=['"]bloc /).slice(1)) {
    const tipo = b.match(/class="text-uppercase">([^<]+)</)?.[1]?.trim();
    const enlace = b.match(/href="(\/members\/[^"]+)">([^<]+)</);
    const pais = b.match(/class="country[^"]*">([^<]+)</)?.[1]?.trim();
    if (!enlace || !/festival/i.test(tipo ?? '') || (pais && pais !== 'Spain')) continue;
    salida.push({ nombre: decodificar(enlace[2]!).trim(), url: `https://www.rema-eemn.net${enlace[1]}` });
  }
  return salida;
}

const SOCIALES = /(facebook|twitter|instagram|youtube|linkedin|x\.com|tiktok|vimeo|rema-eemn|amazonaws|google|spotify|flickr)/i;
export function fichaRema(html: string, base: { nombre: string; url: string }): FestivalExterno {
  const enlaces = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]!).filter((h) => !SOCIALES.test(h));
  const nombre = base.nombre === base.nombre.toUpperCase() ? base.nombre.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : base.nombre;
  const email = [...html.matchAll(/mailto:([^"?]+)/g)].map((m) => emailGenerico(m[1])).find(Boolean) ?? null;
  return { directorio: 'REMA', url: base.url, nombre, municipio: null, provincia: null, ccaa: null, organizador: null, web: web(enlaces[0]), telefono: null, email, inicio: null, fin: null, descripcion: null };
}

/** Clave para casar un festival de un directorio con los que salen de contratos y subvenciones. */
export const claveNombreFestival = (nombre: string) =>
  normalizar(nombre)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(festival|festivales|internacional|nacional|de|del|la|el|los|las|y|i|d|l|en|musica|music|ciclo|[ivxlc]+)\b/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
