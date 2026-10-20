import { describe, expect, it } from 'vitest';
import { accion, estimarCierre } from '../src/accion.js';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { aICal, eventosDe } from '../src/calendario.js';
import { detalle, registro } from './ayudas.js';

const hoy = new Date('2026-10-20T10:00:00Z');
const conv = (codigo: string, cambios: Parameters<typeof detalle>[1]) => desdeBdns(registro(detalle(codigo, cambios)));

describe('qué hacer con una ayuda', () => {
  it('cierre aproximado desde el texto del plazo', () => {
    // Registrada el jueves 15 de octubre: 15 días hábiles (sin sábados ni domingos) desde el día siguiente.
    const c = conv('1', { descripcion: 'Ayudas a festivales de jazz', fechaRecepcion: '2026-10-15', textFin: 'Quince días hábiles', fechaInicioSolicitud: null, fechaFinSolicitud: null, textInicio: null, abierto: null });
    expect(estimarCierre(c)).toEqual({ fecha: '2026-11-05', base: 'registro' });
    expect(estimarCierre({ ...c, textoFin: 'Un mes desde el día siguiente a la publicación' })?.fecha).toBe('2026-11-15');
    expect(estimarCierre({ ...c, textoFin: '30 días naturales' })?.fecha).toBe('2026-11-14');
    expect(estimarCierre({ ...c, textoFin: '30/07/2027' })).toEqual({ fecha: '2027-07-30', base: 'literal' });
    expect(estimarCierre({ ...c, textoFin: 'Final' })).toBeNull();
    // Con extracto en boletín se cuenta desde su fecha.
    expect(estimarCierre({ ...c, anuncios: [{ titulo: '', diario: 'BOP', fecha: '2026-10-19', url: null, texto: '' }] })).toEqual({ fecha: '2026-11-09', base: 'boletin' });
  });

  it('plazo, pasos según a quién sirve y calendario de la convocatoria', () => {
    const c = conv('2', { descripcion: 'Ayudas a festivales de jazz', fechaRecepcion: '2026-10-15', textFin: 'Quince días hábiles', fechaInicioSolicitud: null, fechaFinSolicitud: null, textInicio: null, abierto: null });
    const a = accion(c, null, null, [], false, hoy);
    expect(a.plazo).toMatchObject({ estado: 'abierta', dias: 16, estimado: true, cierre: '2026-11-05' });
    expect(a.plazo.nota).toContain('aproximada');
    expect(a.pasos.length).toBeGreaterThan(0);
    const ics = aICal(eventosDe(c, hoy), 'http://localhost', hoy);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261105');
    expect(ics).toContain('SUMMARY:Cierra (aprox.)');
  });

  it('con fechas publicadas no estima y avisa si cierra pronto', () => {
    const c = conv('3', { descripcion: 'Ayudas a giras de jazz', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-10-23' });
    const a = accion(c, null, null, [], false, hoy);
    expect(a.plazo).toMatchObject({ estado: 'abierta', dias: 3, urgente: true });
    expect(a.plazo.estimado).toBeUndefined();
  });
});

describe('fechas de otros años', () => {
  it('lleva el año si no es el actual', () => {
    const c = conv('4', { descripcion: 'Ayudas a giras de jazz', fechaInicioSolicitud: '2025-09-23', fechaFinSolicitud: '2025-10-20' });
    expect(accion(c, null, null, [], false, hoy).plazo.texto).toContain('20 de octubre de 2025');
  });
});

describe('plazo con cierre aproximado', () => {
  it('cuenta como abierta mientras no llega el cierre estimado', async () => {
    const { plazo } = await import('../src/emparejamiento.js');
    const c = conv('5', { descripcion: 'Ayudas a festivales de jazz', fechaRecepcion: '2026-10-15', textFin: '20 días hábiles', fechaInicioSolicitud: null, fechaFinSolicitud: null, textInicio: null, abierto: null });
    expect(plazo(c, hoy)).toBe('abierta');
    // Contado desde el registro, si pasó hace poco no se sabe; si pasó hace mucho, cerrada.
    expect(plazo(c, new Date('2026-11-20T10:00:00Z'))).toBe('desconocido');
    expect(plazo(c, new Date('2027-02-01T10:00:00Z'))).toBe('cerrada');
  });
});
