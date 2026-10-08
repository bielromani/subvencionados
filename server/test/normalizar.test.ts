import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import type { BdnsConvocatoria } from '../src/bdns/tipos.js';
import fixture from './fixtures/bdns-convocatoria.json' with { type: 'json' };

describe('desdeBdns', () => {
  const c = desdeBdns(fixture as BdnsConvocatoria, new Date('2026-03-01T10:00:00Z'));

  it('mapea los campos principales', () => {
    expect(c).toMatchObject({
      id: 'bdns-999001',
      origen: 'bdns',
      codigoBdns: '999001',
      organo: 'AYUNTAMIENTO DE EJEMPLO',
      administracion: 'local',
      ccaa: ['Cataluña'],
      provincias: ['Barcelona'],
      presupuesto: 60000,
      fechaPublicacion: '2026-02-10',
      fechaFinSolicitud: '2026-03-15',
      abierta: true,
      urlDetalle: 'https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/999001',
    });
  });

  it('clasifica la convocatoria', () => {
    expect(c.clasificacion.estilosExplicitos).toEqual(['jazz', 'clasica']);
    expect(c.clasificacion.lineas).toContain('festivales');
    expect(c.clasificacion.encajePromotor).toBe('si');
  });

  it('tolera respuestas incompletas', () => {
    const minima = desdeBdns({ codigoBDNS: '1', organo: { nivel1: 'ANDALUCÍA' } });
    expect(minima.titulo).toBe('Convocatoria 1');
    expect(minima.administracion).toBe('autonomica');
    expect(minima.ccaa).toEqual([]);
    expect(minima.abierta).toBeNull();
  });

  it('rechaza convocatorias sin código', () => {
    expect(() => desdeBdns({})).toThrow();
  });
});
