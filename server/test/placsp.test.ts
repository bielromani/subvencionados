import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { entradas, esDeMusica, esNifPersona, leerEntrada, siguiente } from '../src/contratos/placsp.js';

const atom = readFileSync(new URL('./fixtures/placsp-lugo.atom', import.meta.url), 'utf8');

describe('Plataforma de Contratación', () => {
  it('lee una licitación real con su adjudicación', () => {
    const [e] = entradas(atom);
    const c = leerEntrada(e!)!;
    expect(c).toMatchObject({
      id: '20585917',
      expediente: '2026/C005/000012',
      estado: 'RES',
      menor: false,
      importe: 16000,
      importeConIva: 19360,
      cpv: ['92312120'],
      tipoContrato: '8',
      organo: { nombre: 'Junta de Gobierno del Ayuntamiento de Lugo', dir3: 'L01270288', nif: 'P2702800J', ciudad: 'Lugo', jerarquia: ['Lugo', 'Ayuntamientos', 'Galicia'] },
    });
    expect(c.titulo).toContain('concerto do grupo BRATH');
    expect(c.enlace).toContain('detalle_licitacion&idEvl=');
    expect(c.adjudicaciones).toEqual([
      { adjudicatario: 'CAS D´OLEIRO 2.0 SL', nif: 'B27338821', personaFisica: false, importe: 16000, importeConIva: 19360, fecha: '2026-09-29', ofertas: 1, lote: null },
    ]);
    expect(siguiente(atom)).toContain('licitacionesPerfilesContratanteCompleto3_20260930_120000.atom');
  });

  it('no guarda el nombre ni el NIF de una persona física adjudicataria', () => {
    const conPersona = atom.replace('B27338821', '12345678Z');
    const c = leerEntrada(entradas(conPersona)[0]!)!;
    expect(c.adjudicaciones[0]).toMatchObject({ adjudicatario: null, nif: null, personaFisica: true });
    expect(esNifPersona('X1234567L')).toBe(true);
    const enmascaradaPersona = leerEntrada(entradas(atom.replace('B27338821', '****8604*').replace('CAS D´OLEIRO 2.0 SL', 'Nombre Apellido'))[0]!)!;
    expect(enmascaradaPersona.adjudicaciones[0]).toMatchObject({ adjudicatario: null, nif: null, personaFisica: true });
    const enmascaradaEmpresa = leerEntrada(entradas(atom.replace('B27338821', '****8604*'))[0]!)!;
    const extranjera = leerEntrada(entradas(atom.replace('B27338821', 'IT12345678901').replace('CAS D´OLEIRO 2.0 SL', 'Nome Cognome'))[0]!)!;
    expect(extranjera.adjudicaciones[0]).toMatchObject({ adjudicatario: null, personaFisica: true });
    expect(enmascaradaEmpresa.adjudicaciones[0]).toMatchObject({ adjudicatario: 'CAS D´OLEIRO 2.0 SL', nif: null, personaFisica: false });
    expect(esNifPersona('B27338821')).toBe(false);
  });

  it('música en vivo sí; escuelas, suministros y eventos sin música no', () => {
    expect(esDeMusica({ cpv: ['92312120'], titulo: 'Concierto del grupo BRATH' })).toBe(true);
    expect(esDeMusica({ cpv: ['79952000'], titulo: 'Actuaciones musicales de las fiestas patronales' })).toBe(true);
    expect(esDeMusica({ cpv: ['92312100'], titulo: 'Servicios de banda de música en procesiones' })).toBe(true);
    expect(esDeMusica({ cpv: ['92312100'], titulo: 'Representación teatral de títeres' })).toBe(false);
    expect(esDeMusica({ cpv: ['92312000'], titulo: 'Gestión de la escuela municipal de música' })).toBe(false);
    expect(esDeMusica({ cpv: ['79952000'], titulo: 'Organización de la feria del libro' })).toBe(false);
    expect(esDeMusica({ cpv: ['50241100'], titulo: 'Concierto de grúas' })).toBe(false);
    expect(esDeMusica({ cpv: ['92312000'], titulo: 'Servicio de actuación artística teatral con la representación de la obra' })).toBe(false);
    expect(esDeMusica({ cpv: ['92312000'], titulo: 'Programación de teatro, música y danza de la temporada' })).toBe(true);
    expect(esDeMusica({ cpv: ['79952000'], titulo: 'Actuaciones artísticas para las fiestas patronales' })).toBe(true);
  });
});

describe('almacén de contratos', () => {
  it('guarda la versión más reciente y conserva el año de la primera vez', async () => {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { AlmacenContratos } = await import('../src/contratos/almacen.js');
    const dir = mkdtempSync(join(tmpdir(), 'contratos-'));
    const c = leerEntrada(entradas(atom)[0]!)!;
    const a = new AlmacenContratos(dir);
    expect(a.guardar(c)).toBe(true);
    expect(a.guardar(c)).toBe(false);
    expect(a.guardar({ ...c, actualizado: '2027-01-05T10:00:00+01:00', estado: 'ANUL' })).toBe(true);
    a.escribir();
    const b = new AlmacenContratos(dir);
    expect(b.contratos.get('20585917')).toMatchObject({ estado: 'ANUL', anio: 2026 });
  });
});
