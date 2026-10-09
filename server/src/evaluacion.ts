// Evaluación del clasificador con la muestra etiquetada a mano (test/evaluacion/).
// La muestra está estratificada (aceptadas, rechazadas al azar, rechazadas "difíciles"),
// así que la cobertura se estima ponderando cada estrato por su tamaño real.

import { clasificar } from './clasificacion/musica.js';

export interface ElementoMuestra {
  codigo: string;
  estrato: 'aceptado' | 'rechazado' | 'rechazado-dificil';
  titulo: string;
  tituloLengua: string | null;
}

export interface Etiqueta {
  codigo: string;
  /** null = no se puede saber por el título (se excluye de las métricas). */
  musical: boolean | null;
  /** Solo si es de música: compatible con jazz, clásica u ópera (no dirigida a otro género). */
  compatible: boolean | null;
  nota?: string;
}

/** Tamaño de cada estrato en el universo muestreado (listados de 2024-2025, ver muestra-evaluacion.ts). */
export interface Universo {
  aceptadas: number;
  rechazadas: number;
}

export interface Resultado {
  /** De lo que el clasificador marca como música, qué parte lo es. */
  precision: number;
  /** De lo que es música, qué parte encuentra (estimada ponderando estratos). */
  cobertura: number;
  /** Igual, pero solo para lo compatible con jazz, clásica u ópera (lo que importa al promotor). */
  coberturaCompatibles: number;
  /** Acierto en "compatible" entre las de música que el clasificador acepta. */
  aciertoCompatibilidad: number;
  errores: { codigo: string; titulo: string; esperado: string; obtenido: string; nota?: string }[];
}

const textoDe = (m: ElementoMuestra) => [m.titulo, m.tituloLengua].filter(Boolean).join('\n');

/**
 * Las métricas se estiman sobre el universo: cada estrato pesa por su tamaño real. El estrato
 * "rechazado-dificil" (subconjunto de las rechazadas) solo sirve para listar errores.
 */
export function evaluar(muestra: ElementoMuestra[], etiquetas: Etiqueta[], universo: Universo): Resultado {
  const porCodigo = new Map(etiquetas.map((e) => [e.codigo, e]));
  const errores: Resultado['errores'] = [];
  // Recuentos por estrato: [vp, fp, fn] para "música" y para "compatible".
  const vacio = () => ({ n: 0, vp: 0, fp: 0, fn: 0, cvp: 0, cfp: 0, cfn: 0 });
  const estratos = { aceptado: vacio(), rechazado: vacio() };
  let compatOk = 0;
  let compatTotal = 0;

  for (const m of muestra) {
    const e = porCodigo.get(m.codigo);
    if (!e || e.musical === null) continue;
    const c = clasificar({ texto: textoDe(m) });
    const predicho = c.musical;
    const compatiblePredicho = predicho && c.estilosCompatibles.length > 0;
    const compatibleReal = e.musical && e.compatible === true;

    if (predicho !== e.musical) {
      errores.push({
        codigo: m.codigo,
        titulo: m.titulo,
        esperado: e.musical ? 'música' : 'no es música',
        obtenido: predicho ? 'música' : 'no es música',
        nota: e.nota,
      });
    } else if (predicho && e.compatible !== null) {
      compatTotal++;
      if (compatiblePredicho === e.compatible) compatOk++;
      else
        errores.push({
          codigo: m.codigo,
          titulo: m.titulo,
          esperado: e.compatible ? 'compatible' : 'otro género',
          obtenido: compatiblePredicho ? 'compatible' : `otro género (${c.otrosGeneros.join(', ')})`,
          nota: e.nota,
        });
    }

    const s = m.estrato === 'aceptado' ? estratos.aceptado : m.estrato === 'rechazado' ? estratos.rechazado : null;
    if (!s) continue;
    s.n++;
    if (predicho && e.musical) s.vp++;
    if (predicho && !e.musical) s.fp++;
    if (!predicho && e.musical) s.fn++;
    if (compatiblePredicho && compatibleReal) s.cvp++;
    if (compatiblePredicho && !compatibleReal) s.cfp++;
    if (!compatiblePredicho && compatibleReal) s.cfn++;
  }

  // Proporción de cada estrato elevada a su tamaño en el universo.
  const total = (clave: 'vp' | 'fp' | 'fn' | 'cvp' | 'cfp' | 'cfn') =>
    (estratos.aceptado.n ? (estratos.aceptado[clave] / estratos.aceptado.n) * universo.aceptadas : 0) +
    (estratos.rechazado.n ? (estratos.rechazado[clave] / estratos.rechazado.n) * universo.rechazadas : 0);
  const cociente = (a: number, b: number) => (a + b === 0 ? 1 : a / (a + b));

  return {
    precision: cociente(total('vp'), total('fp')),
    cobertura: cociente(total('vp'), total('fn')),
    coberturaCompatibles: cociente(total('cvp'), total('cfn')),
    aciertoCompatibilidad: compatTotal ? compatOk / compatTotal : 1,
    errores,
  };
}

/** Tamaños de los estratos en cada muestra (salen en el log de muestra-evaluacion). */
export const UNIVERSO_2024_2025: Universo = { aceptadas: 3174, rechazadas: 32111 };
export const UNIVERSO_VALIDACION: Universo = { aceptadas: 3683, rechazadas: 31302 };
export const UNIVERSO_FINAL: Universo = { aceptadas: 3521, rechazadas: 31164 };
