import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { emparejar } from '../src/emparejamiento.js';
import { coincidenciasGenericas, nuevas, PERFIL_GENERICO, porGrupo, seleccionar } from '../src/inicio.js';
import type { Perfil } from '../src/tipos.js';
import { detalle, registro } from './ayudas.js';

const hoy = new Date('2026-10-08T10:00:00Z');
const conv = (codigo: string, cambios: Parameters<typeof detalle>[1]) => desdeBdns(registro(detalle(codigo, cambios)));

describe('portada y grupos', () => {
  const jazzPronto = conv('1', { descripcion: 'Ayudas a festivales de jazz', fechaRecepcion: '2026-10-01', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-10-20' });
  const operaTarde = conv('2', { descripcion: 'Ayudas a la producción de ópera', fechaRecepcion: '2026-06-01', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-12-20' });
  const clasicaProxima = conv('3', { descripcion: 'Ayudas a giras de orquestas', fechaRecepcion: '2026-09-01', fechaInicioSolicitud: '2026-11-01', fechaFinSolicitud: '2026-11-30' });
  const todas = [jazzPronto, operaTarde, clasicaProxima];

  it('cierran pronto (30 días) y abren pronto, por fecha', () => {
    const s = seleccionar(emparejar(todas, PERFIL_GENERICO, hoy), hoy);
    expect(s.abiertas.map((m) => m.convocatoria.codigoBdns).sort()).toEqual(['1', '2', '3']);
    expect(s.cierranPronto.map((m) => m.convocatoria.codigoBdns)).toEqual(['1']);
    expect(s.abrenPronto.map((m) => m.convocatoria.codigoBdns)).toEqual(['3']);
  });

  it('sin perfil, lo que admite autónomos o asociaciones, sin repetir', () => {
    const asociaciones = conv('4', { descripcion: 'Ayudas a festivales de jazz', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-10-20', tiposBeneficiarios: [{ descripcion: 'PERSONAS JURÍDICAS QUE NO DESARROLLAN ACTIVIDAD ECONÓMICA' }] as never });
    const ids = coincidenciasGenericas([...todas, asociaciones], hoy).map((m) => m.convocatoria.codigoBdns).sort();
    expect(ids).toEqual(['1', '2', '3', '4']);
  });

  it('nuevas: registradas en los últimos 14 días', () => {
    expect(nuevas(emparejar(todas, PERFIL_GENERICO, hoy), hoy).map((m) => m.convocatoria.codigoBdns)).toEqual(['1']);
  });

  it('cada grupo solo ve lo de su estilo', () => {
    const perfil: Perfil = { ...PERFIL_GENERICO, grupos: [{ nombre: 'Trío', estilo: 'jazz' }, { nombre: 'Compañía', estilo: 'opera' }] };
    const grupos = porGrupo(todas, perfil, hoy);
    expect(grupos.map((g) => [g.grupo.nombre, g.abiertas.map((m) => m.convocatoria.codigoBdns)])).toEqual([
      ['Trío', ['1']],
      ['Compañía', ['2']],
    ]);
  });
});
