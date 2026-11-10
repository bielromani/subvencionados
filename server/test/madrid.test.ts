import { describe, expect, it } from 'vitest';
import { contratoDeMadrid, decodificarCsv, esMusicaMadrid, filasMadrid } from '../src/contratos/madrid.js';
import { enriquecer } from '../src/contratos/vista.js';

const nuevo = `CONTRATOS MENORES A 31 DE DICIEMBRE DE 2023;;;;
N. DE REGISTRO DE CONTRATO;N. DE EXPEDIENTE;CENTRO - SECCION;ORGANO DE CONTRATACION;OBJETO DEL CONTRATO;TIPO DE CONTRATO;NIF ADJUDICATARIO;RAZON SOCIAL ADJUDICATARIO;IMPORTE ADJUDICACION IVA INC.;FECHA DE ADJUDICACION
2023014791;PR23-0200.12;Madrid Destino, Cultura, Turismo y Negocio, S.A.;DIRECTOR/A DE PRODUCCIÓN;"CONTRATO MENOR DEL SERVICIO DE ACTUACION ARTISTICA UNICA DE UN CONCIERTO DE MUSICA FADO
EL 28 DE DICIEMBRE DE 2023";Servicios;PT515182265;FACTOS E ADICOES, LDA.;14.356,65 ;20/12/2023
2023014490;105/2023/02969;DISTRITO DE CHAMARTÍN;COORDINADOR;Suministro de carteles;Suministros;50586893A;JOSÉ NICOLÁS FERRANDO SANDOVAL;1.392,11 ;28/12/2023
2023014492;105/2023/02970;DISTRITO DE CHAMARTÍN;COORDINADOR;Actuación musical en las fiestas del distrito;Servicios;50586893A;JOSÉ NICOLÁS FERRANDO SANDOVAL;900,00 ;28/12/2023`;

const viejo = `NºRECON;NUMERO EXPEDIENTE;SECCION ;ORG.CONTRATACION;OBJETO DEL CONTRATO;TIPO DE CONTRATO;N.I.F;CONTRATISTA;IMPORTE;FECHA APROBACION;PLAZO
R1;300/2019/1;DISTRITO DE RETIRO;CONCEJAL;Concierto de jazz en el parque;Servicios;B12345678;JAZZ PRODUCCIONES SL;3.000,00;05/06/2019;1`;

describe('Contratos menores del Ayuntamiento de Madrid', () => {
  it('lee el formato actual (con título delante y saltos de línea en el objeto)', () => {
    const cs = filasMadrid(nuevo).map(contratoDeMadrid);
    expect(cs).toHaveLength(3);
    const fado = cs[0]!;
    expect(fado).toMatchObject({ menor: true, actualizado: '2023-12-20', organo: { nombre: 'Ayuntamiento de Madrid (Madrid Destino, Cultura, Turismo y Negocio, S.A.)', ciudad: 'Madrid' } });
    expect(fado.adjudicaciones[0]).toMatchObject({ adjudicatario: 'FACTOS E ADICOES, LDA.', importeConIva: 14356.65, importe: null });
    expect(esMusicaMadrid(fado)).toBe(true);
    expect(esMusicaMadrid(cs[1]!)).toBe(false);
    // Persona física: ni nombre ni NIF.
    expect(cs[2]!.adjudicaciones[0]).toMatchObject({ adjudicatario: null, nif: null, personaFisica: true });
    expect(enriquecer(fado)).toMatchObject({ provincia: 'Madrid', ccaa: 'Comunidad de Madrid' });
  });
  it('lee el formato de 2018-2020', () => {
    const [c] = filasMadrid(viejo).map(contratoDeMadrid);
    expect(c).toMatchObject({ actualizado: '2019-06-05', expediente: '300/2019/1', organo: { nombre: 'Ayuntamiento de Madrid (DISTRITO DE RETIRO)' } });
    expect(c!.adjudicaciones[0]).toMatchObject({ adjudicatario: 'JAZZ PRODUCCIONES SL', importeConIva: 3000 });
  });
  it('fechas con el año en dos cifras e importes con €', () => {
    const t = `N. DE REGISTRO DE CONTRATO;N. DE EXPEDIENTE;CENTRO - SECCION;OBJETO DEL CONTRATO;NIF ADJUDICATARIO;RAZON SOCIAL ADJUDICATARIO;IMPORTE ADJUDICACION IVA INC.;FECHA DE ADJUDICACION
1;E1;DISTRITO CENTRO;Concierto de Navidad;B12345678;X PRODUCCIONES SL;16.335,00€;23/12/21`;
    expect(filasMadrid(t).map(contratoDeMadrid)[0]).toMatchObject({ actualizado: '2021-12-23', adjudicaciones: [{ importeConIva: 16335 }] });
  });
  it('fuera lo que no es un concierto', () => {
    expect(esMusicaMadrid({ titulo: 'GASTO MENOR DE SERVICIO DE TRANSPORTE DE INSTRUMENTOS PARA LOS CONCIERTOS' })).toBe(false);
    expect(esMusicaMadrid({ titulo: 'CONTRATO MENOR PARA LA CONTRATACIÓN DE COLABORACIONES EN LAS CATEGORÍAS DE OBOE PARA LA BANDA SINFÓNICA MUNICIPAL' })).toBe(false);
    expect(esMusicaMadrid({ titulo: 'CONTRATO PRIVADO ACTUACIÓN MUSICAL DE “The Cinelli Brothers” EN EL RECINTO FERIAL' })).toBe(true);
  });
  it('detecta Latin-1', () => {
    expect(decodificarCsv(new Uint8Array([0x4d, 0xfa, 0x73, 0x69, 0x63, 0x61]))).toBe('Música');
  });
});
