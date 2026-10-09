// Directorio de organismos que financian música: quién convoca, cuánto concede, a quién y
// con qué regularidad. Se calcula a partir de las convocatorias de música descargadas.

import { createHash } from 'node:crypto';
import { normalizar } from './clasificacion/musica.js';
import type { Administracion, Convocatoria, Ubicacion } from './tipos.js';

export interface Organismo {
  id: string;
  /** Órgano concreto (último nivel de la BDNS). */
  nombre: string;
  /** Entidad a la que pertenece: municipio, diputación, comunidad o ministerio (nivel2). */
  entidad: string | null;
  niveles: string[];
  administracion: Administracion;
  ubicacion: Ubicacion | null;
  convocatorias: number;
  concursos: number;
  directas: number;
  /** Convocatorias que se repiten año tras año. */
  series: number;
  presupuestoTotal: number;
  concedidoTotal: number;
  primerAnio: number | null;
  ultimoAnio: number | null;
  porAnio: { anio: number; convocatorias: number; presupuesto: number; concedido: number }[];
  /** Personas jurídicas que más han recibido de este organismo en convocatorias de música. */
  beneficiarios: { nombre: string; importe: number; veces: number }[];
  /** Ids de sus convocatorias, de la más reciente a la más antigua. */
  idsConvocatorias: string[];
}

export const idOrganismo = (niveles: string[]) =>
  createHash('sha1').update(normalizar(niveles.join(' > '))).digest('hex').slice(0, 10);

const anioDe = (c: Convocatoria) => Number((c.fechaPublicacion ?? '').slice(0, 4)) || null;
const redondear = (n: number) => Math.round(n * 100) / 100;

export function agruparOrganismos(convocatorias: Convocatoria[]): Organismo[] {
  const grupos = new Map<string, Convocatoria[]>();
  for (const c of convocatorias) {
    if (!c.clasificacion.musical) continue;
    const id = idOrganismo(c.organoNiveles);
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id)!.push(c);
  }

  return [...grupos.entries()].map(([id, cs]) => {
    cs.sort((a, b) => (b.fechaPublicacion ?? '').localeCompare(a.fechaPublicacion ?? ''));
    const primera = cs[0]!;
    const porAnio = new Map<number, { anio: number; convocatorias: number; presupuesto: number; concedido: number }>();
    const beneficiarios = new Map<string, { nombre: string; importe: number; veces: number }>();
    for (const c of cs) {
      const anio = anioDe(c);
      if (anio !== null) {
        const a = porAnio.get(anio) ?? { anio, convocatorias: 0, presupuesto: 0, concedido: 0 };
        a.convocatorias++;
        a.presupuesto += c.presupuesto ?? 0;
        a.concedido += c.concesiones?.importeTotal ?? 0;
        porAnio.set(anio, a);
      }
      for (const e of c.concesiones?.entidades ?? []) {
        const b = beneficiarios.get(e.nombre) ?? { nombre: e.nombre, importe: 0, veces: 0 };
        b.importe += e.importe;
        b.veces++;
        beneficiarios.set(e.nombre, b);
      }
    }
    const anios = [...porAnio.keys()].sort();
    return {
      id,
      nombre: primera.organo,
      entidad: primera.organoNiveles[1] ?? null,
      niveles: primera.organoNiveles,
      administracion: primera.administracion,
      ubicacion: primera.ubicacion,
      convocatorias: cs.length,
      concursos: cs.filter((c) => c.tipo === 'concurrencia').length,
      directas: cs.filter((c) => c.tipo === 'directa').length,
      series: new Set(cs.map((c) => c.serie?.id).filter(Boolean)).size,
      presupuestoTotal: redondear(cs.reduce((t, c) => t + (c.presupuesto ?? 0), 0)),
      concedidoTotal: redondear(cs.reduce((t, c) => t + (c.concesiones?.importeTotal ?? 0), 0)),
      primerAnio: anios[0] ?? null,
      ultimoAnio: anios.at(-1) ?? null,
      porAnio: [...porAnio.values()]
        .sort((a, b) => a.anio - b.anio)
        .map((a) => ({ ...a, presupuesto: redondear(a.presupuesto), concedido: redondear(a.concedido) })),
      beneficiarios: [...beneficiarios.values()]
        .sort((a, b) => b.importe - a.importe)
        .slice(0, 15)
        .map((b) => ({ ...b, importe: redondear(b.importe) })),
      idsConvocatorias: cs.map((c) => c.id),
    };
  });
}
