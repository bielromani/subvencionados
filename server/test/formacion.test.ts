import { describe, expect, it } from 'vitest';
import { formacionesDe } from '../src/contratos/formacion.js';
import { encajeEntidad } from '../src/crm/encaje.js';
import type { Espectaculo } from '../src/crm/tipos.js';
import type { Programador } from '../src/directorio.js';

const ficha = (id: string, tipo: Espectaculo['tipo'], precioMin: number | null = null): Espectaculo => ({
  id, nombre: id, tipo, formato: 'f', requisitos: 'r', precioMin, precioMax: null, disponibilidad: '', fechasCerradas: '', ambito: '', enlace: '',
  estadoInfo: 'vigente', revisado: '2026-11-01', textoCarta: 't',
});

describe('formación de los conciertos', () => {
  it('distingue cámara, coral, sinfónico, sacra, ópera, jazz y banda', () => {
    expect(formacionesDe('Concierto del Cuarteto Casals')).toEqual(['camara']);
    expect(formacionesDe('Concert de la Coral Sant Jordi')).toEqual(['coral']);
    expect(formacionesDe('Concierto de la Orquesta Sinfónica de Castilla y León')).toEqual(['sinfonica']);
    expect(formacionesDe('Réquiem de Mozart')).toEqual(['religiosa']);
    expect(formacionesDe('Gala de zarzuela')).toEqual(['opera']);
    expect(formacionesDe('Festival de jazz')).toEqual(['jazz']);
    expect(formacionesDe('Concierto de la Banda Sinfónica Municipal')).toEqual(['banda']);
    expect(formacionesDe('Actuación del grupo Morena')).toEqual([]);
  });

  it('a quien solo programa cuartetos no le cuenta como sinfónico-coral, y el precio se compara con lo que paga por cámara', () => {
    const p = {
      id: 'p-1', estilos: { clasica: 10 }, formaciones: { camara: 10 }, meses: [], contratos: 10,
      rango: { min: 10000, max: 30000, deEstilo: true }, rangos: { camara: { min: 1500, max: 3000, contratos: 10 } },
    } as unknown as Programador;
    const r = encajeEntidad([ficha('cuarteto', 'camara', 2500), ficha('brahms', 'sinfonico_coral', 20000)], p).propuestas;
    const cuarteto = r.find((x) => x.espectaculo.id === 'cuarteto')!;
    expect(cuarteto.motivos).toContain('Ha contratado 10 conciertos de cámara y recital');
    expect(cuarteto.motivos.some((m) => m.includes('por cámara y recital'))).toBe(true);
    expect(r.find((x) => x.espectaculo.id === 'brahms')!.motivos.some((m) => m.startsWith('Ha contratado'))).toBe(false);
  });
});
