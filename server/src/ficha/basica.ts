import type { Anuncio } from '../tipos.js';
import { comprobarCita, type DocumentoTexto } from './verificar.js';

/**
 * Ficha básica automática: sin IA y sin coste. Parte el extracto del boletín en sus apartados
 * (beneficiarios, objeto, cuantía, plazo...) y busca con reglas unos pocos datos en las bases.
 * Todo lo que enseña es texto literal de los documentos oficiales; no interpreta nada.
 */

export type ApartadoExtracto =
  | 'beneficiarios'
  | 'objeto'
  | 'bases'
  | 'cuantia'
  | 'plazo'
  | 'presentacion'
  | 'otros';

export interface FichaBasica {
  extracto: {
    titulo: string;
    diario: string | null;
    fecha: string | null;
    url: string | null;
    /** Si no se reconocen los apartados, va todo el texto en uno de tipo 'otros'. */
    apartados: { tipo: ApartadoExtracto; texto: string }[];
  } | null;
  /** Frases literales de las bases que contienen cada dato, con su página. */
  datos: DatoBasico[];
}

export type CampoBasico = 'importeMaximo' | 'porcentajeMaximo' | 'plazo' | 'minimis' | 'compatibilidad' | 'caches';

export interface DatoBasico {
  campo: CampoBasico;
  /** Cifra que ha casado la regla (importe en euros o porcentaje), si el campo es numérico. */
  valor: number | null;
  documento: number;
  pagina: number;
  texto: string;
}

const ORDINAL =
  String.raw`(?:primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|sext[oa]|s[eé]ptim[oa]|octav[oa]|noven[oa]|d[eé]cim[oa]|primer|segon|tercer|quart|cinqu[eè]|sis[eè]|set[eè]|\d{1,2})`;

/** Palabras con las que empieza el título de cada apartado (castellano, catalán, gallego). */
const TITULOS: [ApartadoExtracto, string][] = [
  ['beneficiarios', String.raw`(?:entidades |personas |persones |entitats )?(?:beneficiari|benefici[àa]ri|poden? (?:ser|solicitar))`],
  ['objeto', String.raw`(?:objet|objec|obxect|finalidad|finalitat)`],
  ['bases', String.raw`(?:bases|legislaci|normativa|base reguladora|bases reguladoras)`],
  ['cuantia', String.raw`(?:cuant[ií]a|quantia|cont[ií]a|importe|import|dotaci|cr[eè]dit|presupuesto|pressupost|orzamento)`],
  ['plazo', String.raw`(?:plazo|termini|prazo)`],
  ['presentacion', String.raw`(?:lugar|forma de presentaci|presentaci[oó]n|solicitudes)`],
  ['otros', String.raw`(?:otros datos|altres dades|outros datos|documentaci|criterios|criteris)`],
];

const CABECERA = new RegExp(
  String.raw`${ORDINAL}\s*[.:\-–)º°]*\s*(?:[.:\-–]\s*)?(${TITULOS.map(([, t]) => t).join('|')})`,
  'gi',
);

const TITULO_EN_LINEA = new RegExp(
  String.raw`(?:^|\n)[ \t]*(?:(?:personas|entidades|persones|entitats) )?(${TITULOS.map(([, t]) => t).join('|')})[^\n.:]{0,60}[.:]?[ \t]*(?=\n)`,
  'gi',
);

/**
 * El ordinal tiene que empezar palabra. Algunos extractos llegan con los párrafos pegados
 * ("…de la convocatoriaPrimero. Beneficiarios"): vale también una mayúscula pegada a una minúscula.
 */
function empiezaPalabra(texto: string, i: number): boolean {
  const antes = texto[i - 1];
  if (antes === undefined || !/[\p{L}\d]/u.test(antes)) return true;
  return /\p{Ll}/u.test(antes) && /\p{Lu}/u.test(texto[i]!);
}

function tipoDeTitulo(titulo: string): ApartadoExtracto {
  for (const [tipo, patron] of TITULOS) if (new RegExp(`^${patron}`, 'i').test(titulo)) return tipo;
  return 'otros';
}

/** Parte el extracto por sus títulos numerados ("Primero. Beneficiarios", "3. Cuantía"...). */
export function apartadosExtracto(texto: string): { tipo: ApartadoExtracto; texto: string }[] {
  const numerados = [...texto.matchAll(CABECERA)]
    .filter((m) => empiezaPalabra(texto, m.index!))
    .map((m) => ({
      inicio: m.index! + m[0].lastIndexOf(m[1]!),
      // El apartado anterior acaba donde empieza el ordinal.
      fin: m.index!,
      tipo: tipoDeTitulo(m[1]!),
    }));
  // Títulos sin número en su propia línea ("OBJETO:", "Personas beneficiarias.").
  const sueltos = [...texto.matchAll(TITULO_EN_LINEA)].map((m) => {
    const inicio = m.index! + m[0].length - m[0].trimStart().length;
    return { inicio, fin: inicio, tipo: tipoDeTitulo(m[1]!) };
  });
  const cortes = [...numerados, ...sueltos]
    .sort((a, b) => a.fin - b.fin)
    .filter((c, i, todos) => i === 0 || c.fin > todos[i - 1]!.inicio);
  // Hacen falta al menos dos títulos distintos para fiarse de que es un extracto con apartados.
  if (new Set(cortes.map((c) => c.tipo)).size < 2) return texto.trim() ? [{ tipo: 'otros', texto: texto.trim() }] : [];
  const apartados = cortes.map((c, i) => ({
    tipo: c.tipo,
    texto: texto.slice(c.inicio, cortes[i + 1]?.fin ?? texto.length).trim(),
  }));
  const previo = texto.slice(0, cortes[0]!.fin).trim();
  return [...(previo.length > 40 ? [{ tipo: 'otros' as const, texto: previo }] : []), ...apartados].filter((a) => a.texto);
}

const NUMERO = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)`;
const EUROS = String.raw`\s*(?:€|euros?|eur\b)`;

/** El importe es por beneficiario o por proyecto, no la dotación de toda la convocatoria. */
const POR_BENEFICIARIO =
  /\b(?:por|per|cada) (?:cada )?(?:beneficiari|solicitante|sol·licitant|entidad|entitat|proyecto|projecte|proxecto|solicitud|sol·licitud|solicitude|persona|grupo|actuaci|ayuda|ajut|axuda|subvenci|asociaci|festival|programa|concierto|concert)|\bcada (?:un|una)\b|(?:cuant[ií]a|importe|import) m[aá]xim[oa]? (?:de la|de cada|per|por) (?:ayuda|subvenci|ajut|axuda)/i;

/** Cada regla busca una frase; `valida` descarta las que casan pero hablan de otra cosa. */
const REGLAS: { campo: CampoBasico; patron: RegExp; tipo?: 'euros' | 'porcentaje'; valida?: (frase: string) => boolean; preferida?: (frase: string) => boolean }[] = [
  {
    campo: 'importeMaximo',
    patron: new RegExp(
      String.raw`(?:m[aá]xim[oa]|no podr[aá] (?:superar|exceder|sobrepasar)|no superar[aá]|hasta un l[ií]mite de|import m[àa]xim|como m[aá]ximo)[^.\n;]{0,70}?${NUMERO}${EUROS}`,
      'i',
    ),
    tipo: 'euros',
    valida: (f) => POR_BENEFICIARIO.test(f),
  },
  {
    campo: 'porcentajeMaximo',
    patron: new RegExp(
      String.raw`(?:m[aá]xim[oa]|no podr[aá] (?:superar|exceder|sobrepasar)|no superar[aá]|hasta (?:el|un)|como m[aá]ximo)[^.\n;]{0,70}?${NUMERO}\s?(?:%|por ciento|per cent)`,
      'i',
    ),
    tipo: 'porcentaje',
    valida: (f) =>
      /presupuest|coste?\b|cost\b|gasto total|importe (?:total|subvencionable)|subvencionable|orzamento|pressupost|cach[eé]/i.test(f) &&
      !/gastos? (?:generales|indirectos)|despeses (?:generals|indirectes)|amortizaci|anticip|bestreta|pago a cuenta/i.test(f),
  },
  {
    campo: 'plazo',
    patron: /(?:plazo|termini|prazo) (?:de|para la|per a la|para a|màxim de) ?presentaci/i,
    // Un título ("5. Plazo de presentación") o una mención de pasada no dicen cuál es el plazo.
    valida: (f) =>
      f.length > 50 &&
      !/resolver|notificar|de justificaci|de xustificaci|de justificació|subsanar|esmenar/i.test(f) &&
      /\d|\b(?:d[ií]as|dies|meses|mesos|h[aá]biles|h[àa]bils|naturales|naturals)\b/i.test(f),
    // Mejor la frase que fija el plazo que una que lo menciona ("se podrá ampliar el plazo...").
    preferida: (f) => !/ampli|prorrog|pr[oò]rrog/i.test(f) && /\b(?:ser[aá]|serà|ser[aá]n|es|é|del|desde|dende|hasta|fins|ata|a contar|a comptar|comenzar[aá]|finalizar[aá])\b/i.test(f),
  },
  { campo: 'minimis', patron: /m[ií]nimis/i },
  { campo: 'compatibilidad', patron: /\b(?:compatibles?|incompatibles?|compatibilidad|incompatibilidad|compatibilitat)\b/i },
  { campo: 'caches', patron: /\b(?:cach[eé]s?|honorarios (?:de los )?(?:artistas|art[ií]sticos|de artistas)|retribuciones? (?:de|a) (?:los )?(?:artistas|int[eé]rpretes|m[uú]sicos))\b/i },
];

const MAX_FRASE = 420;

const FIN_FRASE = /[.;:](?=\s+[A-ZÁÉÍÓÚÑ0-9«"(])|\n\s*\n/g;

/** La frase que contiene el dato, sin pasar de la página; recortada a MAX_FRASE alrededor del dato. */
function frase(pagina: string, inicio: number, fin: number): string {
  // Un punto seguido de espacio y mayúscula, o un salto de párrafo, cierra la frase. Los puntos de las cifras no.
  let desde = 0;
  for (const m of pagina.slice(0, inicio).matchAll(FIN_FRASE)) desde = m.index! + m[0].length;
  const siguiente = [...pagina.slice(fin).matchAll(FIN_FRASE)][0];
  let hasta = siguiente ? fin + siguiente.index! + 1 : pagina.length;
  if (hasta - desde > MAX_FRASE) {
    desde = Math.max(desde, inicio - 160);
    hasta = Math.min(hasta, Math.max(fin, desde + MAX_FRASE - 160) + 160);
    if (desde > 0) desde = pagina.indexOf(' ', desde) + 1 || desde;
    const espacio = pagina.lastIndexOf(' ', hasta);
    if (hasta < pagina.length && espacio > fin) hasta = espacio;
  }
  return pagina.slice(desde, hasta).replace(/-\n(?=\p{Ll})/gu, '').replace(/\s+/g, ' ').trim();
}

function cifra(texto: string): number | null {
  const n = Number(texto.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Busca cada dato en las bases (la primera aparición, documento a documento y página a página). */
export function datosBasicos(documentos: DocumentoTexto[]): DatoBasico[] {
  const datos: DatoBasico[] = [];
  for (const regla of REGLAS) {
    let elegido: DatoBasico | null = null;
    buscar: for (const doc of documentos) {
      for (const [i, pagina] of doc.paginas.entries()) {
        for (const m of pagina.matchAll(new RegExp(regla.patron.source, 'gi'))) {
          const valor = regla.tipo ? cifra(m[1]!) : null;
          // Un "máximo de 3 €" o un "máximo de 0 %" es casi seguro otra cosa.
          if (regla.tipo === 'euros' && (valor === null || valor < 100)) continue;
          if (regla.tipo === 'porcentaje' && (valor === null || valor <= 0 || valor > 100)) continue;
          const texto = frase(pagina, m.index!, m.index! + m[0].length);
          if (regla.valida && !regla.valida(texto)) continue;
          const comprobada = comprobarCita({ documento: doc.id, pagina: i + 1, texto }, documentos, valor);
          if (comprobada.estado !== 'verificada') continue;
          const dato = { campo: regla.campo, valor, documento: doc.id, pagina: comprobada.pagina, texto };
          if (!regla.preferida || regla.preferida(texto)) {
            elegido = dato;
            break buscar;
          }
          elegido ??= dato;
        }
      }
    }
    if (elegido) datos.push(elegido);
  }
  return datos;
}

/** El extracto más reciente con texto (suele haber uno; si hay corrección de errores, la última). */
function extractoPrincipal(anuncios: Anuncio[]): Anuncio | null {
  const conTexto = anuncios.filter((a) => a.texto.trim());
  return conTexto.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))[0] ?? null;
}

export function fichaBasica(anuncios: Anuncio[], documentos: DocumentoTexto[]): FichaBasica {
  const a = extractoPrincipal(anuncios);
  return {
    extracto: a
      ? { titulo: a.titulo, diario: a.diario, fecha: a.fecha, url: a.url, apartados: apartadosExtracto(a.texto) }
      : null,
    datos: datosBasicos(documentos),
  };
}
