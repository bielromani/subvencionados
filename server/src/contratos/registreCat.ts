import { normalizar } from '../clasificacion/musica.js';
import { PROVINCIAS_INE } from '../referencias.js';
import { type Contrato, esDeMusica, pareceEntidad, TITULO_EXCLUIR } from './placsp.js';

/**
 * Registre públic de contractes de Catalunya (datos abiertos de la Generalitat, conjunto hb6v-jcbf): ahí están los
 * contratos de los ayuntamientos catalanes, menores incluidos, que no llegan a la Plataforma del Estado.
 * Solo se usan las filas de adjudicación y de contrato menor (las de liquidación, prórroga o modificación repiten
 * el mismo contrato). Sin NIF del adjudicatario: si su nombre no es claramente de una entidad no se guarda.
 */
export const DATASET_REGISTRE = 'https://analisi.transparenciacatalunya.cat/resource/hb6v-jcbf.json';
export const PREFIJO_REGISTRE = 'rpc-';

export type FilaRegistre = Partial<
  Record<
    | 'situaci_contractual'
    | 'subjecte_ambit'
    | 'id_organisme_contractant'
    | 'organisme_contractant'
    | 'codi_expedient'
    | 'procediment_adjudicacio'
    | 'tipus_contracte'
    | 'descripcio_expedient'
    | 'contracte'
    | 'numero_lot'
    | 'codi_cpv'
    | 'adjudicatari'
    | 'import_adjudicacio'
    | 'data_adjudicacio',
    string
  >
>;

// Muchos menores de los ayuntamientos no llevan CPV, o llevan uno genérico (98390000 "otros servicios"): se buscan
// también por el título, con cualquier CPV.
const PALABRAS = ['CONCERT', 'MUSIC', 'MÚSIC', 'ORQUESTR', 'COBLA', 'XARANGA', 'CHARANGA', 'BANDA', 'CORAL', 'SARDAN', 'HAVANER',
  'JAZZ', 'ACTUACI', 'DJ ', ' DJ', 'BALL ', 'CANTANT', 'CANTADA', 'RECITAL', 'GRALLER', 'GRUP ', 'ARTÍSTIC', 'ARTISTIC'];

/** Filtro SoQL: lo que puede ser música (se afina después con esMusicaRegistre). */
export function consultaRegistre(desde: string | null): string {
  const cpv = ["starts_with(codi_cpv,'923')", "starts_with(codi_cpv,'7995')", "starts_with(codi_cpv,'92000')"];
  const titulo = PALABRAS.map((p) => `upper(descripcio_expedient) like '%${p}%'`);
  return [
    "situaci_contractual in('menor','adjudicació')",
    `(${[...cpv, ...titulo].join(' OR ')})`,
    ...(desde ? [`data_adjudicacio >= '${desde}'`] : []),
  ].join(' AND ');
}

const numero = (x: string | undefined) => (x != null && x !== '' && Number.isFinite(Number(x)) ? Number(x) : null);
const limpio = (x: string | undefined) => x?.replace(/\s+/g, ' ').trim() || null;

/** Actuaciones en directo como las escriben los ayuntamientos catalanes: «Actuació Anna Tena», «Dj Pep», «Ball dels diumenges». */
const ACTUACION = /\b(actuacio|actuacions|concert|concerts|recital|dj|musics|cantada|cantades|grallers|ball (dels diumenges|de tarda|de nit|amb orquestra|de gent gran|de festa major)|balls (de tarda|de nit))\b/;
/** Actuaciones que no son música, o servicios alrededor de un concierto. */
const NO_ES_ACTUACION =
  /\b(castell\w*|teatr\w*|titell\w*|pallass\w*|clown|magia|mag|circ|contes|conta ?contes|lectura|ambulancia|aigua|seguretat|so|sonoritzacio|llums?|lloguer|neteja|bingo|ponent|xerrada|drets d.autor|sgae|transport|dinar|sopar|cartell\w*|disseny|impressio|fotograf\w*|video|enregistrament|assegurança|muntatge|carpa|escenari|cadires|wc|lavabos)\b/;

/** Música en vivo: la regla general de la Plataforma o, si no, una actuación en directo que no sea teatro, castells... */
export function esMusicaRegistre(titulo: string, cpv: string[]): boolean {
  // El lugar no cuenta: «Actuació X al Teatre Principal» es un concierto.
  const t = normalizar(titulo).replace(/\b(al|del|en el|el) (teatre|teatro)\b/g, ' ');
  if (NO_ES_ACTUACION.test(t)) return false;
  // Sin CPV, 92000000 hace de CPV afín: exige título de música.
  if (esDeMusica({ titulo, cpv: cpv.length ? cpv : ['92000000'] })) return true;
  return ACTUACION.test(t) && !TITULO_EXCLUIR.test(t);
}

/** Una fila del Registre en el formato de los contratos de la Plataforma; null si no es de música en vivo. */
export function contratoDeRegistre(f: FilaRegistre): Contrato | null {
  const titulo = limpio(f.descripcio_expedient) ?? limpio(f.contracte);
  const organo = limpio(f.organisme_contractant);
  const fecha = f.data_adjudicacio?.slice(0, 10) ?? null;
  if (!titulo || !organo || !fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const cpv = f.codi_cpv ? [f.codi_cpv.replace(/-.*$/, '')] : [];
  if (!esMusicaRegistre(titulo, cpv)) return null;
  const local = /local/i.test(f.subjecte_ambit ?? '');
  const prov = local ? f.id_organisme_contractant?.slice(0, 2) : undefined;
  const nombreProvincia = prov && PROVINCIAS_INE[prov]?.[1] === 'Cataluña' ? PROVINCIAS_INE[prov]![0] : null;
  const adjudicatario = limpio(f.adjudicatari);
  const entidad = pareceEntidad(adjudicatario);
  const importe = numero(f.import_adjudicacio);
  const lote = limpio(f.numero_lot);
  const clave = normalizar(`${f.id_organisme_contractant ?? organo} ${f.codi_expedient ?? titulo} ${lote ?? ''}`).replace(/[^a-z0-9]+/g, '-');
  return {
    id: `${PREFIJO_REGISTRE}${clave}`.replace(/-+$/, ''),
    expediente: limpio(f.codi_expedient),
    titulo,
    estado: 'ADJ',
    menor: f.situaci_contractual === 'menor' || /menor/i.test(f.procediment_adjudicacio ?? ''),
    actualizado: fecha,
    enlace: null,
    organo: { nombre: organo, dir3: null, nif: null, ciudad: null, codigoPostal: null, web: null, jerarquia: [...(nombreProvincia ? [nombreProvincia] : []), 'Cataluña'] },
    tipoContrato: null,
    procedimiento: null,
    importe: null,
    importeConIva: null,
    cpv,
    lugar: { nuts: 'ES51', nombre: nombreProvincia },
    finPlazo: null,
    ejecucion: { inicio: null, fin: null },
    adjudicaciones: [
      { adjudicatario: entidad ? adjudicatario : null, nif: null, personaFisica: !entidad, importe, importeConIva: null, fecha, ofertas: null, lote: lote && lote !== '1' ? lote : null },
    ],
    documentos: [],
  };
}

/** Clave para no duplicar un contrato que ya vino de la Plataforma del Estado (mismo órgano y expediente). */
export const claveExpediente = (c: Pick<Contrato, 'organo' | 'expediente'>) =>
  c.expediente ? `${normalizar(c.organo.nombre)}|${normalizar(c.expediente)}` : null;
