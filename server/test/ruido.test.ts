import { describe, expect, it } from 'vitest';
import { esRuidoParaPromotor, limpiarTitulo, repararTexto } from '../src/contratos/ruido.js';

describe('ruido para un promotor', () => {
  it('quita cultura popular, música de fiesta y servicios técnicos', () => {
    for (const t of [
      'Acompanyament grup de grallers Blu\'s als gegants de Valls, corpus 2026',
      'Actuacions Ball de Pastorets infantils (2 grups) i els adults Festa Major',
      'Actuació Dj Skandal dia 22 de Juny',
      'Charanga para pasacalles Heraldo Real',
      'Serveis sanitaris amb ambulàncies al recinte dels concerts',
      'Alquiler de equipamiento de sonido y servicio de técnico audiovisual para el concierto',
      'Ballada de sardanes',
    ])
      expect(esRuidoParaPromotor(t), t).toBe(true);
  });
  it('deja los conciertos', () => {
    for (const t of [
      'Concert de Manu Guix en format acústic al Teatre Principal de Valls',
      'Assajos i 2 concerts de l\'Orquestra de Girona amb el Cor de la UdG',
      'Concierto en el Castillo de Peralada',
      'Espectáculo Palabra y sonido',
      'Actuació Dixie Street Band',
    ])
      expect(esRuidoParaPromotor(t), t).toBe(false);
  });
  it('repara el texto mal codificado y quita el nombre de quien factura', () => {
    expect(repararTexto('ASSOCIACIÃ¿ CULTURAL LESPARDENYA')).toBe('ASSOCIACIÓ CULTURAL LESPARDENYA');
    expect(repararTexto('ContractaciÃ³ de mÃºsica')).toBe('Contractació de música');
    expect(limpiarTitulo('NOM COGNOM COGNOM, IMPORT FRA.32, GRUP DE MÚSICA FIRA DE VINS 2024')).toBe('GRUP DE MÚSICA FIRA DE VINS 2024');
  });
});
