import { describe, expect, it } from 'vitest';
import { ambitoDesdeRegiones } from '../src/regiones.js';

describe('ambitoDesdeRegiones', () => {
  it('provincia → comunidad y provincia', () => {
    expect(ambitoDesdeRegiones(['ES511 - Barcelona'])).toEqual({
      nacional: false,
      ccaa: ['Cataluña'],
      provincias: ['Barcelona'],
    });
  });

  it('comunidad completa', () => {
    expect(ambitoDesdeRegiones(['ES61 - ANDALUCIA'])).toEqual({ nacional: false, ccaa: ['Andalucía'], provincias: [] });
  });

  it('NUTS1 se expande a sus comunidades', () => {
    expect(ambitoDesdeRegiones(['ES5 - ESTE']).ccaa).toEqual(['Cataluña', 'Comunitat Valenciana', 'Illes Balears']);
  });

  it('España entera o sin regiones es ámbito nacional', () => {
    expect(ambitoDesdeRegiones(['ES - ESPAÑA']).nacional).toBe(true);
    expect(ambitoDesdeRegiones([]).nacional).toBe(true);
  });
});
