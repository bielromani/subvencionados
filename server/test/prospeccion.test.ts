import { afterAll, describe, expect, it } from 'vitest';
import { AlmacenCuentas } from '../src/cuentas.js';
import { AlmacenCrm } from '../src/crm/almacen.js';
import { prepararPropuestas, type FuentesProspeccion } from '../src/crm/prospeccion.js';
import { AJUSTES_POR_DEFECTO, type Espectaculo } from '../src/crm/tipos.js';

const esp = (id: string, nombre: string, tipo: Espectaculo['tipo']): Espectaculo => ({
  id, nombre, tipo, formato: '', requisitos: '', precioMin: null, precioMax: null, disponibilidad: '', fechasCerradas: '', ambito: '', enlace: '', estadoInfo: 'pendiente', revisado: null,
});
const catalogo = [esp('00000000-0000-4000-8000-000000000001', 'Trío de jazz', 'jazz'), esp('00000000-0000-4000-8000-000000000002', 'Big band', 'jazz'), esp('00000000-0000-4000-8000-000000000003', 'Fidelio', 'opera'), esp('00000000-0000-4000-8000-000000000004', 'Cuarteto', 'camara'), esp('00000000-0000-4000-8000-000000000005', 'Tributo rock', 'rock')];
const prog = (id: string, ciudad: string, estilos: Record<string, number>, extra = {}) =>
  ({ id, nombre: `Alcaldía del Ayuntamiento de ${ciudad}`, ciudad, provincia: 'Teruel', codigoProvincia: '44', ccaa: 'Aragón', web: null, contratos: 10, menores: 8, adjudicado: 1, importeHabitual: null, estilos, empresas: 1, primero: '2023-01-01', ultimo: '2026-07-01', meses: [7], recientes: [], rango: null, proveedores: [], recientesEstilo: [], codigoIne: `ine-${id}`, ...extra }) as never;
const fuentes = (programadores: unknown[]): FuentesProspeccion => ({
  programadores: () => programadores as never,
  contacto: (ine) => (ine === 'ine-sin' ? null : { municipio: ine === 'ine-a' ? 'Alcañiz' : 'Calamocha', nombre: 'Persona de Cultura', cargo: 'Concejala', email: 'cultura@alcaniz.es', telefono: null, deCultura: true }),
  ayudasProgramadores: () => [],
  licitacionesAbiertas: () => [],
  gestionDe: () => undefined,
});

describe('propuestas preparadas', () => {
  const hoy = new Date('2026-11-03T10:00:00Z');
  it('un correo por sitio, a la persona de cultura, con los grupos del estilo que programa', () => {
    const [p] = prepararPropuestas(fuentes([prog('a', 'Alcañiz', { jazz: 6 })]), catalogo, { ...AJUSTES_POR_DEFECTO, remitente: 'Joan', organizacion: 'ARS VIA' }, new Set(), { limite: 5, hoy });
    expect(p).toMatchObject({ ref: 'a', nombre: 'Ayuntamiento de Alcañiz', destinatario: 'cultura@alcaniz.es', persona: 'Persona de Cultura', revisarEmail: null });
    expect(p!.espectaculos.map((e) => e.id)).toEqual(['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002']);
    expect(p!.cuerpo).toContain('Estimado/a Persona de Cultura:');
    expect(p!.cuerpo).toContain('han programado jazz');
    expect(p!.cuerpo).not.toMatch(/€|garantiz|concedid/);
    expect(p!.motivos[0]).toContain('6 de jazz');
  });

  it('sin email, sin razón concreta, ya en seguimiento o descartado: no se propone', () => {
    const xs = prepararPropuestas(
      fuentes([prog('sin', 'Sinemail', { jazz: 3 }, { codigoIne: 'ine-sin' }), prog('nada', 'Nada', {}), prog('ya', 'Ya', { opera: 4 })]),
      catalogo,
      AJUSTES_POR_DEFECTO,
      new Set(['ya']),
      { limite: 5, hoy },
    );
    expect(xs).toHaveLength(0);
  });
});

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('visto bueno a una propuesta', () => {
  const cuentas = url ? AlmacenCuentas.desdeUrl(url) : null!;
  const crm = url ? new AlmacenCrm(cuentas) : null!;
  afterAll(() => cuentas?.cerrar());
  it('la entidad entra en seguimiento con la carta aprobada, y no se vuelve a proponer', async () => {
    const u = (await cuentas.crear(`prop-${Date.now()}@example.com`, 'una clave larga'))!.id;
    const [p] = prepararPropuestas(fuentes([prog('a', 'Alcañiz', { jazz: 6 })]), catalogo, AJUSTES_POR_DEFECTO, new Set(), { limite: 5, hoy: new Date('2026-11-03') });
    await crm.guardarPropuestas(u, [p!, p!]);
    const [guardada] = await crm.propuestas(u);
    expect(await crm.contarPropuestas(u)).toBe(1);
    const r = await crm.aceptarPropuesta(u, guardada!.id, { asunto: 'Asunto retocado', cuerpo: 'Texto retocado', destinatario: 'cultura@alcaniz.es' }, {
      ref: 'a', nombre: p!.nombre, tipo: 'ayuntamiento', municipio: 'Alcañiz', provincia: 'Teruel', ccaa: 'Aragón', persona: p!.persona, email: null, telefono: null, idioma: 'es', notas: '',
    });
    expect(r.mensaje).toMatchObject({ estado: 'aprobado', asunto: 'Asunto retocado', paso: 1 });
    expect(r.entidad.email).toBe('cultura@alcaniz.es');
    expect(await crm.contarPropuestas(u)).toBe(0);
    expect((await crm.refsBloqueadas(u)).has('a')).toBe(true);
    await crm.registrarEnvio(u, r.mensaje.id);
    expect((await crm.bandeja(u, new Date('2027-01-01'))).map((m) => m.paso)).toEqual([2]);
  });
});
