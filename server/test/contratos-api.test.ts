import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp, mismoMunicipio } from '../src/app.js';
import { entradas, leerEntrada } from '../src/contratos/placsp.js';
import { enriquecer } from '../src/contratos/vista.js';
import { Repositorio } from '../src/db.js';

const atom = readFileSync(new URL('./fixtures/placsp-lugo.atom', import.meta.url), 'utf8');
const lugo = enriquecer(leerEntrada(entradas(atom)[0]!)!);
// Una licitación abierta construida a partir de la real.
const abiertaJazz = enriquecer({
  ...lugo,
  id: '1',
  titulo: 'Contratación de conciertos de jazz del ciclo de otoño',
  estado: 'PUB',
  finPlazo: '2999-01-01',
  adjudicaciones: [],
});
const app = crearApp(new Repositorio(':memory:'), { contratos: [lugo, abiertaJazz] });

describe('contratos', () => {
  it('territorio desde el código postal y lo adjudicado', () => {
    expect(lugo).toMatchObject({ codigoProvincia: '27', provincia: 'Lugo', ccaa: 'Galicia', adjudicado: 16000, fechaAdjudicacion: '2026-09-29' });
    expect(abiertaJazz.estilos).toEqual(['jazz']);
  });

  it('listado con filtros de estado y estilo', async () => {
    const todas = await request(app).get('/api/contratos').expect(200);
    expect(todas.body.total).toBe(2);
    expect(todas.body.items[0].documentos).toBeUndefined();
    const abiertas = await request(app).get('/api/contratos?estado=abiertas').expect(200);
    expect(abiertas.body.items.map((c: { id: string; abierta: boolean }) => [c.id, c.abierta])).toEqual([['1', true]]);
    const adjudicadas = await request(app).get('/api/contratos?estado=adjudicadas&ccaa=Galicia').expect(200);
    expect(adjudicadas.body.items.map((c: { id: string }) => c.id)).toEqual(['20585917']);
    expect((await request(app).get('/api/contratos?estilo=jazz').expect(200)).body.total).toBe(1);
  });

  it('detalle, mercado y competencia', async () => {
    expect((await request(app).get('/api/contratos/20585917').expect(200)).body.expediente).toBe('2026/C005/000012');
    await request(app).get('/api/contratos/nada').expect(404);
    const m = (await request(app).get('/api/contratos/mercado').expect(200)).body;
    expect(m.empresas).toEqual([{ nombre: 'CAS D´OLEIRO 2.0 SL', nif: 'B27338821', contratos: 1, adjudicado: 16000, organismos: 1 }]);
    expect(m.porAnio).toEqual([{ anio: 2026, contratos: 1, adjudicado: 16000 }]);
  });

  it('licitaciones abiertas en el calendario', async () => {
    const r = (await request(app).get('/api/calendario').expect(200)).body;
    expect(r.licitaciones.map((c: { id: string }) => c.id)).toEqual(['1']);
  });

  it('mismo municipio aunque el INE ponga el artículo detrás', () => {
    expect(mismoMunicipio('Las Palmas de Gran Canaria', 'Palmas de Gran Canaria, Las')).toBe(true);
    expect(mismoMunicipio('Lugo', 'Lugo')).toBe(true);
    expect(mismoMunicipio('Lugo', 'Ourense')).toBe(false);
  });
});
