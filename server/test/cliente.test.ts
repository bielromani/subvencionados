import { describe, expect, it } from 'vitest';
import { ClienteBdns, ErrorBdns, fechaBdns } from '../src/bdns/cliente.js';
import busquedaJazz from './fixtures/bdns-busqueda-jazz.json' with { type: 'json' };

type Respuesta = (url: URL) => Response;

function fetchFalso(respuestas: Record<string, Respuesta>) {
  const llamadas: URL[] = [];
  const fn = (async (url: string) => {
    const u = new URL(url);
    llamadas.push(u);
    const r = respuestas[u.host];
    if (!r) throw new Error('getaddrinfo ENOTFOUND');
    return r(u);
  }) as unknown as typeof fetch;
  return { fn, llamadas };
}

const opciones = { pausaMs: 0, esperaBaseMs: 0 };

describe('ClienteBdns', () => {
  it('formatea fechas como dd/mm/aaaa', () => {
    expect(fechaBdns(new Date(2026, 0, 5))).toBe('05/01/2026');
  });

  it('si un dominio falla prueba el siguiente y lo recuerda', async () => {
    const { fn, llamadas } = fetchFalso({ 'b.example': () => Response.json(busquedaJazz) });
    const cliente = new ClienteBdns({ ...opciones, reintentos: 0, urlsBase: ['https://a.example/api', 'https://b.example/api'], fetch: fn });

    const pagina = await cliente.buscarConvocatorias({ texto: 'jazz', fechaDesde: new Date(2026, 0, 1), finalidad: 11 });
    expect(pagina.content?.[1]?.descripcion).toBe('Sunset jazz club 2026');
    const url = llamadas[1]!;
    expect(url.pathname).toBe('/api/convocatorias/busqueda');
    expect(url.searchParams.get('descripcion')).toBe('jazz');
    expect(url.searchParams.get('fechaDesde')).toBe('01/01/2026');
    expect(url.searchParams.get('finalidad')).toBe('11');

    await cliente.obtenerConvocatoria('123');
    expect(llamadas[2]!.host).toBe('b.example');
    expect(llamadas[2]!.searchParams.get('numConv')).toBe('123');
  });

  it('recorre todas las páginas', async () => {
    const { fn, llamadas } = fetchFalso({
      'a.example': (u) =>
        Response.json({
          content: [{ numeroConvocatoria: `n${u.searchParams.get('page')}` }],
          last: u.searchParams.get('page') === '2',
        }),
    });
    const cliente = new ClienteBdns({ ...opciones, urlsBase: ['https://a.example/api'], fetch: fn });
    const todas = await cliente.buscarTodas({ finalidad: 11 });
    expect(todas.map((r) => r.numeroConvocatoria)).toEqual(['n0', 'n1', 'n2']);
    expect(llamadas[0]!.searchParams.get('pageSize')).toBe('10000');
  });

  it('reintenta los errores temporales', async () => {
    let intentos = 0;
    const { fn } = fetchFalso({
      'a.example': () => (++intentos < 3 ? new Response('error', { status: 503 }) : Response.json({ ok: 1 })),
    });
    const cliente = new ClienteBdns({ ...opciones, reintentos: 3, urlsBase: ['https://a.example/api'], fetch: fn });
    await expect(cliente.obtenerConvocatoria('1')).resolves.toEqual({ ok: 1 });
    expect(intentos).toBe(3);
  });

  it('un 404 es un error permanente y no se reintenta', async () => {
    let intentos = 0;
    const { fn } = fetchFalso({ 'a.example': () => (intentos++, new Response('no', { status: 404 })) });
    const cliente = new ClienteBdns({ ...opciones, reintentos: 3, urlsBase: ['https://a.example/api'], fetch: fn });
    const error = await cliente.obtenerConvocatoria('1').catch((e) => e);
    expect(error).toBeInstanceOf(ErrorBdns);
    expect(error.permanente).toBe(true);
    expect(intentos).toBe(1);
  });

  it('lanza ErrorBdns temporal si ningún dominio responde', async () => {
    const { fn } = fetchFalso({});
    const cliente = new ClienteBdns({ ...opciones, reintentos: 1, urlsBase: ['https://a.example/api'], fetch: fn });
    const error = await cliente.obtenerConvocatoria('1').catch((e) => e);
    expect(error).toBeInstanceOf(ErrorBdns);
    expect(error.permanente).toBe(false);
  });
});
