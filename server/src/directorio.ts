import { clasificar, normalizar } from './clasificacion/musica.js';
import type { ContratoVista } from './contratos/vista.js';
import type { Convocatoria, Estilo } from './tipos.js';

/**
 * Dónde tocar: programadores públicos, festivales y ciclos, y circuitos, construidos solo con nuestros datos
 * (contratos de la Plataforma de Contratación y subvenciones de la BDNS). Cada ficha lleva sus fuentes.
 */

export interface Fuente {
  tipo: 'contrato' | 'convocatoria' | 'concesion';
  /** Id del contrato o de la convocatoria (para enlazar a su ficha). */
  id: string;
  titulo: string;
  fecha: string | null;
  importe: number | null;
  /** En una concesión, quién la recibió. */
  beneficiario?: string;
}

const anio = (f: string | null) => (f ? Number(f.slice(0, 4)) : null);
const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return o.length % 2 ? o[(o.length - 1) / 2]! : (o[o.length / 2 - 1]! + o[o.length / 2]!) / 2;
};

// ---------------------------------------------------------------------------------------------------------------
// Programadores: órganos públicos que contratan música en vivo.

export interface Programador {
  id: string;
  nombre: string;
  ciudad: string | null;
  provincia: string | null;
  codigoProvincia: string | null;
  ccaa: string | null;
  web: string | null;
  contratos: number;
  menores: number;
  adjudicado: number;
  /** Importe habitual por contrato (mediana de lo adjudicado sin IVA). */
  importeHabitual: number | null;
  /** Contratos que mencionan cada estilo. */
  estilos: Partial<Record<Estilo, number>>;
  empresas: number;
  primero: string | null;
  ultimo: string | null;
  /** Meses del año en que más contrata (1-12), de más a menos. */
  meses: number[];
  recientes: Fuente[];
}

const claveOrgano = (c: ContratoVista) => c.organo.nif ?? c.organo.dir3 ?? normalizar(`${c.organo.nombre} ${c.organo.ciudad ?? ''}`);

export function programadores(contratos: ContratoVista[]): Programador[] {
  const grupos = new Map<string, ContratoVista[]>();
  for (const c of contratos) {
    if (!c.adjudicaciones.length) continue;
    const k = claveOrgano(c);
    grupos.set(k, [...(grupos.get(k) ?? []), c]);
  }
  return [...grupos].map(([id, lista]) => {
    const orden = [...lista].sort((a, b) => (b.fechaAdjudicacion ?? b.actualizado).localeCompare(a.fechaAdjudicacion ?? a.actualizado));
    const c0 = orden[0]!;
    const estilos: Partial<Record<Estilo, number>> = {};
    for (const c of lista) for (const e of c.estilos) estilos[e] = (estilos[e] ?? 0) + 1;
    const meses = new Map<number, number>();
    for (const c of lista) {
      const m = Number((c.fechaAdjudicacion ?? '').slice(5, 7));
      if (m) meses.set(m, (meses.get(m) ?? 0) + 1);
    }
    const fechas = lista.map((c) => c.fechaAdjudicacion).filter((x): x is string => !!x).sort();
    return {
      id: `p-${id.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      nombre: c0.organo.nombre,
      ciudad: c0.organo.ciudad,
      provincia: c0.provincia,
      codigoProvincia: c0.codigoProvincia,
      ccaa: c0.ccaa,
      web: c0.organo.web,
      contratos: lista.length,
      menores: lista.filter((c) => c.menor).length,
      adjudicado: lista.reduce((s, c) => s + (c.adjudicado ?? 0), 0),
      importeHabitual: mediana(lista.map((c) => c.adjudicado).filter((x): x is number => x != null && x > 0)),
      estilos,
      empresas: new Set(lista.flatMap((c) => c.adjudicaciones.map((a) => a.nif ?? a.adjudicatario ?? 'pf'))).size,
      primero: fechas[0] ?? null,
      ultimo: fechas.at(-1) ?? null,
      meses: [...meses].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m),
      recientes: orden.slice(0, 10).map((c) => ({
        tipo: 'contrato' as const,
        id: c.id,
        titulo: c.titulo,
        fecha: c.fechaAdjudicacion,
        importe: c.adjudicado,
      })),
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Festivales y ciclos: nombres sacados de los títulos de contratos y convocatorias y de los beneficiarios.

export interface Festival {
  id: string;
  nombre: string;
  /** Nombre del festival que menciona música, jazz, clásica, ópera...; si no, es multidisciplinar o de fiestas. */
  musical: boolean;
  estilos: Estilo[];
  lugar: string | null;
  provincia: string | null;
  ccaa: string | null;
  /** Quién lo organiza o lo financia (órganos de contratación, convocantes o beneficiarios). */
  organizadores: string[];
  anios: number[];
  dinero: number;
  fuentes: Fuente[];
}

const TIPO_EVENTO = '(festival|festivals|festivales|ciclo|cicle|ciclos|certamen|certamenes|muestra|mostra|temporada|semana|setmana|jornadas)';
const NOMBRE_EVENTO = new RegExp(
  `\\b${TIPO_EVENTO}\\b((?:\\s+(?:internacional|internacionales|nacional|municipal|provincial|de|del|de la|de las|de los|d'|dels|y|e|i)\\b)*\\s+[^,.;:()\\n«»"“”\\[\\]]{2,70})`,
  'i',
);
/** Donde acaba el nombre: fechas, lugares, finalidades... */
const CORTE =
  /\s+(?:\d{4}|[12]\d{3}\/\d{2,4}|a celebrar|que se|que tendr|que tendra|que tendrá|para|con motivo|dentro|en el marco|el d[ií]a|los d[ií]as|del d[ií]a|durante|organizad|a cargo|incluid|mediante|por importe|en la localidad|edici[oó]n)\b.*$/i;
const ORDINAL = /^(?:[ivxlc]+|\d+\.?[ºªo]?|primer|primera|segunda|segundo|tercer|tercera)\s+/i;
const MUSICA_EN_NOMBRE =
  /\b(musica|musicas|music|musical|musicales|jazz|blues|clasica|clasico|opera|lirica|zarzuela|orquesta|orquestra|sinfonic|filarmonic|camara|coral|coros|coro|corales|voces|canto|guitarra|piano|organo|barroc|antigua|antiga|cuerda|flamenco|cantautor|bandas|banda)\b/;

/** Nombre de festival o ciclo en un texto, sin año ni ordinal ("XXIX Festival de Jazz de Vitoria 2026" → "Festival de Jazz de Vitoria"). */
export function nombreDeEvento(texto: string): string | null {
  const m = texto.replace(/\s+/g, ' ').match(NOMBRE_EVENTO);
  if (!m) return null;
  const tipo = m[1]!;
  let resto = m[2]!.replace(CORTE, '').trim();
  resto = resto.replace(/(\s+(de|del|de la|y|e|i|en|a|d'|l'|la|el))+$/i, '').replace(/['’]$/, '').trim();
  if (resto.split(' ').length < 1 || normalizar(resto).length < 3) return null;
  // Sin ordinales al final ("Días Musicales XII") y sin MAYÚSCULAS sostenidas.
  resto = resto.replace(/\s+(?:[ivxlc]+|\d+\.?[ºª]?)$/i, '').trim();
  if (resto === resto.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(resto)) {
    resto = resto.toLowerCase().replace(/(^|\s)(\p{L})/gu, (x, a, b) => a + b.toUpperCase()).replace(/\b(De|Del|La|Las|Los|Y|E|I|En)\b/g, (x) => x.toLowerCase());
  }
  if (/\b(deporte|deportivo|deportiva|gastronomic|cine|teatro|teatre|danza|dansa|circo|titeres|libro|moda|cerveza|vino)\b/i.test(normalizar(resto)) && !MUSICA_EN_NOMBRE.test(normalizar(resto))) return null;
  if (/^\d/.test(resto)) return null;
  const nombre = `${tipo[0]!.toUpperCase()}${tipo.slice(1).toLowerCase()} ${resto}`.replace(ORDINAL, '');
  // Nombres genéricos que no identifican ningún festival.
  if (/^(festival|festivales|ciclo|temporada|semana|jornadas|muestra|certamen)( de)?( (musica|musical|musicales|conciertos?|actuaciones?))?( de)?( (verano|invierno|otono|primavera|navidad|fiestas?))?$/i.test(normalizar(nombre))) return null;
  return nombre.length > 90 ? null : nombre;
}

const claveEvento = (nombre: string, provincia: string | null) =>
  `${normalizar(nombre).replace(/[^a-z0-9]+/g, ' ').replace(/\b(internacional|nacional|de|del|la|el|los|las|y|i|d|l)\b/g, ' ').replace(/\s+/g, ' ').trim()}|${normalizar(provincia ?? '').replace(/[^a-z0-9]+/g, ' ')}`;

interface Mencion {
  nombre: string;
  provincia: string | null;
  ccaa: string | null;
  lugar: string | null;
  organizador: string;
  fuente: Fuente;
}

export function festivales(contratos: ContratoVista[], convocatorias: Convocatoria[]): Festival[] {
  const menciones: Mencion[] = [];
  for (const c of contratos) {
    const nombre = nombreDeEvento(c.titulo);
    if (!nombre) continue;
    menciones.push({
      nombre,
      provincia: c.provincia,
      ccaa: c.ccaa,
      lugar: c.organo.ciudad,
      organizador: c.organo.nombre,
      fuente: { tipo: 'contrato', id: c.id, titulo: c.titulo, fecha: c.fechaAdjudicacion ?? c.actualizado.slice(0, 10), importe: c.adjudicado ?? c.importe },
    });
  }
  for (const c of convocatorias) {
    if (!c.clasificacion.musical) continue;
    const organizador = c.organoNiveles.at(-1) ?? c.organo;
    const provincia = c.ubicacion?.provincia ?? (c.provincias.length === 1 ? c.provincias[0]! : null);
    const nombre = nombreDeEvento(c.titulo);
    // Una convocatoria abierta a muchos festivales ("ayudas a festivales") no es un festival concreto.
    if (nombre && c.tipo === 'directa') {
      menciones.push({
        nombre,
        provincia,
        ccaa: c.ubicacion?.ccaa ?? null,
        lugar: c.ubicacion?.municipio ?? null,
        organizador,
        fuente: { tipo: 'convocatoria', id: c.id, titulo: c.titulo, fecha: c.fechaPublicacion, importe: c.concesiones?.importeTotal ?? c.presupuesto },
      });
    }
    // Beneficiarios que se llaman como su festival ("FESTIVAL DE JAZZ DE VITORIA GASTEIZ", "ASSOCIACIÓ FESTIVAL ...").
    for (const e of c.concesiones?.entidades ?? []) {
      const nombreEntidad = nombreDeEvento(e.nombre.replace(/^(asoc(iacion|iació)?\.?|associacio|fundacion|fundacio|consorcio)\s+/i, ''));
      if (!nombreEntidad) continue;
      menciones.push({
        nombre: nombreEntidad,
        provincia,
        ccaa: c.ubicacion?.ccaa ?? null,
        lugar: null,
        organizador: e.nombre,
        fuente: { tipo: 'concesion', id: c.id, titulo: c.titulo, fecha: e.fecha ?? c.fechaPublicacion, importe: e.importe, beneficiario: e.nombre },
      });
    }
  }

  const grupos = new Map<string, Mencion[]>();
  for (const m of menciones) {
    const k = claveEvento(m.nombre, m.provincia);
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }
  return [...grupos].map(([k, ms]) => {
    const orden = [...ms].sort((a, b) => (b.fuente.fecha ?? '').localeCompare(a.fuente.fecha ?? ''));
    const nombre = orden[0]!.nombre;
    const texto = `${nombre} ${ms.map((m) => m.fuente.titulo).join(' ')}`;
    return {
      id: `f-${normalizar(k).replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`,
      nombre,
      musical: MUSICA_EN_NOMBRE.test(normalizar(nombre)),
      estilos: clasificar({ texto }).estilosExplicitos,
      lugar: orden.find((m) => m.lugar)?.lugar ?? null,
      provincia: orden[0]!.provincia,
      ccaa: orden.find((m) => m.ccaa)?.ccaa ?? null,
      organizadores: [...new Set(ms.map((m) => m.organizador))].slice(0, 5),
      anios: [...new Set(ms.map((m) => anio(m.fuente.fecha)).filter((x): x is number => !!x && x >= 2000))].sort(),
      dinero: ms.reduce((s, m) => s + (m.fuente.importe ?? 0), 0),
      fuentes: orden.slice(0, 15).map((m) => m.fuente),
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Circuitos: redes públicas de programación que aparecen en los datos. La lista es nuestra; las fuentes, oficiales.

interface DefinicionCircuito {
  id: string;
  nombre: string;
  ambito: string;
  patron: RegExp;
}

const CIRCUITOS: DefinicionCircuito[] = [
  { id: 'platea', nombre: 'Programa PLATEA (INAEM)', ambito: 'España', patron: /\bplatea\b/ },
  { id: 'red-cyl', nombre: 'Red de Teatros y Circuitos Escénicos de Castilla y León', ambito: 'Castilla y León', patron: /red de teatros de castilla y leon|circuitos escenicos de castilla y leon/ },
  { id: 'red-extremadura', nombre: 'Red de Teatros de Extremadura', ambito: 'Extremadura', patron: /red de teatros (y otros espacios escenicos )?de (la junta de )?extremadura|red de teatro de la junta de extremadura/ },
  { id: 'ritmo-cadencia', nombre: 'Ritmo y Cadencia (Extremadura)', ambito: 'Extremadura', patron: /ritmo y cadencia/ },
  { id: 'red-aragon', nombre: 'Circuito de Artes Escénicas y Musicales de Aragón', ambito: 'Aragón', patron: /circuito de artes escenicas y musicales de aragon|red aragonesa/ },
  { id: 'red-andalucia', nombre: 'Red Andaluza de Teatros Públicos', ambito: 'Andalucía', patron: /red andaluza de teatros/ },
  { id: 'red-madrid', nombre: 'Red de Teatros de la Comunidad de Madrid', ambito: 'Comunidad de Madrid', patron: /red de teatros de la (cam|comunidad de madrid)/ },
  { id: 'red-clm', nombre: 'Red de Artes Escénicas y Música de Castilla-La Mancha', ambito: 'Castilla-La Mancha', patron: /red (de artes escenicas y musica de )?castilla[ -]la mancha/ },
  { id: 'programa-cat', nombre: 'Programa.cat (Cataluña)', ambito: 'Cataluña', patron: /programa\.?cat\b/ },
  { id: 'circuit-valencia', nombre: 'Circuit Cultural Valencià', ambito: 'Comunitat Valenciana', patron: /circuit cultural valencia/ },
  { id: 'sonora', nombre: 'Circuito Sonora', ambito: 'Varios', patron: /circuito sonora/ },
  { id: 'musicas-populares', nombre: 'Circuito Estatal de Músicas Populares', ambito: 'España', patron: /circuito estatal de musicas populares/ },
  { id: 'circuito-provincial', nombre: 'Circuitos provinciales de artes escénicas y música (diputaciones)', ambito: 'Varias provincias', patron: /circuito provincial de (las )?artes escenicas/ },
  { id: 'circuito-profesional', nombre: 'Circuitos profesionales de artes escénicas y música', ambito: 'Varias comunidades', patron: /circuito profesional de (artes escenicas|aaee)/ },
];

export interface Circuito {
  id: string;
  nombre: string;
  ambito: string;
  /** Organismos que aparecen convocando o contratando dentro del circuito. */
  organismos: { nombre: string; veces: number }[];
  menciones: number;
  anios: number[];
  fuentes: Fuente[];
}

export function circuitos(contratos: ContratoVista[], convocatorias: Convocatoria[]): Circuito[] {
  const textos: { texto: string; organismo: string; fuente: Fuente }[] = [
    ...contratos.map((c) => ({
      texto: normalizar(c.titulo),
      organismo: c.organo.nombre,
      fuente: { tipo: 'contrato' as const, id: c.id, titulo: c.titulo, fecha: c.fechaAdjudicacion ?? c.actualizado.slice(0, 10), importe: c.adjudicado ?? c.importe },
    })),
    ...convocatorias.map((c) => ({
      texto: normalizar(c.titulo),
      organismo: c.organoNiveles.slice(1).join(' · ') || c.organo,
      fuente: { tipo: 'convocatoria' as const, id: c.id, titulo: c.titulo, fecha: c.fechaPublicacion, importe: c.presupuesto },
    })),
  ];
  return CIRCUITOS.map((d) => {
    const ms = textos.filter((t) => d.patron.test(t.texto)).sort((a, b) => (b.fuente.fecha ?? '').localeCompare(a.fuente.fecha ?? ''));
    const organismos = new Map<string, number>();
    for (const m of ms) organismos.set(m.organismo, (organismos.get(m.organismo) ?? 0) + 1);
    return {
      id: d.id,
      nombre: d.nombre,
      ambito: d.ambito,
      organismos: [...organismos].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nombre, veces]) => ({ nombre, veces })),
      menciones: ms.length,
      anios: [...new Set(ms.map((m) => anio(m.fuente.fecha)).filter((x): x is number => !!x && x >= 2000))].sort(),
      fuentes: ms.slice(0, 20).map((m) => m.fuente),
    };
  }).filter((c) => c.menciones > 0);
}
