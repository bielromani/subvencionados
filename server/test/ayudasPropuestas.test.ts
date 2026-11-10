import { describe, expect, it } from 'vitest';
import { ayudaParaEntidadLocal } from '../src/crm/prospeccion.js';
import type { Espectaculo } from '../src/crm/tipos.js';
import type { Convocatoria } from '../src/tipos.js';

const ficha = (id: string, tipo: Espectaculo['tipo']): Espectaculo => ({
  id, nombre: id, tipo, formato: 'f', requisitos: 'r', precioMin: null, precioMax: null, disponibilidad: '', fechasCerradas: '', ambito: '', enlace: '',
  estadoInfo: 'vigente', revisado: '2026-11-01', textoCarta: 't',
});
const ayuda = (titulo: string, cl: Record<string, unknown>) =>
  ({ titulo, clasificacion: { musical: false, destino: 'programadores', estilosCompatibles: [], lineas: [], beneficiarios: { entidadesLocales: true }, ...cl } }) as unknown as Convocatoria;

describe('ayudas sugeridas en las propuestas', () => {
  const cat = [ficha('cuarteto', 'camara'), ficha('fidelio', 'opera')];
  it('acepta una ayuda para ayuntamientos con estilo compatible', () => {
    expect(ayudaParaEntidadLocal(ayuda('Programa de música en directo', { musical: true, estilosCompatibles: ['clasica'] }), cat)).toBe(true);
  });
  it('rechaza las ayudas que no pueden pedir los ayuntamientos', () => {
    expect(ayudaParaEntidadLocal(ayuda('Programa de música', { musical: true, estilosCompatibles: ['clasica'], beneficiarios: { entidadesLocales: false } }), cat)).toBe(false);
  });
  it('rechaza las de cultura popular cuando no piden nuestro estilo', () => {
    expect(ayudaParaEntidadLocal(ayuda('Subvenciones para actividades de cultura popular y tradicional', {}), cat)).toBe(false);
    expect(ayudaParaEntidadLocal(ayuda('Programación cultural de los municipios', {}), cat)).toBe(true);
  });
});

describe('reparto de propuestas', () => {
  it('ninguna comunidad se lleva más de una quinta parte si hay de otras', async () => {
    const { repartirPorComunidad } = await import('../src/crm/prospeccion.js');
    const xs = [
      ...Array.from({ length: 30 }, (_, i) => ({ puntos: 100 - i, ccaa: 'Cataluña' })),
      ...Array.from({ length: 10 }, (_, i) => ({ puntos: 10 - i, ccaa: 'Andalucía' })),
      ...Array.from({ length: 10 }, (_, i) => ({ puntos: 10 - i, ccaa: 'Galicia' })),
    ];
    const r = repartirPorComunidad(xs, 20);
    expect(r).toHaveLength(20);
    expect(r.filter((x) => x.ccaa === "Cataluña").length).toBe(8);
    expect(r.filter((x) => x.ccaa === "Galicia").length).toBe(6);
    // Sin otras comunidades, se completa con las mejores.
    expect(repartirPorComunidad(xs.slice(0, 30), 20)).toHaveLength(20);
  });
});
