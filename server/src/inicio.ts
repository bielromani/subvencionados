import { type Coincidencia, emparejar } from './emparejamiento.js';
import { PERFIL_POR_DEFECTO } from './perfil.js';
import { CCAA } from './regiones.js';
import type { Grupo, Perfil } from './tipos.js';

/**
 * Lo urgente para la portada y las recomendaciones de cada grupo. Sin perfil se usa uno genérico (jazz,
 * clásica y ópera en toda España) para que la portada enseñe algo útil desde el primer día.
 */
const DIA = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const PERFIL_GENERICO: Perfil = {
  ...PERFIL_POR_DEFECTO,
  ccaaActuacion: [...CCAA],
  grupos: [
    { nombre: 'Jazz', estilo: 'jazz' },
    { nombre: 'Clásica', estilo: 'clasica' },
    { nombre: 'Ópera', estilo: 'opera' },
  ],
};

/** Sin perfil: lo que podría pedir como autónomo o empresa y como asociación (la mejor puntuación de las dos). */
export function coincidenciasGenericas(convocatorias: Parameters<typeof emparejar>[0], hoy = new Date()): Coincidencia[] {
  const mejores = new Map<string, Coincidencia>();
  for (const formaJuridica of ['autonomo', 'asociacion'] as const) {
    for (const m of emparejar(convocatorias, { ...PERFIL_GENERICO, formaJuridica }, hoy)) {
      const previa = mejores.get(m.convocatoria.id);
      if (!previa || m.puntuacion > previa.puntuacion) mejores.set(m.convocatoria.id, m);
    }
  }
  return [...mejores.values()].sort((a, b) => b.puntuacion - a.puntuacion);
}

const vigente = (m: Coincidencia) => m.plazo === 'abierta' || m.plazo === 'proxima';

/** Próxima edición prevista de una serie, desde su última convocatoria (ya cerrada). */
function prevista(m: Coincidencia, desde: string, hasta: string): string | null {
  const c = m.convocatoria;
  const s = c.serie;
  if (!s?.proximaPrevista || m.plazo !== 'cerrada' || s.convocatorias.at(-1)?.id !== c.id) return null;
  return s.proximaPrevista >= desde && s.proximaPrevista <= hasta ? s.proximaPrevista : null;
}

export interface Seleccion {
  /** Concursos que puede pedir: plazo abierto o a punto de abrir. */
  abiertas: Coincidencia[];
  /** Cierran en los próximos 30 días. */
  cierranPronto: Coincidencia[];
  abrenPronto: Coincidencia[];
  /** Ediciones esperadas en los próximos meses (estimación a partir del historial). */
  previstas: { prevista: string; coincidencia: Coincidencia }[];
  /** Premios y concursos para los músicos. */
  artistas: Coincidencia[];
}

export function seleccionar(coincidencias: Coincidencia[], hoy = new Date(), mesesPrevistas = 6): Seleccion {
  const dia = iso(hoy);
  const en30 = iso(new Date(hoy.getTime() + 30 * DIA));
  const mes = dia.slice(0, 7);
  const hasta = iso(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + mesesPrevistas, 1))).slice(0, 7);
  const directas = coincidencias.filter((m) => m.encaje === 'directo' && m.convocatoria.tipo === 'concurrencia');
  // Primero las de música y luego las generales de cultura, cada grupo por fecha.
  const porFecha = (campo: 'fechaFinSolicitud' | 'fechaInicioSolicitud') => (a: Coincidencia, b: Coincidencia) =>
    Number(!a.convocatoria.clasificacion.musical) - Number(!b.convocatoria.clasificacion.musical) ||
    (a.convocatoria[campo] ?? '9999').localeCompare(b.convocatoria[campo] ?? '9999');
  return {
    abiertas: directas.filter(vigente),
    cierranPronto: directas
      .filter((m) => m.plazo === 'abierta' && m.convocatoria.fechaFinSolicitud && m.convocatoria.fechaFinSolicitud <= en30)
      .sort(porFecha('fechaFinSolicitud')),
    abrenPronto: directas.filter((m) => m.plazo === 'proxima').sort(porFecha('fechaInicioSolicitud')),
    previstas: directas
      .filter((m) => m.convocatoria.clasificacion.musical)
      .flatMap((m) => {
        const p = prevista(m, mes, hasta);
        return p ? [{ prevista: p, coincidencia: m }] : [];
      })
      .sort((a, b) => a.prevista.localeCompare(b.prevista) || b.coincidencia.puntuacion - a.coincidencia.puntuacion),
    artistas: coincidencias.filter((m) => m.encaje === 'artistas' && vigente(m)),
  };
}

/** Convocatorias registradas en los últimos días que encajan (para saber qué hay de nuevo). */
export function nuevas(coincidencias: Coincidencia[], hoy = new Date(), dias = 14): Coincidencia[] {
  const desde = iso(new Date(hoy.getTime() - dias * DIA));
  return coincidencias
    .filter((m) => m.encaje !== 'precedente' && (m.convocatoria.fechaPublicacion ?? '') >= desde)
    .sort((a, b) => (b.convocatoria.fechaPublicacion ?? '').localeCompare(a.convocatoria.fechaPublicacion ?? ''));
}

/** Las recomendaciones de un solo grupo: el perfil del promotor con ese grupo únicamente. */
export function porGrupo(convocatorias: Parameters<typeof emparejar>[0], perfil: Perfil, hoy = new Date()) {
  return perfil.grupos.map((grupo: Grupo) => ({
    grupo,
    ...seleccionar(emparejar(convocatorias, { ...perfil, grupos: [grupo] }, hoy), hoy),
  }));
}
