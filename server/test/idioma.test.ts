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

describe('saludo de correos ya redactados', () => {
  it('deja solo el nombre de pila', async () => {
    const { acortarSaludo } = await import('../src/crm/cartas.js');
    expect(acortarSaludo('Hola, Nuria Escamilla Belizón:\n\nTexto')).toBe('Hola, Nuria:\n\nTexto');
    expect(acortarSaludo('Estimado/a Juan Ignacio Trelis Sempere:\n\nX')).toBe('Estimado/a Juan Ignacio:\n\nX');
    expect(acortarSaludo('Benvolgut/da Joaquim Pons i Casadesús,\n\nX')).toBe('Benvolgut/da Joaquim,\n\nX');
    expect(acortarSaludo('Hola, Nuria:\n\nX')).toBe('Hola, Nuria:\n\nX');
    expect(acortarSaludo('Hola:\n\nNuria Escamilla Belizón: x')).toBe('Hola:\n\nNuria Escamilla Belizón: x');
  });
});

describe('carta combinada', () => {
  it('un bloque por línea cuando el sitio programa varios estilos; una sola línea si no', async () => {
    const { componerCarta, lineasCarta } = await import('../src/crm/cartas.js');
    const { PLANTILLAS_ARSVIA } = await import('../src/crm/cartasArsvia.js');
    const a = { remitente: 'Joan', organizacion: 'ArsVia', email: '', telefono: '', web: '', firma: '', diasEntreEnvios: 10, plantillas: PLANTILLAS_ARSVIA } as never;
    const esp = [
      { id: '1', nombre: 'Dúo', tipo: 'camara', enlace: '' },
      { id: '2', nombre: 'Flauta', tipo: 'opera', enlace: '' },
    ] as never[];
    expect(lineasCarta(esp, ['opera', 'clasica'])).toEqual(['opera', 'camara']);
    const c = componerCarta({ idioma: 'es', lugar: 'Sant Cugat', persona: null, historial: ['clasica', 'opera'], espectaculos: esp, licitaciones: [], ayudas: [], gestion: false, ajustes: a });
    expect(c.cuerpo).toContain('## Música de cámara');
    expect(c.cuerpo).toContain('## Ópera escenificada');
    expect(c.cuerpo.indexOf('## Música de cámara')).toBeLessThan(c.cuerpo.indexOf('## Ópera'));
    expect(c.cuerpo.match(/Soy Joan/g)).toHaveLength(1);
    expect(c.cuerpo).toContain('dossieres adjuntos');
    expect(lineasCarta([esp[0]!])).toEqual(['camara']);
    expect(lineasCarta([...esp, { tipo: 'navidad' }] as never[])).not.toContain('navidad');
  });
});

describe('invitaciones juntas', () => {
  it('un titular común, una viñeta por invitación y sin repetir la misma función', async () => {
    const { juntarInvitaciones } = await import('../src/crm/cartas.js');
    const opera = 'TE INVITO A VERNOS EN ESCENA. Presentamos La flauta mágica en el Palau de la Música Catalana los días 7 de diciembre y 15 de enero.';
    const sinf = 'TE INVITO A VERNOS EN ESCENA. Si te interesa, presentamos La flauta mágica en el Palau de la Música Catalana los días 7 de diciembre y 15 de enero.';
    const camara = 'TE INVITO A CONOCERNOS el 18 de enero en Terrassa.\n\nEl Romanticismo apasionado · Brahms.';
    expect(juntarInvitaciones([opera], 'es')).toBe(opera);
    expect(juntarInvitaciones([opera, sinf, camara], 'es')).toBe(
      'TE INVITO A VERNOS EN ESCENA.\n• Presentamos La flauta mágica en el Palau de la Música Catalana los días 7 de diciembre y 15 de enero.\n• Te invito a conocernos el 18 de enero en Terrassa.\nEl Romanticismo apasionado · Brahms.',
    );
    expect(juntarInvitaciones([], 'es')).toBeNull();
  });
});

describe('saludo con el cargo', () => {
  it('«A la atención de Antonio, concejal de Cultura:» y en catalán con apóstrofo', async () => {
    const { cargoSaludo, componerSeguimiento } = await import('../src/crm/cartas.js');
    const { PLANTILLAS_ARSVIA } = await import('../src/crm/cartasArsvia.js');
    expect(cargoSaludo('Regidora', 'ca')).toBe('regidora de Cultura');
    expect(cargoSaludo("1a Tinent d'Alcalde", 'ca')).toBe('regidora de Cultura');
    expect(cargoSaludo("2n Tinent d'Alcalde", 'es')).toBe('concejal de Cultura');
    expect(cargoSaludo('Técnica de cultura', 'es')).toBe('técnica de Cultura');
    expect(cargoSaludo('Concejal: Cultura', 'es')).toBe('concejal de Cultura');
    expect(cargoSaludo('Alcaldessa Presidenta', 'ca')).toBe('alcaldessa');
    expect(cargoSaludo(null, 'es')).toBe('');
    const a = { remitente: '', organizacion: '', email: '', telefono: '', web: '', firma: 'J', diasEntreEnvios: 10, plantillas: PLANTILLAS_ARSVIA } as never;
    const s = (idioma: 'es' | 'ca', persona: string, cargo: string | null) => componerSeguimiento(2, { idioma, lugar: 'X', persona, cargo, ajustes: a }, 'A').cuerpo.split('\n\n').slice(0, persona.includes(' ') ? 2 : 1).join('\n\n');
    expect(s('es', 'Antonio Pérez García', 'Concejal delegado')).toBe('A la atención de Antonio Pérez, concejal de Cultura:\n\nBuenos días, Antonio:');
    expect(s('ca', 'Antoni Puig', 'Regidor')).toBe('A l’atenció d’Antoni Puig, regidor de Cultura:\n\nBon dia, Antoni:');
    expect(s('ca', 'Montserrat Alba', null)).toBe('A l’atenció de Montserrat Alba:\n\nBon dia, Montserrat:');
    // Sin apellido, solo «Buenos días, Marta:».
    expect(s('es', 'Marta', 'Regidora')).toBe('Buenos días, Marta:');
  });
});

describe('nombre y primer apellido', () => {
  it('para «A la atención de…»', async () => {
    const { nombreYApellido } = await import('../src/crm/cartas.js');
    expect(nombreYApellido('Nuria Escamilla Belizón')).toBe('Nuria Escamilla');
    expect(nombreYApellido('María del Mar López García')).toBe('María del Mar López');
    expect(nombreYApellido('Francisco Javier Toquero del Vado')).toBe('Francisco Javier Toquero');
    expect(nombreYApellido('López García, Ana')).toBe('Ana López');
    expect(nombreYApellido('Marta Rovira Martínez (erc)')).toBe('Marta Rovira');
    expect(nombreYApellido('Marta')).toBe('Marta');
  });
});
