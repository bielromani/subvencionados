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
