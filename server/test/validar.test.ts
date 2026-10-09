import { describe, expect, it } from 'vitest';
import { ErrorFormato, problemasDetalle, VigilanteFormato } from '../src/bdns/validar.js';
import { DETALLE_NATURAJAZZ } from './ayudas.js';

describe('problemasDetalle', () => {
  it('la respuesta real no tiene problemas', () => {
    expect(problemasDetalle(DETALLE_NATURAJAZZ, '934378')).toEqual([]);
  });

  it('detecta campos que faltan o cambian de tipo', () => {
    expect(problemasDetalle({ ...DETALLE_NATURAJAZZ, codigoBDNS: undefined }, '934378')).toEqual([
      'codigoBDNS undefined no es 934378',
    ]);
    expect(problemasDetalle({ ...DETALLE_NATURAJAZZ, fechaRecepcion: '08/10/2026' }, '934378')).toEqual([
      'fechaRecepcion "08/10/2026"',
    ]);
    expect(
      problemasDetalle({ ...DETALLE_NATURAJAZZ, regiones: 'ES511' as never, organo: undefined }, '934378'),
    ).toEqual(['sin organo.nivel1', 'regiones no es una lista']);
  });
});

describe('VigilanteFormato', () => {
  it('tolera fallos sueltos y para si fallan demasiadas', () => {
    const v = new VigilanteFormato(5, 0.2);
    const malo = { ...DETALLE_NATURAJAZZ, descripcion: '' };
    expect(v.revisar(malo, '934378')).toBe(false);
    for (let i = 0; i < 4; i++) expect(v.revisar(DETALLE_NATURAJAZZ, '934378')).toBe(true);
    // 1 de 5 = 20 %: todavía se tolera. La siguiente mala supera el límite.
    expect(() => v.revisar(malo, '934378')).toThrow(ErrorFormato);
  });
});
