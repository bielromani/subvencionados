import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { codigosProvinciaDe, Referencias } from '../src/referencias.js';
import { detalle, registro } from './ayudas.js';

// Nombres con el formato real del catálogo de la BDNS y del INE. Los códigos de municipio
// son de prueba (solo importa el prefijo de provincia).
const referencias = new Referencias(
  [
    { provincia: 'GIRONA', entidad: 'FIGUERES', organos: ['AYUNTAMIENTO DE FIGUERES'] },
    { provincia: 'GIRONA', entidad: 'OLOT', organos: ['AYUNTAMIENTO DE OLOT'] },
    { provincia: 'LAS PALMAS', entidad: 'PALMAS DE GRAN CANARIA, LAS', organos: ['AYUNTAMIENTO DE LAS PALMAS DE GRAN CANARIA'] },
    { provincia: 'LAS PALMAS', entidad: 'CABILDO INSULAR DE GRAN CANARIA', organos: ['CABILDO INSULAR DE GRAN CANARIA'] },
    { provincia: 'LAS PALMAS', entidad: 'ARUCAS', organos: [] },
    { provincia: 'CASTELLÓN', entidad: 'CASTELLÓN DE LA PLANA/CASTELLÓ DE LA PLANA', organos: [] },
    { provincia: 'CASTELLÓN', entidad: 'VINARÒS', organos: [] },
    { provincia: 'ÁVILA', entidad: 'MIJARES', organos: [] },
    { provincia: 'CASTELLÓN', entidad: 'MIJARES', organos: [] },
  ],
  [
    { codigo: '17901', nombre: 'Figueres' },
    { codigo: '17902', nombre: 'Olot' },
    { codigo: '35901', nombre: 'Palmas de Gran Canaria, Las' },
    { codigo: '35902', nombre: 'Arucas' },
    { codigo: '12901', nombre: 'Castelló de la Plana' },
    { codigo: '12902', nombre: 'Vinaròs' },
    { codigo: '05901', nombre: 'Mijares' },
    { codigo: '12903', nombre: 'Mijares' },
  ],
);

describe('Referencias', () => {
  it('ubica un municipio', () => {
    expect(referencias.ubicarEntidadLocal('FIGUERES')).toEqual({
      provincia: 'Girona',
      codigoProvincia: '17',
      ccaa: 'Cataluña',
      municipio: 'Figueres',
      codigoMunicipio: '17901',
    });
  });

  it('entiende el artículo pospuesto y los nombres bilingües', () => {
    expect(referencias.ubicarEntidadLocal('PALMAS DE GRAN CANARIA, LAS')?.codigoMunicipio).toBe('35901');
    expect(referencias.ubicarEntidadLocal('CASTELLÓN DE LA PLANA/CASTELLÓ DE LA PLANA')?.codigoMunicipio).toBe('12901');
  });

  it('una diputación o cabildo se ubica en su provincia, sin municipio', () => {
    expect(referencias.ubicarEntidadLocal('CABILDO INSULAR DE GRAN CANARIA')).toMatchObject({
      provincia: 'Las Palmas',
      ccaa: 'Canarias',
      municipio: null,
    });
  });

  it('nombres repetidos en dos provincias: decide la región de la convocatoria', () => {
    expect(referencias.ubicarEntidadLocal('MIJARES')).toBeNull();
    expect(referencias.ubicarEntidadLocal('MIJARES', ['05'])?.provincia).toBe('Ávila');
  });

  it('códigos de provincia desde nombres NUTS3, incluidas islas', () => {
    expect(codigosProvinciaDe(['Girona', 'Gran Canaria', 'Valencia/València', 'Mallorca'])).toEqual(['17', '35', '46', '07']);
  });
});

describe('desdeBdns con referencias', () => {
  it('deduce el ámbito de un ayuntamiento sin regiones', () => {
    const c = desdeBdns(
      registro(detalle('1', { regiones: [], organo: { nivel1: 'LOCAL', nivel2: 'FIGUERES', nivel3: 'AYUNTAMIENTO DE FIGUERES' } })),
      referencias,
    );
    expect(c).toMatchObject({ ccaa: ['Cataluña'], provincias: ['Girona'], ambitoDeducido: true, ambitoNacional: false });
    expect(c.ubicacion?.municipio).toBe('Figueres');
  });

  it('con regiones, el ámbito es el de la BDNS y la ubicación se añade aparte', () => {
    const c = desdeBdns(
      registro(detalle('1', { regiones: [{ descripcion: 'ES512 - Girona' }], organo: { nivel1: 'LOCAL', nivel2: 'OLOT' } })),
      referencias,
    );
    expect(c).toMatchObject({ ccaa: ['Cataluña'], provincias: ['Girona'], ambitoDeducido: false });
    expect(c.ubicacion?.codigoMunicipio).toBe('17902');
  });
});
