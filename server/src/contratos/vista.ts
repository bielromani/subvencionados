import { clasificar, normalizar } from '../clasificacion/musica.js';
import { PROVINCIAS_INE } from '../referencias.js';
import { CCAA_POR_NUTS2, ccaaDesdeNombre, PROVINCIA_POR_NUTS3 } from '../regiones.js';
import type { Estilo } from '../tipos.js';
import type { Contrato } from './placsp.js';

/** El contrato con lo que calculamos para la web: territorio, estilos e importe adjudicado. */
export interface ContratoVista extends Contrato {
  provincia: string | null;
  codigoProvincia: string | null;
  ccaa: string | null;
  estilos: Estilo[];
  /** Suma de lo adjudicado (sin IVA) en todos sus lotes. */
  adjudicado: number | null;
  /** Fecha de la última adjudicación. */
  fechaAdjudicacion: string | null;
}

const NOMBRE_PROVINCIA = new Map(Object.entries(PROVINCIAS_INE).map(([codigo, [nombre]]) => [normalizar(nombre), codigo]));

/** Provincia: primero por el código postal del órgano (sus dos primeras cifras son la provincia del INE). */
function provincia(c: Contrato): string | null {
  const cp = c.organo.codigoPostal?.match(/^(\d{2})\d{3}$/)?.[1];
  if (cp && PROVINCIAS_INE[cp]) return cp;
  const nuts = c.lugar.nuts && PROVINCIA_POR_NUTS3[c.lugar.nuts];
  if (nuts) return NOMBRE_PROVINCIA.get(normalizar(nuts)) ?? null;
  for (const nivel of c.organo.jerarquia) {
    const codigo = NOMBRE_PROVINCIA.get(normalizar(nivel));
    if (codigo) return codigo;
  }
  return null;
}

export function enriquecer(c: Contrato): ContratoVista {
  const codigoProvincia = provincia(c);
  const ccaa =
    (codigoProvincia && PROVINCIAS_INE[codigoProvincia]![1]) ||
    (c.lugar.nuts && c.lugar.nuts.length >= 4 ? CCAA_POR_NUTS2[c.lugar.nuts.slice(0, 4)] : undefined) ||
    c.organo.jerarquia.map((n) => ccaaDesdeNombre(n)).find(Boolean) ||
    null;
  const importes = c.adjudicaciones.map((a) => a.importe).filter((x): x is number => x != null);
  const fechas = c.adjudicaciones.map((a) => a.fecha).filter((x): x is string => !!x).sort();
  return {
    ...c,
    provincia: codigoProvincia ? PROVINCIAS_INE[codigoProvincia]![0] : null,
    codigoProvincia,
    ccaa,
    estilos: clasificar({ texto: c.titulo }).estilosExplicitos,
    adjudicado: importes.length ? importes.reduce((s, x) => s + x, 0) : null,
    fechaAdjudicacion: fechas.at(-1) ?? null,
  };
}

/** Se pueden presentar ofertas: publicada y con el plazo sin vencer. */
export function abierta(c: Contrato, hoy = new Date()): boolean {
  return c.estado === 'PUB' && !!c.finPlazo && c.finPlazo >= hoy.toISOString().slice(0, 10);
}

export interface FiltroContratos {
  q?: string;
  ccaa?: string[];
  provincia?: string[];
  estilo?: string[];
  /** abiertas: se puede ofertar; adjudicadas: con adjudicatario o importe adjudicado. */
  estado?: 'abiertas' | 'adjudicadas' | '';
  menor?: 'si' | 'no' | '';
  desde?: string;
}

export function filtrarContratos(lista: ContratoVista[], f: FiltroContratos, hoy = new Date()): ContratoVista[] {
  const texto = f.q ? normalizar(f.q) : '';
  return lista.filter(
    (c) =>
      (!f.ccaa?.length || (c.ccaa && f.ccaa.includes(c.ccaa))) &&
      (!f.provincia?.length || (c.codigoProvincia && f.provincia.includes(c.codigoProvincia))) &&
      (!f.estilo?.length || f.estilo.some((e) => c.estilos.includes(e as Estilo))) &&
      (f.estado !== 'abiertas' || abierta(c, hoy)) &&
      (f.estado !== 'adjudicadas' || c.adjudicaciones.length > 0) &&
      (!f.menor || (f.menor === 'si') === c.menor) &&
      (!f.desde || (c.fechaAdjudicacion ?? c.actualizado) >= f.desde) &&
      (!texto || normalizar(`${c.titulo} ${c.organo.nombre} ${c.organo.ciudad ?? ''} ${c.adjudicaciones.map((a) => a.adjudicatario ?? '').join(' ')}`).includes(texto)),
  );
}

/** Cifras de contratación: adjudicado por año y comunidad, y empresas que más contratan (la competencia). */
export function mercadoContratos(lista: ContratoVista[]) {
  const anios = new Map<number, { anio: number; contratos: number; adjudicado: number }>();
  const comunidades = new Map<string, { nombre: string; contratos: number; adjudicado: number }>();
  const empresas = new Map<string, { nombre: string; nif: string | null; contratos: number; adjudicado: number; organismos: Set<string> }>();
  let personasFisicas = 0;
  for (const c of lista) {
    if (!c.adjudicaciones.length) continue;
    const anio = Number((c.fechaAdjudicacion ?? c.actualizado).slice(0, 4));
    const a = anios.get(anio) ?? { anio, contratos: 0, adjudicado: 0 };
    a.contratos++;
    a.adjudicado += c.adjudicado ?? 0;
    anios.set(anio, a);
    const nombre = c.ccaa ?? 'Sin situar';
    const cc = comunidades.get(nombre) ?? { nombre, contratos: 0, adjudicado: 0 };
    cc.contratos++;
    cc.adjudicado += c.adjudicado ?? 0;
    comunidades.set(nombre, cc);
    for (const adj of c.adjudicaciones) {
      if (adj.personaFisica || !adj.adjudicatario) {
        personasFisicas++;
        continue;
      }
      const clave = adj.nif ?? normalizar(adj.adjudicatario);
      const e = empresas.get(clave) ?? { nombre: adj.adjudicatario, nif: adj.nif, contratos: 0, adjudicado: 0, organismos: new Set<string>() };
      e.contratos++;
      e.adjudicado += adj.importe ?? 0;
      e.organismos.add(c.organo.nombre);
      empresas.set(clave, e);
    }
  }
  return {
    porAnio: [...anios.values()].sort((a, b) => a.anio - b.anio),
    porComunidad: [...comunidades.values()].sort((a, b) => b.adjudicado - a.adjudicado),
    empresas: [...empresas.values()]
      .sort((a, b) => b.adjudicado - a.adjudicado)
      .slice(0, 25)
      .map(({ organismos, ...e }) => ({ ...e, organismos: organismos.size })),
    adjudicacionesAPersonasFisicas: personasFisicas,
  };
}
