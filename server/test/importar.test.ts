import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { AlmacenCuentas } from '../src/cuentas.js';
import { AlmacenCrm } from '../src/crm/almacen.js';
import { descargarCatalogoArsvia, tipoDeSeccion } from '../src/crm/importar.js';

// Copia real (recortada) de la API pública de arsvia.org: secciones Sinfónico-Coral y Jazz.
const api = JSON.parse(readFileSync(new URL('./fixtures/arsvia-api.json', import.meta.url), 'utf8')) as { secciones: unknown[]; conciertos: Record<string, unknown[]> };
const pedir = (async (url: string) => {
  const u = new URL(url);
  const datos = u.searchParams.get('action') === 'public_sections' ? api.secciones : (api.conciertos[u.searchParams.get('section_id')!] ?? []);
  return new Response(JSON.stringify(datos), { status: 200 });
}) as typeof fetch;

describe('importar el catálogo de arsvia.org', () => {
  it('tipos por sección', () => {
    expect(['Ópera', 'Sinfónico - Coral', 'Sinfónica', 'Música Cámara', 'Navidad', 'Jazz', 'Rock', 'Música del Mediterrani i fusió lírica'].map(tipoDeSeccion)).toEqual([
      'opera',
      'sinfonico_coral',
      'sinfonica',
      'camara',
      'navidad',
      'jazz',
      'rock',
      'fusion',
    ]);
  });

  it('solo copia lo que dice la web; sin precio y pendiente de revisar', async () => {
    const xs = await descargarCatalogoArsvia('https://arsvia.org', pedir);
    const requiem = xs.find((x) => x.origen === 'arsvia.org#3')!;
    expect(requiem).toMatchObject({ nombre: 'Réquiem alemán – Brahms', tipo: 'sinfonico_coral', precioMin: null, precioMax: null, estadoInfo: 'pendiente', revisado: null });
    expect(requiem.formato).toContain('Duración: 70–80 minutos');
    expect(requiem.disponibilidad).toContain('14, 16 y 17 de julio de 2027');
    const ella = xs.find((x) => x.origen === 'arsvia.org#30')!;
    expect(ella.tipo).toBe('jazz');
    expect(ella.requisitos).toMatch(/^Necesidades técnicas: piano de cola/);
    expect(xs.find((x) => x.origen === 'arsvia.org#25')!.disponibilidad).toContain('Disponible a partir otoño 2028');
  });
});

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('reimportar sin duplicar', () => {
  const cuentas = url ? AlmacenCuentas.desdeUrl(url) : null!;
  const crm = url ? new AlmacenCrm(cuentas) : null!;
  afterAll(() => cuentas?.cerrar());
  it('actualiza solo lo que cambia en la web y marca lo retirado', async () => {
    const u = (await cuentas.crear(`importar-${Date.now()}@example.com`, 'una clave larga'))!.id;
    const web = await descargarCatalogoArsvia('https://arsvia.org', pedir);
    expect(await crm.importarCatalogo(u, web, 'arsvia.org#')).toEqual({ nuevos: 3, actualizados: 0, retirados: 0, sinCambios: 0 });
    // El usuario revisa una ficha y pone precio: no se pierde al reimportar si la web no cambia.
    const requiem = (await crm.espectaculos(u)).find((e) => e.origen === 'arsvia.org#3')!;
    const { id, ...resto } = requiem;
    await crm.guardarEspectaculo(u, { ...resto, precioMin: 12000, estadoInfo: 'vigente', revisado: '2026-11-03' }, id);
    expect(await crm.importarCatalogo(u, web, 'arsvia.org#')).toEqual({ nuevos: 0, actualizados: 0, retirados: 0, sinCambios: 3 });
    expect((await crm.espectaculos(u)).find((e) => e.id === id)).toMatchObject({ precioMin: 12000, estadoInfo: 'vigente' });
    // La web cambia el formato del Réquiem y retira otra propuesta.
    const cambiada = web.filter((x) => x.origen !== 'arsvia.org#25').map((x) => (x.origen === 'arsvia.org#3' ? { ...x, formato: 'Duración: 90 minutos' } : x));
    expect(await crm.importarCatalogo(u, cambiada, 'arsvia.org#')).toEqual({ nuevos: 0, actualizados: 1, retirados: 1, sinCambios: 1 });
    const despues = await crm.espectaculos(u);
    expect(despues.find((e) => e.id === id)).toMatchObject({ formato: 'Duración: 90 minutos', precioMin: 12000, estadoInfo: 'pendiente' });
    expect(despues.find((e) => e.origen === 'arsvia.org#25')).toMatchObject({ enWeb: false, estadoInfo: 'pendiente' });
    expect(despues).toHaveLength(3);
  });
});
