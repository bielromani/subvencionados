import { describe, expect, it } from 'vitest';
import { Contactos } from '../src/contactos.js';
import { indiceSubvenciones, paraProgramar, provinciaDeNif } from '../src/subvencionesMunicipio.js';
import type { Convocatoria } from '../src/tipos.js';

const fila = (codigo: string, municipio: string, provincia: string) => ({ 'Código INE': codigo, Municipio: municipio, Provincia: provincia, 'Comunidad autónoma': 'Cataluña', Población: '7000' });
const contactos = new Contactos([fila('43086', 'Montblanc', 'Tarragona'), fila('43161', 'Valls', 'Tarragona')], []);

const conv = (over: Partial<Convocatoria> & { entidades: { nombre: string; importe: number; fecha: string; nif?: string }[] }, clas: Partial<Convocatoria['clasificacion']> = {}): Convocatoria =>
  ({
    id: `bdns-${Math.random()}`,
    titulo: 'Convocatoria de actividades culturales',
    organo: 'DIPUTACIÓN PROVINCIAL DE TARRAGONA',
    organoNiveles: ['LOCAL', 'TARRAGONA', 'DIPUTACIÓN PROVINCIAL DE TARRAGONA'],
    ubicacion: { provincia: 'Tarragona', codigoProvincia: '43', ccaa: 'Cataluña', municipio: null, codigoMunicipio: null },
    clasificacion: { musical: true, culturaGeneral: false, descarte: null, ...clas },
    ...over,
    concesiones: { numero: over.entidades.length, importeTotal: 0, ultimaFecha: null, entidades: over.entidades },
  }) as unknown as Convocatoria;

import { puedeContratar } from '../src/subvencionesMunicipio.js';

describe('Quién puede contratar un concierto', () => {
  it.each(['FUNDACIO CIUTAT DE VALLS', 'ASSOCIACIO AMICS DE LA MÚSICA', 'CASINO MENESTRAL FIGUERENC', 'COMISSIO DE FESTES DE SALO', 'JOVENTUTS MUSICALS DE MOIA', 'ASSOCIACIO JAZZ GRANOLLERS', 'SOCIEDAD FILARMONICA DE BADAJOZ', 'ENTITAT MUNICIPAL DESCENTRALITZADA JESUS'])('sí: %s', (n) => expect(puedeContratar(n)).toBe(true));
  it.each(['ASSOCIACIÓ CULTURAL PASTORETS DE MONTBLANC', 'COLLA JOVES XIQUETS DE VALLS', 'COLLA DE GRALLERS DE MONTBLANC', 'ASSOCIACIO CULTURAL EL BOU DE VALLS', 'PEÑA TAURINA TOMELLOSO', 'ASOCIACION EL GARAJE TEATRO', 'CORAL TERPSÍCORE', 'SOCIEDAD MUSICAL BANDA DE PICASSENT'])('no: %s', (n) => expect(puedeContratar(n)).toBe(false));
});

describe('Subvenciones que reciben los municipios', () => {
  it('provincia del NIF de la administración local (no la de las EMD)', () => {
    expect(provinciaDeNif('P4308700F')).toBe('43');
    expect(provinciaDeNif('P9359001F')).toBeNull();
  });

  it('reparte entre el ayuntamiento, las entidades del pueblo y las pedanías', () => {
    const i = indiceSubvenciones(
      [
        conv({ entidades: [{ nombre: 'AJUNTAMENT DE VALLS', importe: 5000, fecha: '2025-05-01', nif: 'P4316100A' }] }),
        conv({ entidades: [{ nombre: 'COMISSIO DE FESTES DE MONTBLANC', importe: 2000, fecha: '2025-11-11', nif: 'G55752125' }] }, { musical: false, descarte: 'Asociaciones, entidades o barrios del municipio' }),
        conv({ entidades: [{ nombre: 'ENTITAT MUNICIPAL DESCENTRALITZADA JESUS', importe: 1000, fecha: '2025-01-01', nif: 'P9359001F' }] }),
        // Escuelas de música: no es dinero para programar.
        conv({ entidades: [{ nombre: 'AJUNTAMENT DE MONTBLANC', importe: 9000, fecha: '2025-01-01', nif: 'P4308700F' }] }, { descarte: 'Formación, becas o estudios' }),
      ],
      contactos,
    );
    expect(i.porMunicipio.get('43161')?.ayuntamiento).toMatchObject({ importe: 5000, numero: 1 });
    expect(i.porMunicipio.get('43086')?.ayuntamiento.numero ?? 0).toBe(0);
    expect(i.porMunicipio.get('43086')?.entidades.map((e) => e.nombre)).toEqual(['COMISSIO DE FESTES DE MONTBLANC']);
    expect(i.pedanias).toMatchObject([{ nombre: 'ENTITAT MUNICIPAL DESCENTRALITZADA JESUS', codigoProvincia: '43', importe: 1000 }]);
  });

  it('el municipio de la pedanía sale del registro oficial', () => {
    const i = indiceSubvenciones(
      [conv({ entidades: [{ nombre: 'ENTITAT MUNICIPAL DESCENTRALITZADA JESUS', importe: 1000, fecha: '2025-01-01', nif: 'P9359001F' }] })],
      new Contactos([fila('43155', 'Tortosa', 'Tarragona')], []),
      [{ nombre: 'Entitat Municipal Descentralitzada de Jesús', codigoIne: '43155', fuente: 'Generalitat de Catalunya' }],
    );
    expect(i.pedanias[0]?.municipio?.municipio).toBe('Tortosa');
    expect(i.porMunicipio.get('43155')?.entidades.map((e) => e.nombre)).toEqual(['ENTITAT MUNICIPAL DESCENTRALITZADA JESUS']);
  });

  it('una asociación con «ELA» en el nombre no es una pedanía', () => {
    const i = indiceSubvenciones([conv({ entidades: [{ nombre: 'ASOC DALECANDELA A LA ELA', importe: 100, fecha: '2025-01-01' }] })], contactos);
    expect(i.pedanias).toEqual([]);
  });

  it('qué ayudas cuentan', () => {
    expect(paraProgramar(conv({ entidades: [] }, { culturaGeneral: true, musical: false, descarte: 'No es de música' }))).toBe(true);
    expect(paraProgramar(conv({ entidades: [] }, { descarte: 'No financia giras, producción ni programación' }))).toBe(false);
  });
});
