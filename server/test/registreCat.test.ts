import { describe, expect, it } from 'vitest';
import { claveExpediente, consultaRegistre, contratoDeRegistre } from '../src/contratos/registreCat.js';
import { enriquecer } from '../src/contratos/vista.js';

const fila = {
  situaci_contractual: 'menor',
  subjecte_ambit: "Entitats de l'Administració Local",
  id_organisme_contractant: '4303790004',
  organisme_contractant: 'Ajuntament de Calafell',
  codi_expedient: '10910/2026',
  procediment_adjudicacio: 'Menor',
  descripcio_expedient: 'Actuació de "Son de l\'Havana"',
  numero_lot: '1',
  codi_cpv: '92312130-1',
  adjudicatari: 'ASSOCIACIO CULT.DOS',
  import_adjudicacio: '1650',
  data_adjudicacio: '2026-09-30T00:00:00.000',
};

describe('Registre públic de contractes de Catalunya', () => {
  it('convierte un contrato menor de música en el formato común', () => {
    const c = contratoDeRegistre(fila)!;
    expect(c).toMatchObject({ menor: true, actualizado: '2026-09-30', cpv: ['92312130'], expediente: '10910/2026' });
    expect(c.id).toMatch(/^rpc-4303790004-10910-2026-1$/);
    expect(c.adjudicaciones[0]).toMatchObject({ adjudicatario: 'ASSOCIACIO CULT.DOS', importe: 1650, personaFisica: false });
    const v = enriquecer(c);
    expect(v.provincia).toBe('Tarragona');
    expect(v.ccaa).toBe('Cataluña');
  });

  it('no guarda el nombre de quien no parece una entidad', () => {
    const c = contratoDeRegistre({ ...fila, adjudicatari: 'Maria Puig Soler' })!;
    expect(c.adjudicaciones[0]).toMatchObject({ adjudicatario: null, personaFisica: true });
  });

  it('descarta lo que no es música y acepta sin CPV si el título es claro', () => {
    expect(contratoDeRegistre({ ...fila, codi_cpv: '45233222-1', descripcio_expedient: 'Reasfaltat del carrer Muralla' })).toBeNull();
    expect(contratoDeRegistre({ ...fila, codi_cpv: undefined, descripcio_expedient: 'Focs artificials cavalcata' })).toBeNull();
    expect(contratoDeRegistre({ ...fila, codi_cpv: undefined, descripcio_expedient: 'Concert de la cobla a la festa major' })).not.toBeNull();
    expect(contratoDeRegistre({ ...fila, descripcio_expedient: 'Xaranga per amenitzar la cursa' })).not.toBeNull();
  });

  it('la clave de expediente casa órgano y expediente', () => {
    const c = contratoDeRegistre(fila)!;
    expect(claveExpediente(c)).toBe(claveExpediente({ organo: { ...c.organo, nombre: 'AJUNTAMENT DE CALAFELL' }, expediente: '10910/2026' }));
  });

  it('la consulta solo pide adjudicaciones y menores, y desde una fecha', () => {
    const q = consultaRegistre('2026-09-01');
    expect(q).toContain("situaci_contractual in('menor','adjudicació')");
    expect(q).toContain("data_adjudicacio >= '2026-09-01'");
  });
});
