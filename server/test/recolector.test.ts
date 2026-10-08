import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Almacen } from '../src/bdns/almacen.js';
import { type ClienteBdns, ErrorBdns } from '../src/bdns/cliente.js';
import { pareceMusical, recolectar, ventanasAnuales } from '../src/bdns/recolector.js';
import type { BdnsConcesion, BdnsResultadoBusqueda } from '../src/bdns/tipos.js';
import { CONCESIONES_FIGUERES, detalle } from './ayudas.js';
import busquedaJazz from './fixtures/bdns-busqueda-jazz.json' with { type: 'json' };

const LISTADO = busquedaJazz.content as BdnsResultadoBusqueda[];

/** Cliente falso: devuelve el listado real de la búsqueda "jazz" y detalles derivados del real. */
function clienteFalso(fallan: Record<string, ErrorBdns> = {}) {
  const pedidos: string[] = [];
  const cliente = {
    buscarTodas: async () => LISTADO,
    obtenerConvocatoria: async (n: string) => {
      pedidos.push(n);
      if (fallan[n]) throw fallan[n];
      const r = LISTADO.find((x) => x.numeroConvocatoria === n)!;
      return detalle(n, { descripcion: r.descripcion, fechaRecepcion: r.fechaRecepcion });
    },
    concesionesDe: async (n: string): Promise<BdnsConcesion[]> =>
      n === '932065' ? [...CONCESIONES_FIGUERES, { beneficiario: '***1234** NOMBRE APELLIDO', idPersona: 9, importe: 50 }] : [],
  } as unknown as ClienteBdns;
  return { cliente, pedidos };
}

const ahora = () => new Date('2026-10-08T10:00:00Z');
const base = { desde: new Date('2026-01-01'), hasta: new Date('2026-10-08'), limiteMs: 60_000, refrescarDias: 0, ahora, log: () => {} };

describe('pareceMusical (títulos reales)', () => {
  it('filtra el listado por el título', () => {
    expect(LISTADO.map(pareceMusical)).toEqual([false, true, true]);
  });
});

describe('ventanasAnuales', () => {
  it('parte el periodo por años naturales', () => {
    const v = ventanasAnuales(new Date(2024, 5, 1), new Date(2026, 2, 1));
    expect(v.map(([a, b]) => [a.getFullYear(), a.getMonth(), b.getFullYear(), b.getMonth()])).toEqual([
      [2024, 5, 2024, 11],
      [2025, 0, 2025, 11],
      [2026, 0, 2026, 2],
    ]);
  });
});

describe('recolectar', () => {
  it('descarga las musicales, anonimiza concesiones y escribe por año', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'subv-'));
    const { cliente, pedidos } = clienteFalso();
    const r = await recolectar({ ...base, cliente, almacen: new Almacen(dir) });

    expect(r).toMatchObject({ descubiertas: 2, nuevas: 2, fallidas: [], pendientes: 0, completada: true });
    expect(pedidos).toEqual(['932450', '932065']);

    const guardadas = JSON.parse(readFileSync(join(dir, 'convocatorias', '2026.json'), 'utf8'));
    expect(guardadas.map((g: { detalle: { codigoBDNS: string } }) => g.detalle.codigoBDNS)).toEqual(['932065', '932450']);
    const concesiones = guardadas[0].concesiones;
    expect(concesiones.map((c: { beneficiario: string }) => c.beneficiario)).toEqual([
      'G17057910 CASINO MENESTRAL FIGUERENC',
      'PERSONA FÍSICA',
    ]);
    expect(JSON.stringify(guardadas)).not.toContain('idPersona');

    const estado = JSON.parse(readFileSync(join(dir, 'estado.json'), 'utf8'));
    expect(estado).toMatchObject({ descubiertoHasta: '2026-10-08', pendientes: [] });

    // Segunda ejecución: no vuelve a descargar lo que ya tiene.
    const segunda = clienteFalso();
    const r2 = await recolectar({ ...base, cliente: segunda.cliente, almacen: new Almacen(dir) });
    expect(r2.nuevas).toBe(0);
    expect(segunda.pedidos).toEqual([]);
  });

  it('los errores temporales quedan pendientes y los permanentes se descartan', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'subv-'));
    const { cliente } = clienteFalso({
      '932450': new ErrorBdns('HTTP 503', false),
      '932065': new ErrorBdns('HTTP 404', true),
    });
    const r = await recolectar({ ...base, cliente, almacen: new Almacen(dir) });
    expect(r.fallidas).toEqual(['932450', '932065']);
    expect(new Almacen(dir).estado.pendientes).toEqual(['932450']);
  });

  it('se para al agotar el tiempo y deja el resto pendiente', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'subv-'));
    const { cliente, pedidos } = clienteFalso();
    const r = await recolectar({ ...base, cliente, almacen: new Almacen(dir), limiteMs: 0 });
    expect(pedidos).toEqual([]);
    expect(r).toMatchObject({ pendientes: 2, completada: false });
  });

  it('refresca las publicadas en los últimos días', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'subv-'));
    await recolectar({ ...base, cliente: clienteFalso().cliente, almacen: new Almacen(dir) });
    const { cliente, pedidos } = clienteFalso();
    const r = await recolectar({ ...base, cliente, almacen: new Almacen(dir), refrescarDias: 30 });
    expect(r.refrescadas).toBe(2);
    expect(pedidos.sort()).toEqual(['932065', '932450']);
  });
});
