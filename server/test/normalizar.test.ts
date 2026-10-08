import { describe, expect, it } from 'vitest';
import { anonimizarConcesion, beneficiarioPublico, desdeBdns, resumirConcesiones } from '../src/bdns/normalizar.js';
import { CONCESIONES_FIGUERES, DETALLE_NATURAJAZZ, detalle, registro } from './ayudas.js';

describe('desdeBdns con una respuesta real (934378)', () => {
  const c = desdeBdns(registro(DETALLE_NATURAJAZZ));

  it('mapea los campos principales', () => {
    expect(c).toMatchObject({
      id: 'bdns-934378',
      codigoBdns: '934378',
      tipo: 'concurrencia',
      tipoConvocatoria: 'Concurrencia competitiva - canónica',
      organo: 'ORGANISMO AUTÓNOMO DE MUSEOS Y CENTROS',
      organoNiveles: ['LOCAL', 'CABILDO INSULAR DE TENERIFE', 'ORGANISMO AUTÓNOMO DE MUSEOS Y CENTROS'],
      administracion: 'local',
      ambitoNacional: true, // "XXXX - TODO EL MUNDO"
      presupuesto: 12800,
      finalidad: 'Cultura',
      fechaPublicacion: '2026-10-08',
      fechaFinSolicitud: '2026-10-31',
      abierta: false,
      urlDetalle: 'https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/934378',
    });
    expect(c.textoInicio).toMatch(/^A partir del día siguiente/);
  });

  it('un concurso de fotografía de un festival de jazz no es de música', () => {
    expect(c.clasificacion.musical).toBe(false);
  });
});

describe('ámbito y tipo', () => {
  it('una comunidad autónoma sin regiones convoca para su territorio', () => {
    const c = desdeBdns(
      registro(detalle('1', { regiones: [], organo: { nivel1: 'AUTONOMICA', nivel2: 'COMUNIDAD VALENCIANA' } })),
    );
    expect(c.ccaa).toEqual(['Comunitat Valenciana']);
    expect(c.ambitoNacional).toBe(false);
  });

  it('un ayuntamiento sin regiones queda con ámbito no indicado', () => {
    const c = desdeBdns(registro(detalle('1', { regiones: [], organo: { nivel1: 'LOCAL', nivel2: 'FIGUERES' } })));
    expect(c.ccaa).toEqual([]);
    expect(c.ambitoNacional).toBe(false);
  });

  it('provincia concreta', () => {
    const c = desdeBdns(registro(detalle('1', { regiones: [{ descripcion: 'ES512 - Girona' }] })));
    expect(c).toMatchObject({ ambitoNacional: false, ccaa: ['Cataluña'], provincias: ['Girona'] });
  });

  it('concesión directa por tipoConvocatoria o, si falta, por el título', () => {
    expect(desdeBdns(registro(detalle('1', { tipoConvocatoria: 'Concesión directa - instrumental' }))).tipo).toBe('directa');
    expect(
      desdeBdns(registro(detalle('1', { tipoConvocatoria: null, descripcion: 'SUBVENCIÓN NOMINATIVA ORQUESTA 2026' }))).tipo,
    ).toBe('directa');
  });

  it('rechaza convocatorias sin código', () => {
    expect(() => desdeBdns(registro({}))).toThrow();
  });
});

describe('concesiones', () => {
  it('resume la concesión real del Festival de Jazz de Figueres', () => {
    expect(resumirConcesiones(CONCESIONES_FIGUERES)).toEqual({
      numero: 1,
      importeTotal: 28000,
      ultimaFecha: '2026-03-18',
      entidades: [{ nombre: 'CASINO MENESTRAL FIGUERENC', importe: 28000, fecha: '2026-03-18' }],
    });
  });

  it('las personas físicas no se guardan con nombre', () => {
    expect(beneficiarioPublico('G17057910 CASINO MENESTRAL FIGUERENC')).toBe('CASINO MENESTRAL FIGUERENC');
    expect(beneficiarioPublico('***1234** NOMBRE APELLIDO')).toBeNull();
    expect(beneficiarioPublico('12345678Z NOMBRE APELLIDO')).toBeNull();
    const anonima = anonimizarConcesion({ beneficiario: '***1234** NOMBRE APELLIDO', idPersona: 1, importe: 100 });
    expect(anonima).toEqual({ beneficiario: 'PERSONA FÍSICA', importe: 100 });
    expect(anonimizarConcesion(CONCESIONES_FIGUERES[0]!).beneficiario).toBe('G17057910 CASINO MENESTRAL FIGUERENC');
  });
});
