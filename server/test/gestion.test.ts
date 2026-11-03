import { describe, expect, it } from 'vitest';
import { esGestionIntegral } from '../src/gestionFestivales.js';

describe('gestión integral de festivales y ciclos', () => {
  it('reconoce la organización o producción de un festival o ciclo entero', () => {
    for (const t of [
      'Servicio de organización de Atlantikaldia, Festival de Música y Encuentro Cultural',
      "Contractació dels serveis d'organització, gestió i promoció del festival de música de Begur",
      'Producción, gestión y coordinación de la III Edición del Festival Impulso. Música Clásica Social',
      'Servicio de Dirección Artística del Festival Internacional de Jazz de Madrid, JAZZMADRID 2026',
      'Contratación artística y producción del Proyecto “Ciclo de música de cámara en Navidad”',
    ]) expect(esGestionIntegral(t), t).toBe(true);
  });

  it('no confunde conciertos sueltos ni servicios parciales', () => {
    for (const t of [
      'Concierto de Alicia Castillo, dentro de la programación de temporada en el Espacio Mercado.',
      'CDNM- Concierto dentro del convenio con el ayto de León para la organización conjunta del XXIII Ciclo de músicas históricas',
      'TZ- Diseño de la imagen del Teatro de la Zarzuela para la temporada 2026-2027.',
      'OCNE Intermediación, representación y gestión artística para la contratación de la Orquesta Nacional de España en el Festival',
      'Servicio de sonido e iluminación para el festival de verano',
      'Contratación de la actuación musical "MARIZA" a realizar el 6 de julio de 2024 en el marco de la programación del festival',
    ]) expect(esGestionIntegral(t), t).toBe(false);
  });
});

describe('territorio de una ayuda', async () => {
  const { cubreTerritorio } = await import('../src/gestionFestivales.js');
  const conv = (c: { provincias?: string[]; ccaa?: string[]; ambitoNacional?: boolean }) => ({ provincias: [], ccaa: [], ambitoNacional: false, ubicacion: null, ...c }) as never;
  it('una ayuda de Teruel no cubre Huesca aunque sean de Aragón', () => {
    expect(cubreTerritorio(conv({ provincias: ['Teruel'], ccaa: ['Aragón'] }), { provincia: 'Huesca', ccaa: 'Aragón' })).toBe(false);
    expect(cubreTerritorio(conv({ provincias: ['Teruel'], ccaa: ['Aragón'] }), { provincia: 'Teruel', ccaa: 'Aragón' })).toBe(true);
    expect(cubreTerritorio(conv({ ccaa: ['Aragón'] }), { provincia: 'Huesca', ccaa: 'Aragón' })).toBe(true);
    expect(cubreTerritorio(conv({ ambitoNacional: true }), { provincia: null, ccaa: null })).toBe(true);
  });
});
