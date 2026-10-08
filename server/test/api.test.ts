import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { convocatoriasDemo } from '../src/data/demo.js';
import { Repositorio } from '../src/db.js';
import fixture from './fixtures/bdns-convocatoria.json' with { type: 'json' };

let repo: Repositorio;
let app: ReturnType<typeof crearApp>;

beforeEach(() => {
  repo = new Repositorio(':memory:');
  for (const c of convocatoriasDemo()) repo.guardarConvocatoria(c);
  repo.guardarConvocatoria(desdeBdns(fixture));
  app = crearApp(repo);
});

describe('GET /api/convocatorias', () => {
  it('por defecto solo devuelve las de música, sin el texto bruto', async () => {
    const res = await request(app).get('/api/convocatorias').expect(200);
    const ids = res.body.items.map((c: { id: string }) => c.id);
    expect(ids).toContain('bdns-999001');
    // Córdoba ("festivales y ferias culturales") y PLATEA ("artes escénicas") no dicen "música".
    expect(ids).not.toContain('demo-cordoba-festivales-2026');
    expect(res.body.items[0].texto).toBeUndefined();
    expect(res.body.items[0].plazo).toBeDefined();
  });

  it('todas=true incluye las no musicales', async () => {
    const res = await request(app).get('/api/convocatorias?todas=true').expect(200);
    expect(res.body.total).toBe(7);
  });

  it('filtra por estilo, comunidad y texto', async () => {
    const jazz = await request(app).get('/api/convocatorias?estilo=jazz&ccaa=Cataluña').expect(200);
    const ids = jazz.body.items.map((c: { id: string }) => c.id);
    expect(ids).toContain('bdns-999001');
    expect(ids).toContain('demo-inaem-musica-lirica-2026'); // estatal → aplica en Cataluña
    expect(ids).not.toContain('demo-andalucia-musica-en-vivo-2026');

    const texto = await request(app).get('/api/convocatorias?q=avila').expect(200);
    expect(texto.body.items.map((c: { id: string }) => c.id)).toEqual(['demo-avila-festival-jazz-2026']);
  });

  it('detalle y 404', async () => {
    await request(app).get('/api/convocatorias/bdns-999001').expect(200);
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
    expect(res.body.items[0].convocatoria.id).toBe('bdns-999001');
  });
});
