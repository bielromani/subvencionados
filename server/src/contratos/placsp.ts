import { normalizar } from '../clasificacion/musica.js';

/**
 * Lectura de los datos abiertos de la Plataforma de Contratación del Sector Público (formato CODICE en ATOM).
 * Se extraen con expresiones regulares solo los campos que usamos; todo es literal del fichero oficial.
 * Las personas físicas adjudicatarias no se guardan por su nombre ni su NIF.
 */

export interface Adjudicacion {
  /** Nombre de la empresa o entidad; null si es una persona física. */
  adjudicatario: string | null;
  nif: string | null;
  personaFisica: boolean;
  importe: number | null;
  importeConIva: number | null;
  fecha: string | null;
  ofertas: number | null;
  lote: string | null;
}

export interface Contrato {
  id: string;
  expediente: string | null;
  titulo: string;
  /** PRE anuncio previo, PUB en plazo, EV evaluación, ADJ adjudicada, RES resuelta, ANUL anulada. */
  estado: string | null;
  menor: boolean;
  actualizado: string;
  enlace: string | null;
  organo: {
    nombre: string;
    dir3: string | null;
    nif: string | null;
    ciudad: string | null;
    codigoPostal: string | null;
    web: string | null;
    /** De lo concreto a lo general: "Lugo", "Ayuntamientos", "Galicia", "ENTIDADES LOCALES"... */
    jerarquia: string[];
  };
  tipoContrato: string | null;
  procedimiento: string | null;
  /** Presupuesto base sin IVA y con IVA. */
  importe: number | null;
  importeConIva: number | null;
  cpv: string[];
  lugar: { nuts: string | null; nombre: string | null };
  /** Fin del plazo de presentación de ofertas (aaaa-mm-dd). */
  finPlazo: string | null;
  ejecucion: { inicio: string | null; fin: string | null };
  adjudicaciones: Adjudicacion[];
  documentos: { tipo: 'administrativo' | 'tecnico' | 'otro'; nombre: string | null; url: string }[];
}

const decodificar = (t: string) =>
  t
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Contenido del primer elemento con esa etiqueta (sin atributos ni anidados del mismo nombre). */
function valor(xml: string | undefined, etiqueta: string): string | null {
  if (!xml) return null;
  const m = xml.match(new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([^<]*)</${etiqueta}>`));
  return m ? decodificar(m[1]!) || null : null;
}

function valores(xml: string, etiqueta: string): string[] {
  return [...xml.matchAll(new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([^<]*)</${etiqueta}>`, 'g'))].map((m) => decodificar(m[1]!));
}

/** El primer bloque <etiqueta>…</etiqueta> (admite anidados de otras etiquetas, no de la misma). */
function bloque(xml: string | undefined, etiqueta: string): string | undefined {
  if (!xml) return undefined;
  const i = xml.indexOf(`<${etiqueta}`);
  if (i < 0) return undefined;
  const j = xml.indexOf(`</${etiqueta}>`, i);
  return j < 0 ? undefined : xml.slice(i, j + etiqueta.length + 3);
}

function bloques(xml: string, etiqueta: string): string[] {
  const salida: string[] = [];
  let desde = 0;
  for (;;) {
    const i = xml.indexOf(`<${etiqueta}>`, desde) >= 0 ? xml.indexOf(`<${etiqueta}>`, desde) : xml.indexOf(`<${etiqueta} `, desde);
    if (i < 0) return salida;
    const j = xml.indexOf(`</${etiqueta}>`, i);
    if (j < 0) return salida;
    salida.push(xml.slice(i, j + etiqueta.length + 3));
    desde = j;
  }
}

const numero = (t: string | null) => (t === null || t === '' || Number.isNaN(Number(t)) ? null : Number(t));
const fecha = (t: string | null) => (t && /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null);

/** NIF de persona física: DNI (8 cifras y letra) o NIE (X, Y, Z). */
export const esNifPersona = (nif: string | null) => !!nif && /^([0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])$/i.test(nif.replace(/[\s.-]/g, ''));

/** Nombre de sociedad, asociación, fundación, administración...: no es una persona física. */
export const pareceEntidad = (nombre: string | null) =>
  !!nombre &&
  /(^|[^\p{L}])(s\.? ?l\.?|s\.? ?a\.?|s\.? ?l\.? ?u\.?|s\.? ?c\.?|s\.? ?coop\.?|c\.? ?b\.?|lda\.?|corp\.?|ltd\.?|gmbh|sas|srl)($|[^\p{L}])|sociedad|cooperativa|asociaci|associaci|ass\.|fundaci|federaci|agrupaci|ayuntamiento|ajuntament|concello|banda|orquesta|orquestra|uni[oó]n musical|producciones|produccions|eventos|events|management|espect[aá]culos|entertainment|music|m[uú]sica|teatro|compa[nñ][ií]a|colla|coral|charanga/iu.test(nombre);

/** NIF de persona jurídica española (letra de entidad y cifras). */
const esNifEntidad = (nif: string) => /^[A-HJ-NP-SUVW][0-9]{7}[0-9A-J]$/i.test(nif.replace(/[\s.-]/g, ''));

/**
 * Persona física: NIF o NIE de persona, o un NIF enmascarado o extranjero cuyo nombre no es de una entidad.
 * Ante la duda se trata como persona y no se guarda su nombre.
 */
export function esPersonaFisica(nif: string | null, nombre: string | null): boolean {
  if (esNifPersona(nif)) return true;
  if (nif && (nif.includes('*') || !esNifEntidad(nif))) return !pareceEntidad(nombre);
  return false;
}

/** Separa el ATOM en entradas (se ignoran las borradas). */
export function entradas(atom: string): string[] {
  return atom.split('<entry>').slice(1).map((e) => e.slice(0, e.indexOf('</entry>')));
}

/** Enlace a la página siguiente (más antigua) del ATOM. */
export function siguiente(atom: string): string | null {
  const cabecera = atom.slice(0, atom.indexOf('<entry>') >= 0 ? atom.indexOf('<entry>') : 5000);
  const m = cabecera.match(/<link[^>]*href="([^"]+)"[^>]*rel="next"|<link[^>]*rel="next"[^>]*href="([^"]+)"/);
  return m ? decodificar(m[1] ?? m[2]!) : null;
}

function adjudicaciones(xml: string): Adjudicacion[] {
  return bloques(xml, 'cac:TenderResult').flatMap((r) => {
    const ganador = bloque(r, 'cac:WinningParty');
    const total = bloque(r, 'cac:LegalMonetaryTotal');
    const fechaAdj = fecha(valor(r, 'cbc:AwardDate'));
    if (!ganador && !total && !fechaAdj) return [];
    const nifLeido = valor(ganador, 'cbc:ID');
    const nombre = valor(bloque(ganador, 'cac:PartyName'), 'cbc:Name');
    // Algunas plataformas enmascaran el NIF ("****8604*"): entonces solo se guarda el nombre si es de una entidad.
    const enmascarado = !!nifLeido?.includes('*');
    const nif = enmascarado ? null : nifLeido;
    const persona = esPersonaFisica(nifLeido, nombre);
    return [
      {
        adjudicatario: persona ? null : nombre,
        nif: persona ? null : nif,
        personaFisica: persona,
        importe: numero(valor(total, 'cbc:TaxExclusiveAmount')),
        importeConIva: numero(valor(total, 'cbc:PayableAmount')),
        fecha: fechaAdj,
        ofertas: numero(valor(r, 'cbc:ReceivedTenderQuantity')),
        lote: valor(bloque(r, 'cac:AwardedTenderedProject'), 'cbc:ProcurementProjectLotID'),
      },
    ];
  });
}

function documentos(xml: string): Contrato['documentos'] {
  const tipos: [string, Contrato['documentos'][number]['tipo']][] = [
    ['cac:LegalDocumentReference', 'administrativo'],
    ['cac:TechnicalDocumentReference', 'tecnico'],
    ['cac:AdditionalDocumentReference', 'otro'],
  ];
  return tipos.flatMap(([etiqueta, tipo]) =>
    bloques(xml, etiqueta).flatMap((d) => {
      const url = valor(d, 'cbc:URI');
      return url ? [{ tipo, nombre: valor(d, 'cbc:ID'), url }] : [];
    }),
  );
}

export function leerEntrada(entrada: string, menor = false): Contrato | null {
  const estado = bloque(entrada, 'cac-place-ext:ContractFolderStatus');
  const id = valor(entrada, 'id')?.split('/').pop();
  const actualizado = valor(entrada, 'updated');
  if (!estado || !id || !actualizado) return null;
  const parte = bloque(estado, 'cac-place-ext:LocatedContractingParty');
  const parteDatos = bloque(parte, 'cac:Party');
  const ids = bloques(parteDatos ?? '', 'cac:PartyIdentification');
  const idDe = (esquema: string) => {
    const b = ids.find((x) => x.includes(`schemeName="${esquema}"`));
    return valor(b, 'cbc:ID');
  };
  // Los nombres de los niveles superiores, quitando el propio órgano.
  const padres = bloque(parte, 'cac-place-ext:ParentLocatedParty');
  const jerarquia = padres ? valores(padres, 'cbc:Name') : [];
  const proyecto = bloque(estado, 'cac:ProcurementProject');
  const presupuesto = bloque(proyecto, 'cac:BudgetAmount');
  const ubicacion = bloque(proyecto, 'cac:RealizedLocation');
  const periodo = bloque(proyecto, 'cac:PlannedPeriod');
  const proceso = bloque(estado, 'cac:TenderingProcess');
  const cpvs = [...new Set(valores(estado, 'cbc:ItemClassificationCode'))];
  const enlace = entrada.match(/<link[^>]*href="([^"]+)"/)?.[1];

  return {
    id,
    expediente: valor(estado, 'cbc:ContractFolderID'),
    titulo: valor(entrada, 'title') ?? valor(proyecto, 'cbc:Name') ?? '',
    estado: valor(estado, 'cbc-place-ext:ContractFolderStatusCode'),
    menor,
    actualizado,
    enlace: enlace ? decodificar(enlace) : null,
    organo: {
      nombre: valor(bloque(parteDatos, 'cac:PartyName'), 'cbc:Name') ?? '',
      dir3: idDe('DIR3'),
      nif: idDe('NIF'),
      ciudad: valor(bloque(parteDatos, 'cac:PostalAddress'), 'cbc:CityName'),
      codigoPostal: valor(bloque(parteDatos, 'cac:PostalAddress'), 'cbc:PostalZone'),
      web: valor(parteDatos, 'cbc:WebsiteURI'),
      jerarquia,
    },
    tipoContrato: valor(proyecto, 'cbc:TypeCode'),
    procedimiento: valor(proceso, 'cbc:ProcedureCode'),
    importe: numero(valor(presupuesto, 'cbc:TaxExclusiveAmount')),
    importeConIva: numero(valor(presupuesto, 'cbc:TotalAmount')),
    cpv: cpvs,
    lugar: { nuts: valor(ubicacion, 'cbc:CountrySubentityCode'), nombre: valor(ubicacion, 'cbc:CountrySubentity') },
    finPlazo: fecha(valor(bloque(proceso, 'cac:TenderSubmissionDeadlinePeriod'), 'cbc:EndDate')),
    ejecucion: { inicio: fecha(valor(periodo, 'cbc:StartDate')), fin: fecha(valor(periodo, 'cbc:EndDate')) },
    adjudicaciones: adjudicaciones(estado),
    documentos: documentos(estado),
  };
}

/** CPV de servicios artísticos de música: grupos de cantantes (92312120), bandas (130) y orquestas (140). */
const CPV_MUSICA = /^923121[234]0$/;
/** CPV afines (artísticos, espectáculos, eventos, fiestas): solo si el título habla de música. */
const CPV_AFINES = /^(923|7995[0-4]|92000000)/;

const TITULO_MUSICA =
  /\b(concierto|conciertos|concerto|concertos|concert|concerts|orquesta|orquestas|orquestra|orquestras|bandas? de musica|banda municipal|charangas?|txarangas?|actuacion(es)? (musical|musicales|artistica|artisticas)|actuacions musicals|grupos? musical(es)?|musica|musicas|musical|musicales|musicais|musicals|festival de (jazz|musica)|coral|corales|coro|coros|recital|recitales|opera|operas|zarzuela|jazz|verbena|verbenas|cantantes?|cantautor(es|a)?|flamenco|dj|disc jockey|rondalla|mariachi)\b/;

/** Lo que no es contratar música en vivo: enseñanza, obras, suministros, bares... */
const TITULO_EXCLUIR =
  /\b(escuelas? (municipal )?de musica|escola de musica|escola municipal de musica|ensenanza|ensenanzas|formacion|clases|profesorado|docente|obras? de|suministro|adquisicion de instrumentos|instrumentos musicales|barra|bar|cafeteria|alquiler de (escenario|sonido)|sonorizacion|hilo musical|ambientacion musical|limpieza|seguridad|vigilancia|instalaciones)\b/;

/** Teatro, danza o circo: solo cuentan si el título menciona además música. */
const TITULO_ESCENICAS = /\b(teatral|teatrales|obra de teatro|representacion teatral|danza|dansa|circo|circ|titeres|monologo|monologos|humor)\b/;
const TITULO_MUSICA_CLARA = /\b(concierto|conciertos|concert|concerts|concerto|orquesta|orquestra|banda|musica|musical|musicales|cantante|coro|coral|opera|zarzuela|jazz)\b/;

/** Contratos de música en vivo: CPV de música o CPV afín con un título de música, sin enseñanza ni obras. */
export function esDeMusica(c: Pick<Contrato, 'cpv' | 'titulo'>): boolean {
  const t = normalizar(c.titulo);
  if (TITULO_EXCLUIR.test(t)) return false;
  if (TITULO_ESCENICAS.test(t) && !TITULO_MUSICA_CLARA.test(t)) return false;
  if (c.cpv.some((x) => CPV_MUSICA.test(x))) return true;
  return c.cpv.some((x) => CPV_AFINES.test(x)) && TITULO_MUSICA.test(t);
}
