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

describe('ccaaDesdeNombre (nombres de la BDNS)', () => {
  it('reconoce las variantes', async () => {
    const { ccaaDesdeNombre } = await import('../src/regiones.js');
    expect(ccaaDesdeNombre('COMUNIDAD VALENCIANA')).toBe('Comunitat Valenciana');
    expect(ccaaDesdeNombre('PRINCIPADO DE ASTURIAS')).toBe('Principado de Asturias');
    expect(ccaaDesdeNombre('CASTILLA Y LEÓN')).toBe('Castilla y León');
    expect(ccaaDesdeNombre('CASTILLA-LA MANCHA')).toBe('Castilla-La Mancha');
    expect(ccaaDesdeNombre('CATALUÑA')).toBe('Cataluña');
    expect(ccaaDesdeNombre('CIUDAD AUTONOMA DE CEUTA')).toBe('Ceuta');
    expect(ccaaDesdeNombre('ANDALUCÍA')).toBe('Andalucía');
    expect(ccaaDesdeNombre('ESTADO')).toBeNull();
  });

  it('"TODO EL MUNDO" no restringe el territorio', () => {
    expect(ambitoDesdeRegiones(['XXXX - TODO EL MUNDO']).nacional).toBe(true);
  });
});
