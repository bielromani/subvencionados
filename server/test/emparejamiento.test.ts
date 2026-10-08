import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { convocatoriasDemo } from '../src/data/demo.js';
import { emparejar, evaluar, plazo } from '../src/emparejamiento.js';
import type { Perfil } from '../src/tipos.js';
import fixture from './fixtures/bdns-convocatoria.json' with { type: 'json' };

const perfil: Perfil = {
  nombre: 'Promotora de prueba',
  formaJuridica: 'autonomo',
  ccaaSede: 'Cataluña',
  ccaaActuacion: ['Andalucía'],
  grupos: [{ nombre: 'Trío', estilo: 'jazz' }],
  actividades: ['festivales', 'giras'],
  incluirIndirectas: true,
};
const hoy = new Date('2026-03-01T10:00:00Z');
const bdns = desdeBdns(fixture, hoy);

describe('plazo', () => {
  it('las fechas mandan sobre el indicador de la BDNS', () => {
    expect(plazo(bdns, hoy)).toBe('abierta');
    expect(plazo(bdns, new Date('2026-04-01'))).toBe('cerrada');
    expect(plazo({ ...bdns, fechaFinSolicitud: null, abierta: null }, hoy)).toBe('desconocido');
  });
});

describe('evaluar', () => {
  it('puntúa alto una ayuda de jazz abierta en su comunidad', () => {
    const m = evaluar(bdns, perfil, hoy)!;
    expect(m.encaje).toBe('directo');
    expect(m.puntuacion).toBe(40 + 15 + 30 + 10 + 10);
    expect(m.motivos).toContain('Menciona expresamente jazz');
  });

  it('descarta comunidades donde no trabaja', () => {
    expect(evaluar({ ...bdns, ccaa: ['Galicia'] }, perfil, hoy)).toBeNull();
  });

  it('descarta estilos que no son los suyos', () => {
    expect(evaluar(bdns, { ...perfil, grupos: [{ nombre: 'Coro', estilo: 'opera' }] }, hoy)).toBeNull();
  });

  it('descarta si su forma jurídica no puede pedirla', () => {
    const soloEmpresas = {
      ...bdns,
      clasificacion: { ...bdns.clasificacion, beneficiarios: { empresas: true, sinAnimoLucro: false, entidadesLocales: false } },
    };
    expect(evaluar(soloEmpresas, { ...perfil, formaJuridica: 'asociacion' }, hoy)).toBeNull();
  });

  it('las ayudas a ayuntamientos salen como indirectas solo si el perfil lo pide', () => {
    const local = {
      ...bdns,
      clasificacion: { ...bdns.clasificacion, beneficiarios: { empresas: false, sinAnimoLucro: false, entidadesLocales: true } },
    };
    expect(evaluar(local, perfil, hoy)?.encaje).toBe('indirecto');
    expect(evaluar(local, { ...perfil, incluirIndirectas: false }, hoy)).toBeNull();
  });
});

describe('nominativas', () => {
  it('se muestran como precedente, no como algo que se pueda pedir', () => {
    const m = evaluar({ ...bdns, tipo: 'nominativa' }, perfil, hoy)!;
    expect(m.encaje).toBe('precedente');
    expect(m.motivos).not.toContain('Plazo abierto');
  });
});

describe('emparejar con los ejemplos', () => {
  it('ordena por puntuación y solo deja ayudas compatibles', () => {
    const ids = emparejar([...convocatoriasDemo(hoy), bdns], perfil, hoy).map((m) => m.convocatoria.id);
    expect(ids[0]).toBe('bdns-999001');
    expect(ids).toContain('demo-inaem-musica-lirica-2026');
    expect(ids).toContain('demo-andalucia-musica-en-vivo-2026');
    // Castellón y Ávila quedan fuera de las comunidades del perfil.
    expect(ids).not.toContain('demo-castellon-ciclos-conciertos-2026');
    expect(ids).not.toContain('demo-avila-festival-jazz-2026');
  });
});
