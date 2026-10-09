import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type ElementoMuestra, type Etiqueta, evaluar, UNIVERSO_2024_2025, UNIVERSO_VALIDACION } from '../src/evaluacion.js';

const leer = <T>(f: string) => JSON.parse(readFileSync(new URL(`./evaluacion/${f}`, import.meta.url), 'utf8')) as T;

// Mínimos exigidos al clasificador sobre la muestra etiquetada a mano (ver docs/evaluacion-clasificador.md).
const MINIMOS = { precision: 0.97, cobertura: 0.9, coberturaCompatibles: 0.9, aciertoCompatibilidad: 0.9 };

describe('evaluación del clasificador', () => {
  it('muestra 1 (2024-2025, semilla 20261009): cumple los mínimos', () => {
    const r = evaluar(leer<ElementoMuestra[]>('muestra.json'), leer<Etiqueta[]>('etiquetas.json'), UNIVERSO_2024_2025);
    expect(r.precision).toBeGreaterThanOrEqual(MINIMOS.precision);
    expect(r.cobertura).toBeGreaterThanOrEqual(MINIMOS.cobertura);
    expect(r.coberturaCompatibles).toBeGreaterThanOrEqual(MINIMOS.coberturaCompatibles);
    expect(r.aciertoCompatibilidad).toBeGreaterThanOrEqual(MINIMOS.aciertoCompatibilidad);
  });

  it('muestra 2 (2024-2025, semilla 7771): cumple los mínimos', () => {
    const r = evaluar(
      leer<ElementoMuestra[]>('muestra-validacion.json'),
      leer<Etiqueta[]>('etiquetas-validacion.json'),
      UNIVERSO_VALIDACION,
    );
    expect(r.precision).toBeGreaterThanOrEqual(MINIMOS.precision);
    expect(r.cobertura).toBeGreaterThanOrEqual(MINIMOS.cobertura);
    expect(r.coberturaCompatibles).toBeGreaterThanOrEqual(MINIMOS.coberturaCompatibles);
    expect(r.aciertoCompatibilidad).toBeGreaterThanOrEqual(MINIMOS.aciertoCompatibilidad);
  });
});
