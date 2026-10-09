// Series: la misma convocatoria repetida año tras año (mismo organismo y el mismo título
// quitando años, números de edición y fechas). Sirven para mostrar su historial y estimar
// cuándo volverá a salir.

import { createHash } from 'node:crypto';
import { normalizar } from './clasificacion/musica.js';
import type { Convocatoria, Serie } from './tipos.js';

const PALABRAS_VACIAS = new Set(
  'a al ano anos con de del el en la las lo los para per por que se su sus un una y i o d l the edicion convocatoria convocatorias bases reguladoras aprobacion extracto resolucion subvencion subvenciones ayuda ayudas concesion'.split(
    ' ',
  ),
);
const MESES = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|gener|febrer|marc|maig|juny|juliol|agost|setembre|octubre|novembre|desembre)\b/g;
// Ordinales de edición: "XXVI", "13ª", "vigésimo tercer"...
const ROMANOS = /\b[ivxlcdm]+\b/g;
const ORDINALES =
  /\b(primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|sext[oa]|septim[oa]|octav[oa]|noven[oa]|decim[oa]|undecim[oa]|duodecim[oa]|vigesim[oa]|trigesim[oa]|cuadragesim[oa]|quincuagesim[oa])\b/g;

/** Palabras significativas del título, sin años, números, fechas ni ordinales. */
export function esqueleto(titulo: string): Set<string> {
  const t = normalizar(titulo)
    .replace(MESES, ' ')
    .replace(ORDINALES, ' ')
    .replace(/\d+[ºª]?/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(ROMANOS, ' ');
  return new Set(t.split(/\s+/).filter((p) => p.length > 1 && !PALABRAS_VACIAS.has(p)));
}

export function parecido(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let comunes = 0;
  for (const p of a) if (b.has(p)) comunes++;
  return comunes / (a.size + b.size - comunes);
}

const UMBRAL = 0.7;

const mesDe = (c: Convocatoria) => Number((c.fechaInicioSolicitud ?? c.fechaPublicacion ?? '').slice(5, 7)) || null;
const anioDe = (c: Convocatoria) => Number((c.fechaPublicacion ?? '').slice(0, 4)) || null;

function moda(valores: number[]): number | null {
  const cuenta = new Map<number, number>();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  let mejor: number | null = null;
  for (const [v, n] of cuenta) if (mejor === null || n > cuenta.get(mejor)!) mejor = v;
  return mejor;
}

/**
 * Estimación de la próxima convocatoria: solo para series vivas (convocadas este año o el
 * anterior) con un mes habitual. Si este año aún no ha salido y su mes ya pasó, se marca
 * como retrasada.
 */
export function preverProxima(
  anios: number[],
  mesHabitual: number | null,
  hoy: Date,
): Pick<Serie, 'proximaPrevista' | 'retrasada'> {
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const ultimo = anios.at(-1);
  if (mesHabitual === null || ultimo === undefined || ultimo < anioActual - 1) {
    return { proximaPrevista: null, retrasada: false };
  }
  const yaSalioEsteAnio = ultimo >= anioActual;
  const anio = yaSalioEsteAnio ? anioActual + 1 : anioActual;
  return {
    proximaPrevista: `${anio}-${String(mesHabitual).padStart(2, '0')}`,
    retrasada: !yaSalioEsteAnio && mesHabitual < mesActual,
  };
}

/**
 * Agrupa las convocatorias en series y devuelve, por id de convocatoria, la serie a la que
 * pertenece. Solo hay serie si se repite en al menos dos años distintos.
 */
export function calcularSeries(convocatorias: Convocatoria[], hoy = new Date()): Map<string, Serie> {
  const porOrgano = new Map<string, Convocatoria[]>();
  for (const c of convocatorias) {
    const clave = normalizar(c.organoNiveles.join(' > '));
    if (!porOrgano.has(clave)) porOrgano.set(clave, []);
    porOrgano.get(clave)!.push(c);
  }

  const resultado = new Map<string, Serie>();
  for (const [organo, grupo] of porOrgano) {
    // Unión de conjuntos: dos convocatorias del mismo órgano con títulos equivalentes van juntas.
    const padre = grupo.map((_, i) => i);
    const raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i]!)));
    const esqueletos = grupo.map((c) => esqueleto(c.titulo));
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        if (parecido(esqueletos[i]!, esqueletos[j]!) >= UMBRAL) padre[raiz(i)] = raiz(j);
      }
    }
    const clusters = new Map<number, Convocatoria[]>();
    grupo.forEach((c, i) => {
      const r = raiz(i);
      if (!clusters.has(r)) clusters.set(r, []);
      clusters.get(r)!.push(c);
    });

    for (const miembros of clusters.values()) {
      const anios = [...new Set(miembros.map(anioDe).filter((a): a is number => a !== null))].sort();
      if (anios.length < 2) continue;
      miembros.sort((a, b) => (a.fechaPublicacion ?? '').localeCompare(b.fechaPublicacion ?? ''));
      const mesHabitual = moda(miembros.map(mesDe).filter((m): m is number => m !== null));
      const prevision = preverProxima(anios, mesHabitual, hoy);
      const id = createHash('sha1')
        .update(`${organo}|${miembros[0]!.codigoBdns}`)
        .digest('hex')
        .slice(0, 12);
      const serie: Serie = {
        id,
        anios,
        mesHabitual,
        ...prevision,
        convocatorias: miembros.map((c) => ({
          id: c.id,
          anio: anioDe(c),
          titulo: c.titulo,
          presupuesto: c.presupuesto,
          concedido: c.concesiones?.importeTotal ?? null,
          fechaInicioSolicitud: c.fechaInicioSolicitud,
          fechaFinSolicitud: c.fechaFinSolicitud,
        })),
      };
      for (const c of miembros) resultado.set(c.id, serie);
    }
  }
  return resultado;
}
