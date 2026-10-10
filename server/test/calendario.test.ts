import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { aICal, calendario } from '../src/calendario.js';
import type { Convocatoria, Serie } from '../src/tipos.js';
import { detalle, registro } from './ayudas.js';

const hoy = new Date('2026-10-08T10:00:00Z');
const conv = (codigo: string, cambios: Parameters<typeof detalle>[1]) => desdeBdns(registro(detalle(codigo, cambios)));
const serie = (c: Convocatoria, proximaPrevista: string): Serie => ({
  id: 's',
  anios: [2024, 2025],
  mesHabitual: 3,
  proximaPrevista,
  retrasada: false,
  convocatorias: [{ id: 'bdns-0', anio: 2024, titulo: '', presupuesto: null, concedido: null, fechaInicioSolicitud: null, fechaFinSolicitud: null }, { id: c.id, anio: 2025, titulo: '', presupuesto: null, concedido: null, fechaInicioSolicitud: null, fechaFinSolicitud: null }],
});

describe('calendario', () => {
  it('abre y cierra de los concursos vigentes, y la próxima edición prevista de las series', () => {
    const abierta = conv('1', { descripcion: 'Ayudas a festivales de jazz', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-10-20' });
    const proxima = conv('2', { descripcion: 'Ayudas a giras de música clásica', fechaInicioSolicitud: '2026-11-01', fechaFinSolicitud: '2026-11-30' });
    const cerrada = conv('3', { descripcion: 'Ayudas a temporadas de ópera', fechaInicioSolicitud: '2026-03-01', fechaFinSolicitud: '2026-03-30' });
    const becas = conv('4', { descripcion: 'Becas de formación musical', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-10-30' });
    const lejana = conv('5', { descripcion: 'Ayudas a la ópera', fechaInicioSolicitud: '2025-03-01', fechaFinSolicitud: '2025-03-30' });
    const eventos = calendario(
      [abierta, proxima, { ...cerrada, serie: serie(cerrada, '2027-03') }, becas, { ...lejana, serie: serie(lejana, '2028-03') }],
      hoy,
    );
    expect(eventos.map((e) => [e.tipo, e.fecha, e.convocatoria.codigoBdns])).toEqual([
      ['cierra', '2026-10-20', '1'],
      ['abre', '2026-11-01', '2'],
      ['cierra', '2026-11-30', '2'],
      ['prevista', '2027-03', '3'],
    ]);
  });

  it('iCal con eventos de día completo, texto escapado y líneas plegadas', () => {
    const c = conv('7', { descripcion: 'Ayudas a festivales de jazz, blues; y más', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-10-20' });
    const ics = aICal(calendario([c], hoy), 'http://localhost', hoy);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261021');
    expect(ics).toContain('SUMMARY:Cierra: Ayudas a festivales de jazz\\, blues\\; y más');
    expect(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});
