// Referencias territoriales para ubicar a cada organismo convocante:
// - datos/referencia/entidades-locales.json: catálogo GET /organos?idAdmon=L de la BDNS
//   (provincia > municipio o diputación > órganos).
// - datos/referencia/municipios-ine.json: nomenclátor de municipios del INE.
// Ambos los descarga el workflow .github/workflows/referencias.yml.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizar } from './clasificacion/musica.js';

/** Provincias del INE (CPRO) con su comunidad autónoma. */
export const PROVINCIAS_INE: Record<string, [nombre: string, ccaa: string]> = {
  '01': ['Araba/Álava', 'País Vasco'],
  '02': ['Albacete', 'Castilla-La Mancha'],
  '03': ['Alicante/Alacant', 'Comunitat Valenciana'],
  '04': ['Almería', 'Andalucía'],
  '05': ['Ávila', 'Castilla y León'],
  '06': ['Badajoz', 'Extremadura'],
  '07': ['Illes Balears', 'Illes Balears'],
  '08': ['Barcelona', 'Cataluña'],
  '09': ['Burgos', 'Castilla y León'],
  '10': ['Cáceres', 'Extremadura'],
  '11': ['Cádiz', 'Andalucía'],
  '12': ['Castellón/Castelló', 'Comunitat Valenciana'],
  '13': ['Ciudad Real', 'Castilla-La Mancha'],
  '14': ['Córdoba', 'Andalucía'],
  '15': ['A Coruña', 'Galicia'],
  '16': ['Cuenca', 'Castilla-La Mancha'],
  '17': ['Girona', 'Cataluña'],
  '18': ['Granada', 'Andalucía'],
  '19': ['Guadalajara', 'Castilla-La Mancha'],
  '20': ['Gipuzkoa', 'País Vasco'],
  '21': ['Huelva', 'Andalucía'],
  '22': ['Huesca', 'Aragón'],
  '23': ['Jaén', 'Andalucía'],
  '24': ['León', 'Castilla y León'],
  '25': ['Lleida', 'Cataluña'],
  '26': ['La Rioja', 'La Rioja'],
  '27': ['Lugo', 'Galicia'],
  '28': ['Madrid', 'Comunidad de Madrid'],
  '29': ['Málaga', 'Andalucía'],
  '30': ['Murcia', 'Región de Murcia'],
  '31': ['Navarra', 'Comunidad Foral de Navarra'],
  '32': ['Ourense', 'Galicia'],
  '33': ['Asturias', 'Principado de Asturias'],
  '34': ['Palencia', 'Castilla y León'],
  '35': ['Las Palmas', 'Canarias'],
  '36': ['Pontevedra', 'Galicia'],
  '37': ['Salamanca', 'Castilla y León'],
  '38': ['Santa Cruz de Tenerife', 'Canarias'],
  '39': ['Cantabria', 'Cantabria'],
  '40': ['Segovia', 'Castilla y León'],
  '41': ['Sevilla', 'Andalucía'],
  '42': ['Soria', 'Castilla y León'],
  '43': ['Tarragona', 'Cataluña'],
  '44': ['Teruel', 'Aragón'],
  '45': ['Toledo', 'Castilla-La Mancha'],
  '46': ['Valencia/València', 'Comunitat Valenciana'],
  '47': ['Valladolid', 'Castilla y León'],
  '48': ['Bizkaia', 'País Vasco'],
  '49': ['Zamora', 'Castilla y León'],
  '50': ['Zaragoza', 'Aragón'],
  '51': ['Ceuta', 'Ceuta'],
  '52': ['Melilla', 'Melilla'],
};

export interface EntidadLocal {
  /** Provincia tal como la nombra la BDNS ("A CORUÑA"). */
  provincia: string;
  /** Municipio, diputación, cabildo, comarca... ("ABEGONDO", "DIPUTACIÓN PROV. DE CÓRDOBA"). */
  entidad: string;
  organos: string[];
}

export interface MunicipioIne {
  /** Código INE de 5 cifras (provincia + municipio). */
  codigo: string;
  nombre: string;
}

export interface Ubicacion {
  provincia: string;
  codigoProvincia: string;
  ccaa: string;
  /** Solo si la entidad es un municipio del nomenclátor del INE. */
  municipio: string | null;
  codigoMunicipio: string | null;
}

/** Variantes de un nombre para comparar: sin tildes, cada parte de "Castelló/Castellón" y el artículo pospuesto. */
function claves(nombre: string): string[] {
  const partes = nombre.split('/').map((p) => normalizar(p).replace(/[^a-z0-9, ]/g, ' ').replace(/\s+/g, ' ').trim());
  const resultado = new Set<string>();
  for (const p of partes) {
    if (!p) continue;
    resultado.add(p.replace(/,/g, '').trim());
    // "palmas de gran canaria, las" -> "las palmas de gran canaria"
    const m = /^(.*), (el|la|los|las|l|lo|els|les|a|o|os|as|es|sa|ses)$/.exec(p);
    if (m) resultado.add(`${m[2]} ${m[1]}`);
  }
  return [...resultado];
}

export class Referencias {
  private readonly municipiosPorClave = new Map<string, MunicipioIne[]>();
  /** Provincia BDNS normalizada -> código INE de provincia. */
  private readonly codigoProvincia = new Map<string, string>();
  /** Entidad (nivel2) normalizada -> provincias BDNS donde existe. */
  private readonly provinciasDeEntidad = new Map<string, Set<string>>();

  constructor(entidades: EntidadLocal[], municipios: MunicipioIne[]) {
    for (const m of municipios) {
      for (const k of claves(m.nombre)) {
        if (!this.municipiosPorClave.has(k)) this.municipiosPorClave.set(k, []);
        this.municipiosPorClave.get(k)!.push(m);
      }
    }
    // Código de cada provincia de la BDNS: el más frecuente entre sus municipios reconocidos.
    const votos = new Map<string, Map<string, number>>();
    for (const e of entidades) {
      const prov = normalizar(e.provincia);
      for (const k of claves(e.entidad)) {
        if (!this.provinciasDeEntidad.has(k)) this.provinciasDeEntidad.set(k, new Set());
        this.provinciasDeEntidad.get(k)!.add(prov);
      }
      for (const m of this.municipiosPorClave.get(claves(e.entidad)[0]!) ?? []) {
        const cpro = m.codigo.slice(0, 2);
        if (!votos.has(prov)) votos.set(prov, new Map());
        votos.get(prov)!.set(cpro, (votos.get(prov)!.get(cpro) ?? 0) + 1);
      }
    }
    for (const [prov, cuenta] of votos) {
      const [mejor] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]!;
      this.codigoProvincia.set(prov, mejor);
    }
  }

  static cargar(raizDatos: string): Referencias | null {
    const dir = join(raizDatos, 'referencia');
    const rutaEntidades = join(dir, 'entidades-locales.json');
    const rutaMunicipios = join(dir, 'municipios-ine.json');
    if (!existsSync(rutaEntidades) || !existsSync(rutaMunicipios)) return null;
    return new Referencias(
      JSON.parse(readFileSync(rutaEntidades, 'utf8')) as EntidadLocal[],
      JSON.parse(readFileSync(rutaMunicipios, 'utf8')) as MunicipioIne[],
    );
  }

  /**
   * Ubica una entidad local (organo.nivel2 de la BDNS). `provinciasPista` son códigos INE de
   * provincia sacados de las regiones de la convocatoria, para deshacer empates de nombres.
   */
  ubicarEntidadLocal(entidad: string, provinciasPista: string[] = []): Ubicacion | null {
    const ks = claves(entidad);
    const provinciasBdns = new Set(ks.flatMap((k) => [...(this.provinciasDeEntidad.get(k) ?? [])]));
    let cpros = [...provinciasBdns].map((p) => this.codigoProvincia.get(p)).filter((c): c is string => !!c);
    if (cpros.length > 1 && provinciasPista.length > 0) cpros = cpros.filter((c) => provinciasPista.includes(c));

    const candidatos = ks.flatMap((k) => this.municipiosPorClave.get(k) ?? []);
    let municipios = [...new Map(candidatos.map((m) => [m.codigo, m])).values()];
    if (cpros.length > 0) municipios = municipios.filter((m) => cpros.includes(m.codigo.slice(0, 2)));
    if (municipios.length > 1 && provinciasPista.length > 0) {
      municipios = municipios.filter((m) => provinciasPista.includes(m.codigo.slice(0, 2)));
    }

    const municipio = municipios.length === 1 ? municipios[0]! : null;
    const cpro = municipio?.codigo.slice(0, 2) ?? (new Set(cpros).size === 1 ? cpros[0]! : null);
    if (!cpro || !PROVINCIAS_INE[cpro]) return null;
    const [provincia, ccaa] = PROVINCIAS_INE[cpro];
    return {
      provincia,
      codigoProvincia: cpro,
      ccaa,
      municipio: municipio?.nombre ?? null,
      codigoMunicipio: municipio?.codigo ?? null,
    };
  }
}

/** Códigos INE de provincia a partir de los nombres de provincia NUTS3 de una convocatoria. */
export function codigosProvinciaDe(provincias: string[]): string[] {
  const porNombre = new Map<string, string>();
  for (const [cpro, [nombre]] of Object.entries(PROVINCIAS_INE)) {
    for (const k of claves(nombre)) porNombre.set(k, cpro);
  }
  // Islas NUTS3 (Mallorca, Tenerife...) a su provincia.
  const islas: Record<string, string> = {
    mallorca: '07', menorca: '07', 'eivissa y formentera': '07',
    'gran canaria': '35', fuerteventura: '35', lanzarote: '35',
    tenerife: '38', 'la palma': '38', 'la gomera': '38', 'el hierro': '38',
  };
  return [
    ...new Set(
      provincias.flatMap((p) => claves(p).map((k) => porNombre.get(k) ?? islas[k])).filter((c): c is string => !!c),
    ),
  ];
}
