import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { mercado } from '../src/mercado.js';
import { detalle, registro } from './ayudas.js';

const conv = (codigo: string, cambios: Parameters<typeof detalle>[1], concedido = 0) => {
  const c = desdeBdns(registro(detalle(codigo, cambios)));
  return { ...c, concesiones: concedido ? { numero: 1, importeTotal: concedido, ultimaFecha: null, entidades: [] } : null };
};

describe('mercado', () => {
  it('suma por año, comunidad y línea', () => {
    const m = mercado([
      conv('1', { descripcion: 'Ayudas a festivales de jazz', fechaRecepcion: '2024-03-01', presupuestoTotal: 1000 }, 800),
      conv('2', { descripcion: 'Ayudas a giras y festivales de música', fechaRecepcion: '2025-03-01', presupuestoTotal: 500 }, 400),
      conv('3', { descripcion: 'Ayudas a la ópera', fechaRecepcion: '2025-05-01', presupuestoTotal: 200 }),
    ]);
    expect(m.totales).toMatchObject({ convocatorias: 3, presupuesto: 1700, concedido: 1200 });
    expect(m.porAnio.map((a) => [a.anio, a.convocatorias, a.concedido])).toEqual([
      [2024, 1, 800],
      [2025, 2, 400],
    ]);
    expect(m.primerAnioConcesiones).toBe(2024);
    expect(m.porLinea.find((l) => l.linea === 'festivales')).toMatchObject({ convocatorias: 2, concedido: 1200 });
    expect(m.porComunidad.reduce((s, c) => s + c.convocatorias, 0)).toBe(3);
    expect(m.porProvincia.every((p) => /^\d{2}$/.test(p.codigo))).toBe(true);
  });
});
