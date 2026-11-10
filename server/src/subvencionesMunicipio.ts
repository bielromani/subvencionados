import { normalizar } from './clasificacion/musica.js';
import { type ContactoMunicipio, type Contactos, esOrganoMunicipal } from './contactos.js';
import { PROVINCIAS_INE } from './referencias.js';
import type { Convocatoria } from './tipos.js';

/**
 * Subvenciones de cultura y música que reciben los municipios (BDNS): las que van al ayuntamiento y las que van a
 * entidades del pueblo (asociaciones, bandas, comisiones de fiestas, pedanías...). Son dinero para programar: quien
 * recibe una ayuda para su festa major o su ciclo de conciertos es alguien a quien ofrecer un concierto.
 */
export interface ConcesionRecibida {
  convocatoria: string;
  titulo: string;
  convocante: string;
  importe: number;
  fecha: string | null;
}

export interface EntidadSubvencionada {
  nombre: string;
  /** Pedanía, entidad local menor, EMD, junta vecinal o concejo. */
  pedania: boolean;
  importe: number;
  numero: number;
  ultima: string | null;
  concesiones: ConcesionRecibida[];
}

export interface SubvencionesMunicipio {
  ayuntamiento: { importe: number; numero: number; ultima: string | null; concesiones: ConcesionRecibida[] };
  entidades: EntidadSubvencionada[];
}

/** Pedanías y demás entidades locales por debajo del municipio. */
export const PEDANIA =
  /\b(entitat municipal descentralitzada|entidad municipal descentralizada|emd|e\.m\.d\.|entidad local menor|entidad local autonoma|e\.l\.a\.|eatim|junta vecinal|pedania|alcaldia pedanea|concejo de|kontzejua|parroquia rural|entidade local menor)\b/;

/** Provincia del NIF de una entidad (P4308700F → 43): las de la administración local siempre la llevan. */
export const provinciaDeNif = (nif: string | null | undefined) => {
  const p = nif?.match(/^[A-HJ-NP-SUVW](\d{2})\d{5}/)?.[1];
  return p && PROVINCIAS_INE[p] ? p : null;
};

/**
 * Ayudas que sirven para programar: las útiles para el mánager y las de actividades de asociaciones o de cultura
 * popular del municipio (de ahí salen las fiestas y los conciertos). No las de escuelas de música, becas, obras...
 */
const PARA_ASOCIACIONES = /^Asociaciones, entidades o barrios del municipio/;
export function paraProgramar(c: Convocatoria): boolean {
  const { musical, culturaGeneral, descarte } = c.clasificacion;
  // Las de actividades de las asociaciones del municipio (festes, cultura popular) cuentan aunque no digan «música».
  if (descarte && PARA_ASOCIACIONES.test(descarte)) return true;
  if (!musical && !culturaGeneral) return false;
  return !descarte || (culturaGeneral && /^No es de música$/.test(descarte));
}

/**
 * Entidades que pueden contratar un concierto: organizan fiestas, ciclos o festivales, o gestionan una sala.
 * Lo demás (castellers, pastorets, gegants, bandas y corales aficionadas, escuelas, deporte...) no es cliente.
 */
const CONTRATA =
  /\b(festes|fiestas|festa major|fiesta mayor|comissio de festes|comision de fiestas|comisio|festers|festeros|festeres|penya|penyes|pena|penas|amics de la musica|amigos de la musica|filarmonica|filharmonica|joventuts musicals|juventudes musicales|pro musica|ateneu|ateneo|casino|casal|cercle|circulo|liceo|societat recreativa|sociedad recreativa|centre cultural|centro cultural|festival|festivals|cicle|ciclo|concerts|conciertos|jazz|blues|auditori|auditorio|sala de concerts|sala de conciertos|fundacio (ciutat|municipal|privada? de cultura)|fundacion (ciudad|municipal)|fundacio\w* .*(cultur|music|teatr)|fundacion\w* .*(cultur|music|teatr)|promocio cultural|promocion cultural|patronat|patronato)\b/;
const NO_CONTRATA =
  /\b(castell\w*|xiquets|minyons|pastorets|gegant\w*|capgros\w*|diables|dimonis|grallers|esbart|bastoners|trabucaires|escola|escuela|escoles|escuelas|ampa|afa|apa|esport\w*|deport\w*|futbol|club|banda|bandes|bandas|coral|corals|corales|orfeo|orfeon|coro|coros|escolania|rondalla|txaranga|charanga|agrupacio teatral|grup de teatre|grupo de teatro|teatre amateur|aficionat\w*|aficionad\w*|gent gran|jubilats|jubilados|veins|vecinos|bombers|protecc\w* civil|caritat|caritas|taurin\w*|esplai|historia|teatro joven|companyia|compania|cia|parroquia|germandat|hermandad|cofradia|confraria)\b/;
export const puedeContratar = (nombre: string) => {
  const n = normalizar(nombre);
  return PEDANIA.test(n) || (CONTRATA.test(n) && !NO_CONTRATA.test(n));
};

/** «Associació Cultural Pastorets de Montblanc» → «Montblanc». */
const lugaresDelNombre = (nombre: string) =>
  [...nombre.matchAll(/\b(?:de|del|d['’])\s*/gi)].map((m) => nombre.slice(m.index! + m[0].length).replace(/[,(].*$/, '').trim()).filter(Boolean);

const resumen = () => ({ importe: 0, numero: 0, ultima: null as string | null, concesiones: [] as ConcesionRecibida[] });
const anotar = (x: { importe: number; numero: number; ultima: string | null; concesiones: ConcesionRecibida[] }, c: ConcesionRecibida) => {
  x.importe += c.importe;
  x.numero++;
  if (c.fecha && (!x.ultima || c.fecha > x.ultima)) x.ultima = c.fecha;
  x.concesiones.push(c);
};

export interface IndiceSubvenciones {
  porMunicipio: Map<string, SubvencionesMunicipio>;
  /** Pedanías y entidades locales menores que reciben ayudas, con su provincia (no siempre se sabe su municipio). */
  pedanias: (EntidadSubvencionada & { codigoProvincia: string | null; municipio: ContactoMunicipio | null })[];
}

export function indiceSubvenciones(convocatorias: Convocatoria[], contactos: Contactos | null): IndiceSubvenciones {
  const porMunicipio = new Map<string, SubvencionesMunicipio>();
  const entidadesPorIne = new Map<string, Map<string, EntidadSubvencionada>>();
  const pedanias = new Map<string, EntidadSubvencionada & { codigoProvincia: string | null; municipio: ContactoMunicipio | null }>();
  const de = (ine: string) => {
    let s = porMunicipio.get(ine);
    if (!s) porMunicipio.set(ine, (s = { ayuntamiento: resumen(), entidades: [] }));
    return s;
  };
  if (!contactos) return { porMunicipio, pedanias: [] };

  for (const c of convocatorias) {
    if (!c.concesiones?.entidades.length || !paraProgramar(c)) continue;
    const convocante = c.organoNiveles.at(-1) ?? c.organo;
    const deUnAyuntamiento = c.ubicacion?.codigoMunicipio ?? null;
    for (const e of c.concesiones.entidades) {
      const concesion: ConcesionRecibida = { convocatoria: c.id, titulo: c.titulo, convocante, importe: e.importe, fecha: e.fecha };
      const prov = provinciaDeNif(e.nif) ?? c.ubicacion?.codigoProvincia ?? null;
      const n = normalizar(e.nombre);
      if (PEDANIA.test(n)) {
        const k = e.nif ?? `${n}|${prov ?? ''}`;
        const x = pedanias.get(k) ?? { nombre: e.nombre, pedania: true, ...resumen(), codigoProvincia: prov, municipio: deUnAyuntamiento ? contactos.porCodigo(deUnAyuntamiento) : null };
        anotar(x, concesion);
        pedanias.set(k, x);
        continue;
      }
      if (esOrganoMunicipal(e.nombre)) {
        // Un ayuntamiento que se da una ayuda a sí mismo no es dinero nuevo.
        const m = contactos.deOrgano(e.nombre, null, prov);
        if (m && m.codigoIne !== deUnAyuntamiento) anotar(de(m.codigoIne).ayuntamiento, concesion);
        continue;
      }
      if (!puedeContratar(e.nombre)) continue;
      // Entidades del pueblo: las que subvenciona su propio ayuntamiento, o las que llevan su nombre («... de Montblanc»).
      const m = (deUnAyuntamiento && contactos.porCodigo(deUnAyuntamiento)) || (prov ? lugaresDelNombre(e.nombre).map((l) => contactos.buscar(l, prov)).find(Boolean) : null);
      if (!m) continue;
      const mapa = entidadesPorIne.get(m.codigoIne) ?? new Map<string, EntidadSubvencionada>();
      const x = mapa.get(n) ?? { nombre: e.nombre, pedania: false, ...resumen() };
      anotar(x, concesion);
      mapa.set(n, x);
      entidadesPorIne.set(m.codigoIne, mapa);
    }
  }
  for (const p of pedanias.values()) if (p.municipio) entidadesPorIne.set(p.municipio.codigoIne, (entidadesPorIne.get(p.municipio.codigoIne) ?? new Map()).set(normalizar(p.nombre), p));
  const ordenar = (xs: ConcesionRecibida[]) => xs.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '')).slice(0, 12);
  for (const [ine, mapa] of entidadesPorIne) de(ine).entidades = [...mapa.values()].sort((a, b) => b.importe - a.importe).map((x) => ({ ...x, concesiones: ordenar(x.concesiones) }));
  for (const s of porMunicipio.values()) s.ayuntamiento.concesiones = ordenar(s.ayuntamiento.concesiones);
  return { porMunicipio, pedanias: [...pedanias.values()] };
}
