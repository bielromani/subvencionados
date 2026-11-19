import { describe, expect, it } from 'vitest';
import { firmaCarta } from '../src/crm/cartas.js';
import { enZona, idiomaDe } from '../src/crm/idioma.js';
import { pieBaja } from '../src/crm/envio.js';

describe('idioma de la carta', () => {
  it('Cataluña siempre en catalán; Baleares y Valencia según el partido', () => {
    expect(idiomaDe('Cataluña', null)).toBe('ca');
    expect(idiomaDe('Comunitat Valenciana', 'PP')).toBe('es');
    expect(idiomaDe('Illes Balears', 'VOX')).toBe('es');
    expect(idiomaDe('Comunitat Valenciana', 'PSOE')).toBe('ca');
    expect(idiomaDe('Illes Balears', 'MÉS per Mallorca')).toBe('ca');
    expect(idiomaDe('Comunitat Valenciana', null)).toBe('es');
    expect(idiomaDe('Madrid', 'PSOE')).toBe('es');
  });
  it('zonas: resto de España, Cataluña o una comunidad', () => {
    expect(enZona('Cataluña', 'resto')).toBe(false);
    expect(enZona('Aragón', 'resto')).toBe(true);
    expect(enZona('Cataluña', 'cataluna')).toBe(true);
    expect(enZona('Aragón', 'Aragón')).toBe(true);
    expect(enZona('Galicia', '')).toBe(true);
  });
  it('firma y pie en catalán', () => {
    const a = { firma: 'Joan\nCoordinación', firmaCa: 'Joan\nCoordinació' } as Parameters<typeof firmaCarta>[0];
    expect(firmaCarta(a, 'ca')).toBe('Joan\nCoordinació');
    expect(firmaCarta(a, 'es')).toBe('Joan\nCoordinación');
    expect(pieBaja('ca')).toMatch(/^Si no vol rebre/);
  });
});
