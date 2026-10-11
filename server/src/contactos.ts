// A quién contactar en cada ayuntamiento: datos/directorio/ (ver datos/LEEME.md).
// - ayuntamientos.csv: los municipios del INE con el contacto del ayuntamiento, alcaldía y, si se conoce, cultura.
// - cultura.csv: concejales y técnicos de cultura, cada uno con su fuente y año.
// Son cargos públicos en su función. Aun así, de las personas solo se enseña el contacto institucional:
// un email de proveedor gratuito o un móvil de una persona concreta se omiten (el del ayuntamiento sí se enseña,
// porque muchos municipios pequeños usan una cuenta gratuita como email oficial).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizar } from './clasificacion/musica.js';

export interface PersonaCultura {
  nombre: string;
  cargo: string | null;
  area: string | null;
  partido: string | null;
  email: string | null;
  telefono: string | null;
  web: string | null;
  direccion: string | null;
  notas: string | null;
  fuente: string | null;
  enlace: string | null;
  anio: number | null;
  /** Había un email o móvil personal que no se enseña. */
  contactoOmitido: boolean;
}

export interface ContactoMunicipio {
  codigoIne: string;
  municipio: string;
  provincia: string;
  ccaa: string;
  poblacion: number | null;
  ayuntamiento: { telefono: string | null; email: string | null; web: string | null; direccion: string | null };
  alcaldia: { nombre: string; partido: string | null } | null;
  /** Email y teléfono de la concejalía o el área de cultura, cuando se conocen. */
  cultura: { email: string | null; telefono: string | null };
  personas: PersonaCultura[];
  fuentes: string | null;
}

/** Lee un CSV con comillas dobles ("a, b" y "" escapadas). */
export function leerCsv(texto: string, separador = ','): Record<string, string>[] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]!;
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === separador) {
      fila.push(campo);
      campo = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else campo += ch;
  }
  if (campo || fila.length) filas.push([...fila, campo]);
  const [cabecera, ...resto] = filas.filter((f) => f.some((x) => x.trim()));
  if (!cabecera) return [];
  const claves = cabecera.map((c) => c.replace(/^﻿/, '').trim());
  return resto.map((f) => Object.fromEntries(claves.map((k, j) => [k, (f[j] ?? '').trim()])));
}

const EMAIL_GRATUITO = /@(gmail|googlemail|hotmail|live|yahoo|outlook|icloud|msn|ymail|me)\.[a-z.]+$/i;
const MOVIL = /^\s*(\+34\s*)?[67]/;
const valor = (x: string | undefined) => (x && x.trim() ? x.trim() : null);

/** Quita los emails gratuitos y los móviles de una lista "a; b". */
function institucional(lista: string | null, esPersonal: (x: string) => boolean): { valor: string | null; omitido: boolean } {
  if (!lista) return { valor: null, omitido: false };
  const partes = lista.split(/\s*[;/]\s*/).filter(Boolean);
  const quedan = partes.filter((p) => !esPersonal(p));
  return { valor: quedan.length ? quedan.join('; ') : null, omitido: quedan.length < partes.length };
}

/** Variantes de un nombre de municipio: "Ejido, El" = "El Ejido"; "Castelló/Castellón" = cada parte. */
export function clavesMunicipio(nombre: string): string[] {
  const resultado = new Set<string>();
  for (const parte of nombre.split('/')) {
    const p = normalizar(parte).replace(/[^a-z0-9, ']/g, ' ').replace(/\s+/g, ' ').trim();
    if (!p) continue;
    const m = /^(.*), (el|la|los|las|l'|l|lo|els|les|a|o|os|as|es|sa|ses|s')$/.exec(p);
    resultado.add(m ? `${m[2]}${m[2]!.endsWith("'") ? '' : ' '}${m[1]}` : p.replace(/,/g, ''));
  }
  return [...resultado];
}

/** Órganos que son el propio ayuntamiento o dependen de él (no diputaciones, comarcas ni la comunidad). */
const MUNICIPAL = /\b(ayuntamiento|ajuntament|concello|udala|ayto|municipal|municipals|municipales|alcald[ií]a|concejal[ií]a|regidor[ií]a)\b/i;
const NO_MUNICIPAL = /\b(diputaci[oó]n|diputaci[oó]|deputaci[oó]n|cabildo|consell (comarcal|insular)|consejo (comarcal|insular)|comarca|comarcal|mancomunidad|mancomunitat|generalitat|gobierno de|consorcio|consorci|universidad|universitat)\b/i;
export const esOrganoMunicipal = (nombre: string) => MUNICIPAL.test(nombre) && !NO_MUNICIPAL.test(nombre);

export class Contactos {
  private readonly porIne = new Map<string, ContactoMunicipio>();
  private readonly porNombre = new Map<string, string[]>();

  constructor(ayuntamientos: Record<string, string>[], cultura: Record<string, string>[]) {
    for (const a of ayuntamientos) {
      const codigo = a['Código INE'];
      if (!codigo || !/^\d{5}$/.test(codigo)) continue;
      const telCultura = institucional(valor(a['Teléfono cultura']), (x) => MOVIL.test(x));
      const emailCultura = institucional(valor(a['Email cultura']), (x) => EMAIL_GRATUITO.test(x));
      this.porIne.set(codigo, {
        codigoIne: codigo,
        municipio: a['Municipio'] ?? '',
        provincia: a['Provincia'] ?? '',
        ccaa: a['Comunidad autónoma'] ?? '',
        poblacion: Number(a['Población']) || null,
        ayuntamiento: {
          telefono: valor(a['Teléfono ayuntamiento']),
          email: valor(a['Email ayuntamiento']),
          web: valor(a['Web']),
          direccion: valor(a['Dirección']),
        },
        alcaldia: valor(a['Alcalde/sa']) ? { nombre: a['Alcalde/sa']!, partido: valor(a['Partido alcaldía']) } : null,
        cultura: { email: emailCultura.valor, telefono: telCultura.valor },
        personas: [],
        fuentes: valor(a['Fuentes']),
      });
      for (const k of clavesMunicipio(a['Municipio'] ?? '')) {
        const clave = `${codigo.slice(0, 2)}|${k}`;
        this.porNombre.set(clave, [...(this.porNombre.get(clave) ?? []), codigo]);
      }
    }
    for (const c of cultura) {
      const m = this.porIne.get(c['Código INE'] ?? '');
      // Solo ayuntamientos: los consejos comarcales no son el municipio de su capital.
      if (!m || (c['Tipo de entidad'] && c['Tipo de entidad'] !== 'Ayuntamiento') || !valor(c['Nombre'])) continue;
      const email = institucional(valor(c['Email cultura']), (x) => EMAIL_GRATUITO.test(x));
      const telefono = institucional(valor(c['Teléfono cultura']), (x) => MOVIL.test(x));
      m.personas.push({
        nombre: c['Nombre']!,
        cargo: valor(c['Cargo']),
        area: valor(c['Área de gobierno']),
        partido: valor(c['Partido']),
        email: email.valor,
        telefono: telefono.valor,
        web: valor(c['Web cultura']),
        direccion: valor(c['Dirección cultura']),
        notas: valor(c['Notas']),
        fuente: valor(c['Fuente']),
        enlace: valor(c['Enlace a la fuente']),
        anio: Number(c['Año de la fuente']) || null,
        contactoOmitido: email.omitido || telefono.omitido,
      });
    }
  }

  static cargar(raizDatos: string): Contactos | null {
    const dir = join(raizDatos, 'directorio');
    const ayuntamientos = join(dir, 'ayuntamientos.csv');
    if (!existsSync(ayuntamientos)) return null;
    const cultura = join(dir, 'cultura.csv');
    return new Contactos(
      leerCsv(readFileSync(ayuntamientos, 'utf8')),
      existsSync(cultura) ? leerCsv(readFileSync(cultura, 'utf8')) : [],
    );
  }

  get total() {
    return this.porIne.size;
  }

  porCodigo(codigoIne: string | null | undefined): ContactoMunicipio | null {
    return (codigoIne && this.porIne.get(codigoIne)) || null;
  }

  /**
   * Municipio de un órgano de contratación municipal: primero por su nombre ("Alcaldía del Ayuntamiento de Calp"),
   * después por la ciudad de su dirección ("Calp (Alicante)").
   */
  deOrgano(nombre: string, ciudad: string | null, codigoProvincia: string | null): ContactoMunicipio | null {
    if (!esOrganoMunicipal(nombre)) return null;
    const m = /\b(?:ayuntamiento|ajuntament|concello|udala|ayto\.?)\s+(?:de\s+|d'|d’)?(.+)$/i.exec(nombre);
    const delNombre = m?.[1]?.replace(/\s*[,(].*$/, '').trim();
    const deCiudad = ciudad?.replace(/\s*[,(].*$/, '').trim();
    return this.buscar(delNombre, codigoProvincia) ?? this.buscar(deCiudad, codigoProvincia);
  }

  /** Municipio por nombre dentro de una provincia (código INE de 2 cifras); null si no hay uno solo. */
  buscar(nombre: string | null | undefined, codigoProvincia: string | null | undefined): ContactoMunicipio | null {
    if (!nombre || !codigoProvincia) return null;
    const codigos = new Set(clavesMunicipio(nombre).flatMap((k) => this.porNombre.get(`${codigoProvincia}|${k}`) ?? []));
    return codigos.size === 1 ? this.porIne.get([...codigos][0]!)! : null;
  }
}
