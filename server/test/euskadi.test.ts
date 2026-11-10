import { describe, expect, it } from 'vitest';
import { contratoDeEuskadi, idPoder } from '../src/contratos/euskadi.js';
import { esDeMusica } from '../src/contratos/placsp.js';
import { enriquecer } from '../src/contratos/vista.js';

const poder = { id: 597, identificationNumber: 'P0104400G', name: 'Ayuntamiento de Navaridas', address: 'Fabulista Samaniego s/n. 01309 Navaridas (Araba/Álava)', webPage: 'http://www.ayuntamientodenavaridas.com', codNUTS: 'ES211' };
const item = {
  id: '13-20261048_00001',
  object: 'Kontzertua jaietan: txaranga',
  contractProcedureType: { name: 'Directo/Contrato Menor' },
  CIF: 'XXXXX112F',
  socialReason: 'Fulano Mengano',
  awardDate: '2026-08-24',
  awardAmount: 1210,
  awardAmountWithoutVAT: 1000,
  CPV: '92312130-1',
  minorContract: true,
  mainEntityOfPage: 'https://www.contratacion.euskadi.eus/x',
  _links: { contractingAuthority: { href: 'https://api.euskadi.eus/procurements/contracting-authorities/597' } },
};

describe('Contratos de Euskadi', () => {
  it('convierte un menor, sin datos de la persona adjudicataria', () => {
    expect(idPoder(item)).toBe('597');
    const c = contratoDeEuskadi(item, poder, new Date('2026-11-10'))!;
    expect(c).toMatchObject({ menor: true, actualizado: '2026-08-24', cpv: ['92312130'], organo: { nombre: 'Ayuntamiento de Navaridas', nif: 'P0104400G', codigoPostal: '01309', ciudad: 'Navaridas' } });
    expect(c.adjudicaciones[0]).toMatchObject({ adjudicatario: null, nif: null, personaFisica: true, importe: 1000 });
    expect(esDeMusica(c)).toBe(true);
    expect(enriquecer(c)).toMatchObject({ provincia: 'Araba/Álava', ccaa: 'País Vasco' });
  });
  it('descarta fechas imposibles', () => {
    expect(contratoDeEuskadi({ ...item, awardDate: '2926-09-24' }, poder, new Date('2026-11-10'))).toBeNull();
  });
  it('reconoce títulos en euskera', () => {
    expect(esDeMusica({ titulo: 'Herriko jaietako kontzertuak', cpv: ['92000000'] })).toBe(true);
  });
});
