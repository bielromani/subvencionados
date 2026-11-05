import { describe, expect, it } from 'vitest';
import { encajeEntidad } from '../src/crm/encaje.js';
import { elegirEspectaculos, variadas } from '../src/crm/prospeccion.js';
import { AJUSTES_POR_DEFECTO } from '../src/crm/tipos.js';
import type { Espectaculo } from '../src/crm/tipos.js';
import type { Programador } from '../src/directorio.js';

const ficha = (id: string, tipo: Espectaculo['tipo'], extra: Partial<Espectaculo> = {}): Espectaculo => ({
  id, nombre: id, tipo, formato: 'f', requisitos: 'r', precioMin: null, precioMax: null, disponibilidad: '', fechasCerradas: '', ambito: '', enlace: '',
  estadoInfo: 'vigente', revisado: '2026-11-01', textoCarta: 't', ...extra,
});
const sitio = (id: string, estilos: Programador['estilos']) => ({ id, estilos, meses: [], contratos: 3, rango: null }) as unknown as Programador;

describe('variedad del catálogo en las propuestas', () => {
  const catalogo = [ficha('calders', 'camara'), ficha('aidos', 'camara'), ficha('trio', 'camara'), ficha('fidelio', 'opera'), ficha('traviata', 'opera'), ficha('flauta', 'opera')];
  const elegidas = (id: string, estilos: Programador['estilos'], cat = catalogo) => variadas(encajeEntidad(cat, sitio(id, estilos)).propuestas, 6, id).map((x) => x.espectaculo.id);

  it('con el mismo encaje, se reparten entre sitios en vez de salir siempre la misma', () => {
    const cuenta = new Map<string, number>();
    for (let i = 0; i < 300; i++) for (const id of elegidas(`p-${i}`, { clasica: 5 })) cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
    // De cámara salen 2 de 3 por sitio: cada una, en torno a 200 de 300.
    for (const id of ['calders', 'aidos', 'trio']) expect(cuenta.get(id)!).toBeGreaterThan(150);
    // El mismo sitio, siempre lo mismo.
    expect(elegidas('p-1', { clasica: 5 })).toEqual(elegidas('p-1', { clasica: 5 }));
  });

  it('«más a menudo» la pone delante de las de su estilo, pero no donde no encaja', () => {
    const cat = catalogo.map((e) => (e.id === 'fidelio' ? { ...e, prioridad: 'alta' as const } : e));
    for (let i = 0; i < 50; i++) expect(elegidas(`p-${i}`, { opera: 3 }, cat)).toContain('fidelio');
    expect(elegidas('p-x', { clasica: 5 }, cat)).not.toContain('fidelio');
  });

  it('afines completan el correo por detrás, y los topes por correo y por tipo se respetan', () => {
    const cat = [...catalogo, ficha('brahms', 'sinfonico_coral'), ficha('bach', 'religiosa')];
    const ids = (a: Partial<typeof AJUSTES_POR_DEFECTO>) => elegirEspectaculos(cat, sitio('p-1', { opera: 3 }), { ...AJUSTES_POR_DEFECTO, ...a }).map((x) => x.id);
    // Solo ópera en su historial: 2 óperas y, detrás, sinfónico-coral y religiosa como afines.
    const con = ids({});
    expect(con.slice(0, 2).every((x) => ['fidelio', 'traviata', 'flauta'].includes(x))).toBe(true);
    expect(con.slice(2).sort()).toEqual(['bach', 'brahms']);
    expect(ids({ afines: false })).toHaveLength(2);
    expect(ids({ obrasPorTipo: 3, afines: false }).sort()).toEqual(['fidelio', 'flauta', 'traviata']);
    expect(ids({ obrasPorCorreo: 3 })).toHaveLength(3);
  });
});
