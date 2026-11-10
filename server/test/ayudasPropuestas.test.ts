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
