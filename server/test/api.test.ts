import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { Repositorio } from '../src/db.js';
import { CONCESIONES_FIGUERES, DETALLE_NATURAJAZZ, detalle, registro } from './ayudas.js';

let app: ReturnType<typeof crearApp>;

beforeEach(() => {
  const repo = new Repositorio(':memory:');
  repo.guardarVarias(
    [
      registro(DETALLE_NATURAJAZZ),
      registro(
        detalle('100', {
          descripcion: 'Subvenciones para ciclos de conciertos de jazz y música de cámara',
          regiones: [{ descripcion: 'ES511 - Barcelona' }],
          fechaRecepcion: '2026-09-01',
          fechaInicioSolicitud: '2026-09-15',
          fechaFinSolicitud: '2099-12-31',
        }),
      ),
      registro(
        detalle('932065', {
          descripcion: 'Convenio con el Casino Menestral para el XXXè Festival de Jazz de Figueres',
          tipoConvocatoria: null,
          regiones: [{ descripcion: 'ES512 - Girona' }],
          fechaRecepcion: '2026-09-28',
        }),
        CONCESIONES_FIGUERES,
      ),
      registro(
        detalle('200', {
          descripcion: 'Ayudas a la temporada de ópera y zarzuela',
          regiones: [{ descripcion: 'ES61 - ANDALUCIA' }],
          fechaRecepcion: '2025-03-01',
          fechaFinSolicitud: '2025-04-01',
        }),
      ),
    ].map(desdeBdns),
  );
  app = crearApp(repo);
});

const ids = (res: request.Response) => res.body.items.map((c: { id: string }) => c.id);

describe('GET /api/convocatorias', () => {
  it('por defecto solo devuelve las de música, sin el texto bruto', async () => {
    const res = await request(app).get('/api/convocatorias').expect(200);
    expect(ids(res)).toEqual(['bdns-932065', 'bdns-100', 'bdns-200']);
    expect(res.body.items[0].texto).toBeUndefined();
    expect(res.body.items[0].concesiones.importeTotal).toBe(28000);
  });

  it('todas=true incluye las no musicales', async () => {
    const res = await request(app).get('/api/convocatorias?todas=true').expect(200);
    expect(res.body.total).toBe(4);
  });

  it('filtra por estilo, comunidad, tipo, plazo y texto', async () => {
    expect(ids(await request(app).get('/api/convocatorias?estilo=opera'))).toEqual(['bdns-200']);
    expect(ids(await request(app).get('/api/convocatorias?ccaa=Andalucía'))).toEqual(['bdns-200']);
    expect(ids(await request(app).get('/api/convocatorias?tipo=directa'))).toEqual(['bdns-932065']);
    expect(ids(await request(app).get('/api/convocatorias?plazo=abierta'))).toEqual(['bdns-100']);
    expect(ids(await request(app).get('/api/convocatorias?q=figueres'))).toEqual(['bdns-932065']);
    expect(ids(await request(app).get('/api/convocatorias?desde=2026-01-01'))).toEqual(['bdns-932065', 'bdns-100']);
  });

  it('pagina', async () => {
    const res = await request(app).get('/api/convocatorias?porPagina=2&pagina=2').expect(200);
    expect(res.body).toMatchObject({ total: 3, pagina: 2, porPagina: 2 });
    expect(ids(res)).toEqual(['bdns-200']);
  });

  it('detalle y 404', async () => {
    await request(app).get('/api/convocatorias/bdns-100').expect(200);
    await request(app).get('/api/convocatorias/no-existe').expect(404);
  });
});

describe('perfil y recomendaciones', () => {
  it('sin perfil no hay recomendaciones', async () => {
    const res = await request(app).get('/api/para-ti').expect(200);
    expect(res.body).toEqual({ perfilCompleto: false, items: [] });
  });

  it('valida el perfil', async () => {
    const res = await request(app).put('/api/perfil').send({ formaJuridica: 'x', grupos: [{}] }).expect(400);
    expect(res.body.errores.length).toBeGreaterThan(0);
  });

  it('guarda el perfil y recomienda', async () => {
    await request(app)
      .put('/api/perfil')
      .send({
        nombre: 'Mi promotora',
        formaJuridica: 'sociedad',
        ccaaSede: 'Cataluña',
        ccaaActuacion: [],
        grupos: [{ nombre: 'Cuarteto', estilo: 'clasica', componentes: 4 }],
        actividades: ['festivales'],
      })
      .expect(200);

    const perfil = await request(app).get('/api/perfil').expect(200);
    expect(perfil.body.grupos[0]).toEqual({ nombre: 'Cuarteto', estilo: 'clasica', componentes: 4 });

    const res = await request(app).get('/api/para-ti').expect(200);
    expect(res.body.perfilCompleto).toBe(true);
    expect(res.body.items.map((m: { convocatoria: { id: string } }) => m.convocatoria.id)).toEqual(['bdns-100']);
  });
});
