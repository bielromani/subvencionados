import { describe, expect, it } from 'vitest';
import { prepararPropuestas, type FuentesProspeccion } from '../src/crm/prospeccion.js';
import { dossierDeAnexo, dossierDelCorreo } from '../src/crm/dossier.js';
import { PLANTILLAS_ARSVIA } from '../src/crm/cartasArsvia.js';
import { AJUSTES_POR_DEFECTO, DOSSIER_VACIO, type Campana, type Espectaculo } from '../src/crm/tipos.js';

const esp = (id: string, nombre: string, tipo: Espectaculo['tipo']): Espectaculo => ({
  id, nombre, tipo, formato: '', requisitos: '', precioMin: null, precioMax: null, disponibilidad: '', fechasCerradas: '', ambito: '', enlace: '', estadoInfo: 'vigente', revisado: null,
  dossier: { ...DOSSIER_VACIO, descripcion: `Sobre ${nombre}` },
});
const catalogo = [esp('req', 'Réquiem alemán', 'sinfonico_coral'), esp('pas', 'Pasión según San Juan', 'religiosa'), esp('fid', 'Fidelio', 'opera'), esp('fla', 'La flauta mágica', 'opera')];
const prog = (id: string, ccaa: string, provincia: string) =>
  ({ id, nombre: `Ayuntamiento de ${id}`, ciudad: id, provincia, codigoProvincia: '00', ccaa, web: null, contratos: 10, menores: 8, adjudicado: 1, importeHabitual: null, estilos: { clasica: 6, opera: 3 }, empresas: 1, primero: '2023-01-01', ultimo: '2026-07-01', meses: [7], recientes: [], rango: null, proveedores: [], recientesEstilo: [], codigoIne: `ine-${id}` }) as never;
const fuentes = (ps: unknown[]): FuentesProspeccion => ({
  programadores: () => ps as never,
  contacto: (ine) => ({ municipio: String(ine).slice(4), nombre: 'Ana Pérez', cargo: 'Concejala', email: `cultura@${String(ine).slice(4)}.es`, telefono: null, deCultura: true, poblacion: 100_000 }),
  ayudasProgramadores: () => [],
  licitacionesAbiertas: () => [],
  gestionDe: () => undefined,
});
const campana: Campana = {
  id: 'c1', nombre: 'Réquiem en Andalucía', espectaculos: ['req'], ccaa: ['Andalucía'], provincias: [], anexo: null,
  es: { asunto: 'El Réquiem de Brahms en {lugar}', intro: 'El 22 de julio de 2027 presentamos el Réquiem en Málaga.', texto: '{producciones}', cierre: '' },
  ca: { asunto: '', intro: '', texto: '', cierre: '' },
};
const ajustes = { ...AJUSTES_POR_DEFECTO, remitente: 'Joan', organizacion: 'ArsVia', plantillas: PLANTILLAS_ARSVIA, campanas: [campana] };
const sitios = fuentes([prog('malaga', 'Andalucía', 'Málaga'), prog('zaragoza', 'Aragón', 'Zaragoza')]);

describe('campañas', () => {
  it('solo su territorio, solo sus producciones y con su carta', () => {
    const xs = prepararPropuestas(sitios, catalogo, ajustes, new Set(), { limite: 10, campana, hoy: new Date('2026-11-24') });
    expect(xs.map((x) => x.ref)).toEqual(['malaga']);
    const [p] = xs;
    expect(p!.campana).toBe('c1');
    expect(p!.espectaculos.map((e) => e.id)).toEqual(['req']);
    expect(p!.asunto).toBe('El Réquiem de Brahms en malaga');
    expect(p!.cuerpo).toContain('El 22 de julio de 2027 presentamos el Réquiem en Málaga.');
    expect(p!.cuerpo).toContain('• Réquiem alemán');
    expect(p!.cuerpo).not.toContain('Pasión');
  });
  it('por provincias: solo las marcadas', () => {
    const fidelio: Campana = { ...campana, id: 'c2', espectaculos: ['fid'], ccaa: [], provincias: ['Zaragoza'] };
    const xs = prepararPropuestas(sitios, catalogo, { ...ajustes, campanas: [fidelio] }, new Set(), { limite: 10, campana: fidelio, hoy: new Date('2026-11-24') });
    expect(xs.map((x) => x.ref)).toEqual(['zaragoza']);
  });
});

describe('dossier de un correo, siempre uno', () => {
  it('la carta combinada lleva un PDF conjunto con todas las producciones', () => {
    const d = dossierDelCorreo(catalogo, 'es', ajustes)!;
    expect(d.producciones.map((p) => p.nombre)).toHaveLength(4);
    expect(d.subtitulo).toContain('Orquesta Sinfónica Siglo XXI');
  });
  it('anexo a medida: sus producciones en su orden y su título; con campaña, el anexo de la campaña', () => {
    const anexo = { id: 'a1', nombre: 'Lírico', espectaculos: ['req', 'pas', 'fid', 'fla'], es: { titulo: 'Propuestas Sinfónico-Corales y de Ópera · Años 2027 y 2028', subtitulo: '', condiciones: '', notaFinal: '' }, ca: { titulo: '', subtitulo: '', condiciones: '', notaFinal: '' } };
    const d = dossierDeAnexo(anexo, 'es', catalogo, ajustes)!;
    expect(d.titulo).toBe('Propuestas Sinfónico-Corales y de Ópera · Años 2027 y 2028');
    expect(d.producciones.map((p) => p.nombre)).toEqual(['Réquiem alemán', 'Pasión según San Juan', 'Fidelio', 'La flauta mágica']);
    const conAnexo = dossierDelCorreo([catalogo[0]!], 'es', { ...ajustes, anexos: [anexo] }, { campana: { ...campana, anexo: 'a1' }, catalogo })!;
    expect(conAnexo.producciones).toHaveLength(4);
  });
});
