import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { calcularSeries, esqueleto, parecido, preverProxima } from '../src/series.js';
import { detalle, registro } from './ayudas.js';

const conv = (codigo: string, titulo: string, fecha: string, organo = 'AYUNTAMIENTO DE TORRENT') =>
  desdeBdns(
    registro(
      detalle(codigo, {
        descripcion: titulo,
        fechaRecepcion: fecha,
        fechaInicioSolicitud: fecha,
        organo: { nivel1: 'LOCAL', nivel2: 'TORRENT', nivel3: organo },
      }),
    ),
  );

describe('esqueleto del título', () => {
  it('quita años, ediciones y fechas', () => {
    // Títulos reales: la misma convocatoria de Torrent en distintas ediciones.
    const a = esqueleto('PREMIOS DE INTERPRETACIÓN MUSICAL VICENT GALBIS (XXVI)');
    const b = esqueleto('Premios de Interpretación Musical Vicent Galbis (XXV) 2025');
    expect([...a]).toEqual(['premios', 'interpretacion', 'musical', 'vicent', 'galbis']);
    expect(parecido(a, b)).toBe(1);
    expect(parecido(esqueleto('Vigésimo tercer concurso de música festera'), esqueleto('Vigésimo segundo concurso de música festera'))).toBe(1);
  });
});

describe('calcularSeries', () => {
  const hoy = new Date('2026-10-09');
  const lista = [
    conv('1', 'PREMIOS DE INTERPRETACIÓN MUSICAL VICENT GALBIS (XXIV)', '2024-07-10'),
    conv('2', 'Premios de Interpretación Musical Vicent Galbis (XXV)', '2025-07-02'),
    conv('3', 'PREMIOS DE INTERPRETACIÓN MUSICAL VICENT GALBIS (XXVI)', '2026-07-09'),
    conv('4', 'Subvenciones a bandas de música 2026', '2026-03-01'),
    // Mismo título, otro organismo: no es la misma serie.
    conv('5', 'Premios de Interpretación Musical Vicent Galbis (XXV)', '2025-07-02', 'OTRO ORGANISMO'),
  ];
  const series = calcularSeries(lista, hoy);

  it('une la misma convocatoria de varios años del mismo organismo', () => {
    const s = series.get('bdns-3')!;
    expect(s.anios).toEqual([2024, 2025, 2026]);
    expect(s.convocatorias.map((c) => c.id)).toEqual(['bdns-1', 'bdns-2', 'bdns-3']);
    expect(series.get('bdns-1')).toBe(s);
    expect(s.mesHabitual).toBe(7);
    expect(s.proximaPrevista).toBe('2027-07');
  });

  it('sin repetición en otro año no hay serie', () => {
    expect(series.get('bdns-4')).toBeUndefined();
    expect(series.get('bdns-5')).toBeUndefined();
  });
});

describe('preverProxima', () => {
  const hoy = new Date('2026-10-09');
  it('si ya salió este año, el año que viene', () => {
    expect(preverProxima([2025, 2026], 3, hoy)).toEqual({ proximaPrevista: '2027-03', retrasada: false });
  });
  it('si aún no ha salido y su mes no ha llegado, este año', () => {
    expect(preverProxima([2024, 2025], 11, hoy)).toEqual({ proximaPrevista: '2026-11', retrasada: false });
  });
  it('si su mes ya pasó y no ha salido, retrasada', () => {
    expect(preverProxima([2024, 2025], 4, hoy)).toEqual({ proximaPrevista: '2026-04', retrasada: true });
  });
  it('series que dejaron de convocarse no tienen previsión', () => {
    expect(preverProxima([2019, 2020], 4, hoy)).toEqual({ proximaPrevista: null, retrasada: false });
  });
});
