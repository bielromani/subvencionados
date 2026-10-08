import { describe, expect, it } from 'vitest';
import { ClienteBdns, ErrorBdns, fechaBdns } from '../src/bdns/cliente.js';

function fetchFalso(respuestas: Record<string, () => Response>) {
  const llamadas: string[] = [];
  const fn = (async (url: string) => {
    llamadas.push(url);
    const host = new URL(url).host;
    const r = respuestas[host];
    if (!r) throw new Error('getaddrinfo ENOTFOUND');
    return r();
  }) as unknown as typeof fetch;
  return { fn, llamadas };
}

describe('ClienteBdns', () => {
  it('formatea fechas como dd/mm/aaaa', () => {
    expect(fechaBdns(new Date(2026, 0, 5))).toBe('05/01/2026');
  });

  it('si un dominio falla prueba el siguiente y lo recuerda', async () => {
    const { fn, llamadas } = fetchFalso({
      'b.example': () => Response.json({ content: [{ numeroConvocatoria: '1' }], last: true }),
    });
    const cliente = new ClienteBdns({ urlsBase: ['https://a.example/api', 'https://b.example/api'], pausaMs: 0, fetch: fn });

    const pagina = await cliente.buscarConvocatorias({ texto: 'jazz', fechaDesde: new Date(2026, 0, 1) });
    expect(pagina.content).toHaveLength(1);
    const url = new URL(llamadas[1]!);
    expect(url.pathname).toBe('/api/convocatorias/busqueda');
    expect(url.searchParams.get('descripcion')).toBe('jazz');
    expect(url.searchParams.get('fechaDesde')).toBe('01/01/2026');

    await cliente.obtenerConvocatoria('123');
    expect(new URL(llamadas[2]!).host).toBe('b.example');
    expect(new URL(llamadas[2]!).searchParams.get('numConv')).toBe('123');
  });

  it('lanza ErrorBdns si ningún dominio responde', async () => {
    const { fn } = fetchFalso({ 'a.example': () => new Response('error', { status: 503 }) });
    const cliente = new ClienteBdns({ urlsBase: ['https://a.example/api'], pausaMs: 0, fetch: fn });
    await expect(cliente.obtenerConvocatoria('1')).rejects.toBeInstanceOf(ErrorBdns);
  });
});
