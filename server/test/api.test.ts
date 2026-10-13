import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import type { Ficha } from '../src/ficha/esquema.js';
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
      {
        ...registro(detalle('300', { descripcion: 'Concurso internacional de piano 2026', fechaRecepcion: '2026-01-01', documentos: [{ id: 1, descripcion: 'Texto en castellano de la convocatoria', nombreFic: 'bases.pdf' }] })),
        textos: [{ idDocumento: 1, archivo: 'documentos/2026/1.txt', paginas: 2, caracteres: 15, descargado: '2026-10-09' }],
      },
      registro(
        detalle('200', {
          descripcion: 'Ayudas a la temporada de ópera y zarzuela',
          regiones: [{ descripcion: 'ES61 - ANDALUCIA' }],
          fechaRecepcion: '2025-03-01',
          fechaFinSolicitud: '2025-04-01',
        }),
      ),
    ].map((r) => desdeBdns(r)),
  );
  const ficha = { codigoBdns: '300', citas: { verificadas: 1, revisar: 0, noConsta: 0 } } as unknown as Ficha;
  app = crearApp(repo, {
    leerTexto: (r) => (r === 'documentos/2026/1.txt' ? 'Primera\fSegunda' : null),
    fichas: { leer: (codigo) => (codigo === '300' ? ficha : null), tiene: (codigo) => codigo === '300' },
  });
});

const ids = (res: request.Response) => res.body.items.map((c: { id: string }) => c.id);

describe('GET /api/convocatorias', () => {
  it('por defecto solo lo que le sirve al mánager (sin concesiones directas), sin el texto bruto', async () => {
    const res = await request(app).get('/api/convocatorias').expect(200);
    expect(ids(res)).toEqual(['bdns-100', 'bdns-300', 'bdns-200']);
    expect(res.body.items[0].texto).toBeUndefined();
    const directa = await request(app).get('/api/convocatorias?todas=true&tipo=directa').expect(200);
    expect(directa.body.items[0].concesiones.importeTotal).toBe(28000);
  });

  it('para=grupos o para=programadores', async () => {
    expect(ids(await request(app).get('/api/convocatorias?para=grupos'))).toEqual(['bdns-300']);
    expect(ids(await request(app).get('/api/convocatorias?para=programadores'))).toEqual(['bdns-100', 'bdns-200']);
  });

  it('todas=true incluye las no musicales', async () => {
    const res = await request(app).get('/api/convocatorias?todas=true').expect(200);
    expect(res.body.total).toBe(5);
  });

  it('filtra por estilo, comunidad, tipo, plazo y texto', async () => {
    // La 300 es de música en general: también es compatible con ópera.
    expect(ids(await request(app).get('/api/convocatorias?estilo=opera'))).toEqual(['bdns-300', 'bdns-200']);
    // La 300 no tiene restricción territorial («TODO EL MUNDO»): aparece en cualquier comunidad.
    expect(ids(await request(app).get('/api/convocatorias?ccaa=Andalucía'))).toEqual(['bdns-300', 'bdns-200']);
    expect(ids(await request(app).get('/api/convocatorias?todas=true&tipo=directa'))).toEqual(['bdns-932065']);
    expect(ids(await request(app).get('/api/convocatorias?plazo=abierta'))).toEqual(['bdns-100']);
    expect(ids(await request(app).get('/api/convocatorias?q=concurso internacional de piano'))).toEqual(['bdns-300']);
    expect(ids(await request(app).get('/api/convocatorias?todas=true&q=figueres'))).toEqual(['bdns-932065']);
    expect(ids(await request(app).get('/api/convocatorias?desde=2026-01-01'))).toEqual(['bdns-100', 'bdns-300']);
  });

  it('pagina', async () => {
    const res = await request(app).get('/api/convocatorias?porPagina=2&pagina=2').expect(200);
    expect(res.body).toMatchObject({ total: 3, pagina: 2, porPagina: 2 });
    expect(ids(res)).toEqual(['bdns-200']);
  });

  it('texto de un documento por páginas', async () => {
    const res = await request(app).get('/api/convocatorias/bdns-300/documentos/1').expect(200);
    expect(res.body).toMatchObject({ nombre: 'bases.pdf', paginas: ['Primera', 'Segunda'] });
    expect(res.body.url).toBe('https://www.pap.hacienda.gob.es/bdnstrans/api/convocatorias/documentos?idDocumento=1');
    await request(app).get('/api/convocatorias/bdns-300/documentos/2').expect(404);
  });

  it('detalle con la ficha de las bases cuando la hay, y 404', async () => {
    const sinFicha = (await request(app).get('/api/convocatorias/bdns-100').expect(200)).body;
    expect(sinFicha.ficha).toBeNull();
    // Sin ficha leída, la básica automática.
    expect(sinFicha.basica).toMatchObject({ datos: [] });
    const conFicha = (await request(app).get('/api/convocatorias/bdns-300').expect(200)).body;
    expect(conFicha.ficha.citas.verificadas).toBe(1);
    expect(conFicha.basica).toBeNull();
    const lista = await request(app).get('/api/convocatorias').expect(200);
    expect(lista.body.items.filter((c: { tieneFicha: boolean }) => c.tieneFicha).map((c: { id: string }) => c.id)).toEqual(['bdns-300']);
    await request(app).get('/api/convocatorias/no-existe').expect(404);
  });
});

describe('perfil y recomendaciones', () => {
  it('sin perfil no hay recomendaciones', async () => {
    const res = await request(app).get('/api/para-ti').expect(200);
    expect(res.body).toEqual({ perfilCompleto: false, abiertas: [], recurrentes: [], artistas: [], indirectas: [], precedentes: [] });
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
    expect(res.body.abiertas.map((m: { convocatoria: { id: string } }) => m.convocatoria.id)).toEqual(['bdns-300']);
    expect(res.body.indirectas.map((m: { convocatoria: { id: string } }) => m.convocatoria.id)).toEqual(['bdns-100']);
  });
});

describe('organismos', () => {
  it('lista los organismos con convocatorias de música y su detalle', async () => {
    const res = await request(app).get('/api/organismos').expect(200);
    // Las cuatro convocatorias de prueba comparten organismo (detalle real 934378); la de
    // fotografía no es de música y no cuenta.
    expect(res.body.total).toBe(1);
    const o = res.body.items[0];
    expect(o).toMatchObject({ nombre: 'ORGANISMO AUTÓNOMO DE MUSEOS Y CENTROS', convocatorias: 4, directas: 1, concedidoTotal: 28000 });
    expect(o.beneficiarios).toEqual([{ nombre: 'CASINO MENESTRAL FIGUERENC', importe: 28000, veces: 1 }]);
    expect(o.porAnio.map((a: { anio: number }) => a.anio)).toEqual([2025, 2026]);

    const detalle = await request(app).get(`/api/organismos/${o.id}`).expect(200);
    expect(detalle.body.convocatorias.map((c: { id: string }) => c.id)).toEqual(['bdns-932065', 'bdns-100', 'bdns-300', 'bdns-200']);
    expect(detalle.body.convocatorias[0].organismoId).toBe(o.id);
    await request(app).get('/api/organismos/no-existe').expect(404);
  });
});
