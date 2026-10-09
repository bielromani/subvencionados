import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { emparejar, evaluar, plazo } from '../src/emparejamiento.js';
import type { Perfil } from '../src/tipos.js';
import { detalle, registro } from './ayudas.js';

const perfil: Perfil = {
  nombre: 'Promotora de prueba',
  formaJuridica: 'autonomo',
  ccaaSede: 'Cataluña',
  ccaaActuacion: ['Andalucía'],
  grupos: [{ nombre: 'Trío', estilo: 'jazz' }],
  actividades: ['festivales', 'giras'],
  incluirIndirectas: true,
};
const hoy = new Date('2026-10-08T10:00:00Z');

// Variantes del detalle real 934378 con títulos de música.
const cicloJazz = desdeBdns(
  registro(
    detalle('1', {
      descripcion: 'Subvenciones para ciclos de conciertos de jazz 2026',
      regiones: [{ descripcion: 'ES511 - Barcelona' }],
      fechaInicioSolicitud: '2026-10-01',
      fechaFinSolicitud: '2026-10-31',
    }),
  ),
);

describe('plazo', () => {
  it('abierta, cerrada, próxima', () => {
    expect(plazo(cicloJazz, hoy)).toBe('abierta');
    expect(plazo(cicloJazz, new Date('2026-11-01'))).toBe('cerrada');
    expect(plazo({ ...cicloJazz, fechaInicioSolicitud: '2026-11-01', fechaFinSolicitud: '2026-11-30' }, hoy)).toBe('proxima');
  });

  it('con fecha de fin pero pendiente de publicar en el boletín (caso real 934378)', () => {
    const c = desdeBdns(registro(detalle('1', {})));
    expect(plazo(c, hoy)).toBe('proxima');
  });

  it('sin fechas depende del indicador de la BDNS', () => {
    const sinFechas = { ...cicloJazz, fechaInicioSolicitud: null, fechaFinSolicitud: null };
    expect(plazo({ ...sinFechas, abierta: true }, hoy)).toBe('abierta');
    expect(plazo({ ...sinFechas, abierta: false }, hoy)).toBe('desconocido');
  });

  it('sin fecha de fin, una convocatoria antigua marcada como abierta no lo está (casos reales de 2017-2023)', () => {
    const antigua = { ...cicloJazz, fechaInicioSolicitud: '2020-07-13', fechaFinSolicitud: null, fechaPublicacion: '2020-07-09', abierta: true };
    expect(plazo(antigua, hoy)).toBe('desconocido');
    const sinNada = { ...antigua, fechaInicioSolicitud: null, fechaPublicacion: '2017-05-10' };
    expect(plazo(sinNada, hoy)).toBe('desconocido');
  });
});

describe('evaluar', () => {
  it('puntúa alto una ayuda de jazz abierta en su comunidad', () => {
    const m = evaluar(cicloJazz, perfil, hoy)!;
    expect(m.encaje).toBe('directo');
    expect(m.puntuacion).toBe(40 + 15 + 30 + 10 + 10);
    expect(m.motivos).toContain('Menciona expresamente jazz');
  });

  it('descarta comunidades donde no trabaja', () => {
    expect(evaluar({ ...cicloJazz, ccaa: ['Galicia'] }, perfil, hoy)).toBeNull();
  });

  it('ámbito no indicado: se muestra con aviso', () => {
    const m = evaluar({ ...cicloJazz, ccaa: [], ambitoNacional: false }, perfil, hoy)!;
    expect(m.avisos).toContain('La BDNS no indica el ámbito territorial: revisa las bases');
  });

  it('descarta estilos que no son los suyos', () => {
    expect(evaluar(cicloJazz, { ...perfil, grupos: [{ nombre: 'Coro', estilo: 'opera' }] }, hoy)).toBeNull();
  });

  it('descarta si su forma jurídica no puede pedirla', () => {
    // El detalle real solo admite "PYME Y PERSONAS FÍSICAS QUE DESARROLLAN ACTIVIDAD ECONÓMICA".
    expect(evaluar(cicloJazz, { ...perfil, formaJuridica: 'asociacion' }, hoy)).toBeNull();
  });

  it('las ayudas a ayuntamientos salen como indirectas solo si el perfil lo pide', () => {
    const local = {
      ...cicloJazz,
      clasificacion: { ...cicloJazz.clasificacion, beneficiarios: { empresas: false, sinAnimoLucro: false, entidadesLocales: true, personasFisicas: false } },
    };
    expect(evaluar(local, perfil, hoy)?.encaje).toBe('indirecto');
    expect(evaluar(local, { ...perfil, incluirIndirectas: false }, hoy)).toBeNull();
  });

  it('los premios para personas físicas son para sus músicos', () => {
    const premio = {
      ...cicloJazz,
      clasificacion: {
        ...cicloJazz.clasificacion,
        beneficiarios: { empresas: false, sinAnimoLucro: false, entidadesLocales: false, personasFisicas: true },
      },
    };
    expect(evaluar(premio, perfil, hoy)?.encaje).toBe('artistas');
  });

  it('las becas de formación solo si las busca', () => {
    const beca = { ...cicloJazz, clasificacion: { ...cicloJazz.clasificacion, lineas: ['formacion' as const] } };
    expect(evaluar(beca, perfil, hoy)).toBeNull();
    expect(evaluar(beca, { ...perfil, actividades: ['formacion'] }, hoy)).not.toBeNull();
  });

  it('las concesiones directas son precedentes, sea cual sea el beneficiario', () => {
    const m = evaluar({ ...cicloJazz, tipo: 'directa' }, perfil, hoy)!;
    expect(m.encaje).toBe('precedente');
    expect(m.motivos).not.toContain('Plazo abierto');
    // Nominativa a una asociación: también sirve de precedente a un autónomo.
    const aAsociacion = {
      ...cicloJazz,
      tipo: 'directa' as const,
      clasificacion: {
        ...cicloJazz.clasificacion,
        beneficiarios: { empresas: false, sinAnimoLucro: true, entidadesLocales: false, personasFisicas: false },
      },
    };
    expect(evaluar(aAsociacion, perfil, hoy)?.encaje).toBe('precedente');
  });
});

describe('emparejar', () => {
  it('ordena por puntuación y descarta lo que no es de música', () => {
    const naturajazz = desdeBdns(registro(detalle('2', {})));
    const cerrada = { ...cicloJazz, id: 'bdns-3', fechaFinSolicitud: '2026-01-31' };
    const ids = emparejar([cerrada, naturajazz, cicloJazz], perfil, hoy).map((m) => m.convocatoria.id);
    expect(ids).toEqual(['bdns-1', 'bdns-3']);
  });
});

describe('cultura general', () => {
  it('encaja con poca puntuación y aviso de revisar las bases', () => {
    const cultura = desdeBdns(
      registro(
        detalle('9', {
          descripcion: 'Convocatoria de subvenciones para apoyar actividades culturales 2026',
          regiones: [{ descripcion: 'ES511 - Barcelona' }],
          fechaInicioSolicitud: '2026-10-01',
          fechaFinSolicitud: '2026-10-31',
        }),
      ),
    );
    expect(cultura.clasificacion).toMatchObject({ musical: false, culturaGeneral: true });
    const m = evaluar(cultura, perfil, hoy)!;
    expect(m.encaje).toBe('directo');
    expect(m.avisos).toContain('Ayuda general de cultura: los conciertos pueden encajar, revisa las bases');
    expect(m.puntuacion).toBeLessThan(evaluar(cicloJazz, perfil, hoy)!.puntuacion);
  });
});
