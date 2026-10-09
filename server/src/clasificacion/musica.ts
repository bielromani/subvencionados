// Clasificador por reglas: decide si una convocatoria es de música, a qué estilos
// puede optar un promotor de jazz/clásica/ópera, qué líneas financia y quién puede
// pedirla. Es la primera capa; la siguiente será leer las bases (PDF) con un LLM.

import type {
  Beneficiarios,
  Clasificacion,
  EncajePromotor,
  Estilo,
  Linea,
} from '../tipos.js';

export interface EntradaClasificacion {
  /** Título, objeto, finalidad... todo el texto disponible. */
  texto: string;
  /** Tipos de beneficiario tal como los publica la BDNS. */
  tiposBeneficiario?: string[];
}

/** Minúsculas y sin tildes: los títulos de la BDNS llegan a menudo en mayúsculas y sin acentos. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

type Patron = [etiqueta: string, regex: RegExp];

// Señales de que la convocatoria es de música (sobre texto normalizado).
const SENALES_MUSICA: Patron[] = [
  // También palabras compuestas: "DeMúsica", "Gastromúsica".
  ['música', /\b\w*musica(s|l|les)?\b/],
  ['concierto', /\bconciertos?\b/],
  ['orquesta', /\borquestas?\b/],
  ['sinfónica', /\bsinfonic[oa]s?\b/],
  ['lírica', /\bliric[oa]s?\b/],
  ['zarzuela', /\bzarzuelas?\b/],
  ['jazz', /\bjazz\b/],
  ['coro', /\b(coros?|coral(es)?|cantaires|cantores|orfeones)\b/],
  ['ensemble', /\bensembles?\b/],
  ['recital', /\brecitales?\b/],
  ['conservatorio', /\bconservatorios?\b/],
  // Catalán, gallego y euskera (la BDNS incluye el título en la lengua cooficial).
  ['orquestra', /\borquestr(a|es)\b/],
  ['concert', /\bconcerts?\b/],
  ['musika', /\bmusik(a|ak|al)\b/],
  ['music', /\bmusic\b/],
  ['filarmónica', /\bfilarmonic[oa]s?\b/],
  ['orfeón', /\borfeo(n|i)?s?\b/],
  ['escolanía', /\bescolani(a|es)\b/],
  ['cobla', /\bcoblas?\b/],
  ['charanga', /\b(charangas?|txarangas?)\b/],
  ['rondalla', /\brondallas?\b/],
  ['cantautor', /\bcantautor(es|a|as)?\b/],
];

// "Concierto" tiene acepciones que no son musicales.
const DANZA = /\b(danzas?|dantza|baile|bailes|balls?|esbart)\b/;

// Conservatorios y escuelas de danza: no son de música.
const FALSOS_DANZA = /\b(conservatorios?|escuelas?) (profesional |superior |elemental |municipal )?de danza\b/g;

const FALSOS_CONCIERTO =
  /\b(concierto|conciertos) (economico|educativo|educativos|sanitario|sanitarios|social|sociales)\b|\ben concierto con\b|\bregimen de concierto\b/g;

// "Ópera" sin tilde coincide con el verbo "opera"; solo la aceptamos con tilde
// o en contextos inequívocos.
const OPERA_CON_TILDE = /(^|[^\p{L}])[óò]peras?(?![\p{L}])/iu;
const OPERA_CONTEXTO =
  /\b(temporadas? (de |lirica y de )?opera|opera y zarzuela|zarzuela y opera|festival(es)? de opera|produccion(es)? de opera|opera barroca|teatro de la opera|de opera y)\b/;

const ESTILOS_PATRONES: Record<Estilo, Patron[]> = {
  jazz: [
    ['jazz', /\bjazz\b/],
    ['swing', /\bswing\b/],
    ['blues', /\bblues\b/],
    ['big band', /\bbig bands?\b/],
  ],
  clasica: [
    ['música clásica', /\bmusica clasica\b/],
    ['orquesta', /\borquestas?\b/],
    ['orquestra', /\borquestr(a|es)\b/],
    ['camerata', /\bcamerata\b/],
    ['orfeón', /\borfeo(n|i)?s?\b/],
    ['escolanía', /\bescolani(a|es)\b/],
    // "Banda sinfónica" es una banda de música, no una orquesta.
    ['sinfónica', /(?<!banda )\bsinfonic[oa]s?\b/],
    ['filarmónica', /\bfilarmonic[oa]s?\b/],
    ['música de cámara', /\bmusica de camara\b/],
    ['música antigua', /\bmusica antigua\b/],
    ['barroco', /\bbarroc[oa]s?\b/],
    ['recital', /\brecitales?\b/],
    ['coro', /\b(coros?|coral(es)?|cantaires|cantores|orfeones)\b/],
    ['ensemble', /\bensembles?\b/],
    ['música culta', /\bmusica culta\b/],
  ],
  opera: [
    ['lírica', /\bliric[oa]s?\b/],
    ['zarzuela', /\bzarzuelas?\b/],
    ['bel canto', /\bbel canto\b/],
  ],
};

const OTROS_GENEROS: Patron[] = [
  ['flamenco', /\bflamenc[oa]s?\b|\brocier[oa]s?\b|\bsevillanas\b|\bcante( jondo)?\b/],
  // Sin \b inicial: "Suberock", "Extremarock".
  ['rock', /rock\b/],
  ['pop', /\bpop\b/],
  ['folk', /\bfolk\b/],
  ['música tradicional', /\bmusica (tradicional|popular|folk)\b|\bfol(k|c)lor(e|ico|ica)?\b/],
  // "Banda" en un texto de música es una banda (de música, de cornetas...): "banda ancha" ya no es música.
  ['bandas de música', /\bbandas?\b(?! ancha)|\bmusica de banda\b/],
  ['cornetas y tambores', /\b(cornetas|tamborileros|tamborrada|tambores)\b/],
  // "Moros y cristianos" por sí solo son fiestas y comparsas, no música.
  ['música festera', /\bmusica festera\b|\bmarchas? moras?\b/],
  ['electrónica', /\bmusica electronica\b/],
  ['hip hop', /\bhip ?hop\b/],
  ['copla', /\bcopla\b/],
  ['reggae', /\breggae\b/],
  ['sardana', /\b(sardan(a|as|ista|istes|istas)|coblas?)\b/],
  ['dolçaina', /\bdolcain(a|es)\b/],
  ['txistu', /\btxistu/],
  ['gaita', /\bgaitas?\b/],
  ['charanga', /\b(charangas?|txarangas?)\b/],
  ['rondalla', /\brondallas?\b/],
  ['cantautor', /\bcantautor(es|a|as)?\b/],
];

// Concursos de fotografía, carteles, pintura o relatos asociados a un festival de música:
// el objeto no es la música aunque el título la nombre.
const OBJETO_NO_MUSICAL =
  /\b(concurso|certamen|premios?|seleccion) (para la seleccion )?(de |del )?(proyectos )?(fotografic|fotografia|carteles?|cartel|pintura|literari|relatos?|dibujo|poesia|cortometrajes?)/;

// Ayudas generales de cultura que pueden financiar conciertos (sobre texto normalizado).
const CULTURA_GENERAL =
  /\b(actividades? culturales?|programacion cultural|proyectos? culturales?|promocion (de la )?cultura|promocion cultural|fomento de la cultura|difusion cultural|dinamizacion cultural|artes escenicas|espectaculos?|festivales|eventos culturales|industrias culturales|creacion artistica|entidades culturales|asociaciones culturales|fiestas? (patronales|populares|mayor(es)?)|festejos|en materia de cultura|ambito cultural|sector cultural|cultura popular)\b/;
// Lo que, aunque sea cultura, no tiene que ver con conciertos (títulos reales frecuentes).
const CULTURA_SIN_CONCIERTOS =
  /\b(fotograf|pintura|literari|relatos?|poesia|narrativa|novela|carnaval|disfraces|carrozas?|comparsas|deport|bibliotecas?|lectura|ampas?|patrimonio|restauracion|rehabilitacion|investigacion|arqueolog|libros?|editorial|traduccion|ajedrez|taurin|belen|gastronom|reina y damas|cine|cortometraje|audiovisual)/;

// Menciones a la música como campo general ("ayudas a la música y a la lírica",
// "música en vivo"): aunque también se cite un estilo, la ayuda no se limita a él.
const MUSICA_GENERAL =
  /\b(a|de|para) la musica\b(?! (clasica|de camara|antigua|tradicional|popular|electronica|culta|jazz))|\bmusica en (vivo|directo)\b|\bsector musical\b|\bprogramacion musical\b|\bactividades musicales\b|\bartes escenicas y (de la )?musica(les)?\b/;

const LINEAS: Record<Linea, RegExp> = {
  giras: /\bgiras?\b|\bcirculacion\b|\bitineran|\bcircuitos?\b|\bmovilidad\b/,
  festivales: /\bfestival(es)?\b|\bciclos?\b|\btemporadas?\b|\bprogramacion\b|\bferias?\b/,
  produccion: /\bproduccion(es)?\b|\bmontajes?\b|\bcreacion\b|\bestrenos?\b|\bresidencias?\b/,
  grabacion: /\bgrabacion(es)?\b|\bdiscografic|\bfonogramas?\b|\bdiscos?\b/,
  internacional: /\binternacional(es|izacion)?\b|\bexterior\b|\bextranjero\b/,
  composicion: /\bcomposicion\b|\bcompositor(es|as)?\b|\bencargos?\b/,
  formacion: /\bformacion\b|\bbecas?\b|\bconservatorios?\b|\bescuelas? de musica\b|\bensenanzas?\b/,
  equipamiento: /\bequipamiento\b|\binstrumentos musicales\b|\badquisicion de instrumentos\b|\binversion(es)?\b|\brehabilitacion\b/,
};

const DESTINO_LOCAL =
  /\b(a|para|destinadas? a|dirigidas? a) (los |las )?(ayuntamientos|entidades locales|municipios|corporaciones locales)\b|\bprograma platea\b/;
const TEXTO_EMPRESAS =
  /\b(empresas?|autonom[oa]s|promotor(es|as)?|personas fisicas o juridicas|personas fisicas y juridicas|profesionales)\b/;
const TEXTO_SIN_ANIMO = /\b(sin animo de lucro|asociaciones|fundaciones|entidades culturales)\b/;

function coincidencias(texto: string, patrones: Patron[]): string[] {
  return patrones.filter(([, re]) => re.test(texto)).map(([etiqueta]) => etiqueta);
}

export function detectarBeneficiarios(texto: string, tipos: string[] = []): Beneficiarios {
  const t = normalizar(texto);
  const tiposN = tipos.map(normalizar);

  const entidadesLocales = DESTINO_LOCAL.test(t);
  let empresas: boolean | null = null;
  let sinAnimoLucro: boolean | null = null;
  let personasFisicas: boolean | null = null;

  // La BDNS usa una lista cerrada de tipos de beneficiario.
  const conInfo = tiposN.filter((x) => !x.includes('sin informacion'));
  if (conInfo.length > 0) {
    empresas = conInfo.some(
      (x) => x.includes('pyme') || x.includes('gran empresa') || (x.includes('fisicas') && x.includes('que desarrollan')),
    );
    // Los ayuntamientos también figuran como "personas jurídicas que no desarrollan
    // actividad económica": si el texto apunta a entidades locales y no menciona
    // asociaciones, no es una ayuda para asociaciones.
    sinAnimoLucro =
      conInfo.some((x) => x.includes('juridicas que no desarrollan')) &&
      (!entidadesLocales || TEXTO_SIN_ANIMO.test(t));
    personasFisicas = conInfo.some((x) => x.includes('fisicas que no desarrollan'));
  } else {
    if (TEXTO_EMPRESAS.test(t)) empresas = true;
    if (TEXTO_SIN_ANIMO.test(t)) sinAnimoLucro = true;
  }

  return { empresas, sinAnimoLucro, entidadesLocales, personasFisicas };
}

export function encajeParaPromotor(b: Beneficiarios): EncajePromotor {
  if (b.empresas || b.sinAnimoLucro) return 'si';
  if (b.entidadesLocales) return 'indirecto';
  if (b.personasFisicas) return 'artistas';
  if (b.empresas === false && b.sinAnimoLucro === false) return 'no';
  return 'desconocido';
}

export function clasificar({ texto, tiposBeneficiario = [] }: EntradaClasificacion): Clasificacion {
  const t = normalizar(texto).replace(FALSOS_CONCIERTO, ' ').replace(FALSOS_DANZA, ' ');
  const evidencias = coincidencias(t, SENALES_MUSICA);

  const operaExplicita = OPERA_CON_TILDE.test(texto) || OPERA_CONTEXTO.test(t);
  if (operaExplicita) evidencias.push('ópera');

  // Un género concreto (rock, flamenco...) también indica que es de música. Pero un grupo de
  // danza o baile folclórico sin mención a la música es baile, no música.
  const soloDanza = DANZA.test(t) && evidencias.length === 0;
  const otrosGeneros = coincidencias(t, OTROS_GENEROS).filter((g) => !(soloDanza && g === 'música tradicional'));
  evidencias.push(...otrosGeneros);
  const objetoNoMusical = OBJETO_NO_MUSICAL.test(t);
  const musical = evidencias.length > 0 && !objetoNoMusical;
  if (objetoNoMusical) evidencias.push('objeto no musical (concurso de fotografía, carteles...)');

  const estilosExplicitos: Estilo[] = [];
  for (const [estilo, patrones] of Object.entries(ESTILOS_PATRONES) as [Estilo, Patron[]][]) {
    if (coincidencias(t, patrones).length > 0 || (estilo === 'opera' && operaExplicita)) {
      estilosExplicitos.push(estilo);
    }
  }

  const generica =
    musical && otrosGeneros.length === 0 && (estilosExplicitos.length === 0 || MUSICA_GENERAL.test(t));
  const estilosCompatibles: Estilo[] = generica ? ['jazz', 'clasica', 'opera'] : estilosExplicitos;

  const lineas = (Object.entries(LINEAS) as [Linea, RegExp][])
    .filter(([, re]) => re.test(t))
    .map(([linea]) => linea);

  const beneficiarios = detectarBeneficiarios(texto, tiposBeneficiario);

  const culturaGeneral = !musical && CULTURA_GENERAL.test(t) && !CULTURA_SIN_CONCIERTOS.test(t);

  return {
    musical,
    culturaGeneral,
    estilosExplicitos,
    estilosCompatibles,
    generica,
    otrosGeneros,
    lineas,
    beneficiarios,
    encajePromotor: encajeParaPromotor(beneficiarios),
    evidencias: [...new Set(evidencias)],
  };
}
