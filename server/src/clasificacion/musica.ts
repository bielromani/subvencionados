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
  ['música', /\bmusica(s|l|les)?\b/],
  ['concierto', /\bconciertos?\b/],
  ['orquesta', /\borquestas?\b/],
  ['sinfónica', /\bsinfonic[oa]s?\b/],
  ['lírica', /\bliric[oa]s?\b/],
  ['zarzuela', /\bzarzuelas?\b/],
  ['jazz', /\bjazz\b/],
  ['coro', /\b(coros?|corales?)\b/],
  ['recital', /\brecitales?\b/],
  ['conservatorio', /\bconservatorios?\b/],
];

// "Concierto" tiene acepciones que no son musicales.
const FALSOS_CONCIERTO =
  /\b(concierto|conciertos) (economico|educativo|educativos|sanitario|sanitarios|social|sociales)\b|\ben concierto con\b|\bregimen de concierto\b/g;

// "Ópera" sin tilde coincide con el verbo "opera"; solo la aceptamos con tilde
// o en contextos inequívocos.
const OPERA_CON_TILDE = /(^|[^\p{L}])óperas?(?![\p{L}])/iu;
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
    ['sinfónica', /\bsinfonic[oa]s?\b/],
    ['filarmónica', /\bfilarmonic[oa]s?\b/],
    ['música de cámara', /\bmusica de camara\b/],
    ['música antigua', /\bmusica antigua\b/],
    ['barroco', /\bbarroc[oa]s?\b/],
    ['recital', /\brecitales?\b/],
    ['coro', /\b(coros?|corales?)\b/],
    ['música culta', /\bmusica culta\b/],
  ],
  opera: [
    ['lírica', /\bliric[oa]s?\b/],
    ['zarzuela', /\bzarzuelas?\b/],
    ['bel canto', /\bbel canto\b/],
  ],
};

const OTROS_GENEROS: Patron[] = [
  ['flamenco', /\bflamenc[oa]s?\b/],
  ['rock', /\brock\b/],
  ['pop', /\bpop\b/],
  ['folk', /\bfolk\b/],
  ['música tradicional', /\bmusica (tradicional|popular|folk)\b/],
  ['bandas de música', /\bbandas? (de musica|municipal(es)?)\b/],
  ['electrónica', /\bmusica electronica\b/],
  ['hip hop', /\bhip ?hop\b/],
  ['copla', /\bcopla\b/],
];

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
  } else {
    if (TEXTO_EMPRESAS.test(t)) empresas = true;
    if (TEXTO_SIN_ANIMO.test(t)) sinAnimoLucro = true;
  }

  return { empresas, sinAnimoLucro, entidadesLocales };
}

export function encajeParaPromotor(b: Beneficiarios): EncajePromotor {
  if (b.empresas || b.sinAnimoLucro) return 'si';
  if (b.entidadesLocales) return 'indirecto';
  if (b.empresas === false && b.sinAnimoLucro === false) return 'no';
  return 'desconocido';
}

export function clasificar({ texto, tiposBeneficiario = [] }: EntradaClasificacion): Clasificacion {
  const t = normalizar(texto).replace(FALSOS_CONCIERTO, ' ');
  const evidencias = coincidencias(t, SENALES_MUSICA);

  const operaExplicita = OPERA_CON_TILDE.test(texto) || OPERA_CONTEXTO.test(t);
  if (operaExplicita) evidencias.push('ópera');

  const musical = evidencias.length > 0;

  const estilosExplicitos: Estilo[] = [];
  for (const [estilo, patrones] of Object.entries(ESTILOS_PATRONES) as [Estilo, Patron[]][]) {
    if (coincidencias(t, patrones).length > 0 || (estilo === 'opera' && operaExplicita)) {
      estilosExplicitos.push(estilo);
    }
  }

  const otrosGeneros = musical ? coincidencias(t, OTROS_GENEROS) : [];
  const generica =
    musical && otrosGeneros.length === 0 && (estilosExplicitos.length === 0 || MUSICA_GENERAL.test(t));
  const estilosCompatibles: Estilo[] = generica ? ['jazz', 'clasica', 'opera'] : estilosExplicitos;

  const lineas = (Object.entries(LINEAS) as [Linea, RegExp][])
    .filter(([, re]) => re.test(t))
    .map(([linea]) => linea);

  const beneficiarios = detectarBeneficiarios(texto, tiposBeneficiario);

  return {
    musical,
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
