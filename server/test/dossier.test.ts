import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLANTILLAS_ARSVIA, TEXTOS_PRODUCCIONES_ARSVIA } from '../src/crm/cartasArsvia.js';
import { dossierDeCorreo, dossierDeLinea, nombreArchivoDossier, pdfDossier } from '../src/crm/dossier.js';
import { AJUSTES_POR_DEFECTO, type Espectaculo } from '../src/crm/tipos.js';
import { enviadorDesdeEntorno } from '../src/email.js';

const ajustes = { ...AJUSTES_POR_DEFECTO, organizacion: 'ArsVia – Music Projects', email: 'a@b.org', plantillas: PLANTILLAS_ARSVIA };
const ficha = (id: string, nombre: string, tipo: Espectaculo['tipo'], extra: Partial<Espectaculo> = {}): Espectaculo => ({
  id,
  nombre,
  tipo,
  formato: '',
  requisitos: '',
  precioMin: null,
  precioMax: null,
  disponibilidad: '',
  fechasCerradas: '',
  ambito: '',
  enlace: '',
  estadoInfo: 'vigente',
  revisado: null,
  ...extra,
});
const dossierDe = (nombre: string) => TEXTOS_PRODUCCIONES_ARSVIA.find((t) => t.patron.test(nombre))!.dossier;

describe('dossier en PDF', () => {
  it('el del correo es el de su línea principal, solo con sus producciones, y solo si alguna tiene dossier', () => {
    const fidelio = ficha('1', 'Fidelio – Beethoven', 'opera', { dossier: dossierDe('Fidelio') });
    const flauta = ficha('2', 'La flauta mágica – Mozart', 'opera', { dossier: dossierDe('La flauta mágica') });
    const jazz = ficha('3', 'Oriol Romaní & Friends', 'jazz');
    const d = dossierDeCorreo([fidelio, jazz, flauta], 'es', ajustes)!;
    expect(d.linea).toBe('opera');
    expect(d.producciones.map((p) => p.nombre)).toEqual(['Fidelio – Beethoven', 'La flauta mágica – Mozart']);
    expect(d.resumen.length).toBeGreaterThanOrEqual(2);
    expect(dossierDeCorreo([jazz], 'es', ajustes)).toBeNull();
    expect(nombreArchivoDossier(d, ajustes.organizacion)).toMatch(/^ArsVia-.+\.pdf$/);
  });

  it('el de una línea deja fuera lo apartado de las cartas', () => {
    const d = dossierDeLinea('popular', 'es', [ficha('1', 'Historia del rock', 'rock'), ficha('2', 'Professor Cunningham', 'jazz', { enCartas: false })], ajustes);
    expect(d.producciones.map((p) => p.nombre)).toEqual(['Historia del rock']);
  });

  it('genera un PDF con las tipografías incrustadas', async () => {
    const d = dossierDeCorreo([ficha('1', 'Fidelio – Beethoven', 'opera', { dossier: dossierDe('Fidelio') })], 'es', ajustes)!;
    const pdf = await pdfDossier(d, join(import.meta.dirname, '../../datos/fuentes'));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(10_000);
  });
});

describe('adjuntos', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('Brevo recibe el adjunto en base64', async () => {
    const llamadas: { body: string }[] = [];
    vi.stubGlobal('fetch', async (_u: string, o: { body: string }) => (llamadas.push(o), { ok: true }));
    const enviar = enviadorDesdeEntorno({ AVISOS_REMITENTE: 'x@y.org', BREVO_API_KEY: 'k' })!;
    await enviar({ para: 'a@b.org', asunto: 'A', html: '', texto: 'T', adjuntos: [{ nombre: 'd.pdf', contenido: Buffer.from('hola') }] });
    expect(JSON.parse(llamadas[0]!.body).attachment).toEqual([{ name: 'd.pdf', content: Buffer.from('hola').toString('base64') }]);
  });
});

describe('las cartas salen solo de las plantillas', async () => {
  const { componerCarta, PLANTILLAS_GENERICAS } = await import('../src/crm/cartas.js');
  const base = { idioma: 'es' as const, lugar: 'Lleida', persona: null, historial: [], licitaciones: [], ayudas: [], gestion: false };
  const ficha = { id: '1', nombre: 'Fidelio – Beethoven', tipo: 'opera' as const, enlace: '', textoCarta: '👉 Resumen copiado de la web\nCon varias líneas' };
  it('el texto de la ficha no entra en el correo; la lista es la de la plantilla', () => {
    const c = componerCarta({ ...base, espectaculos: [ficha], ajustes: { ...ajustes, plantillas: PLANTILLAS_ARSVIA } });
    expect(c.cuerpo).not.toContain('Resumen copiado');
    expect(c.cuerpo).toContain('• Fidelio, de Beethoven · Con dirección musical de Salvador Brotons');
  });
  it('con {producciones}, los nombres de las de la línea', () => {
    const c = componerCarta({ ...base, espectaculos: [ficha], ajustes: { ...ajustes, firma: 'Mi firma', plantillas: PLANTILLAS_GENERICAS } });
    expect(c.cuerpo).toContain('• Fidelio – Beethoven');
    expect(c.cuerpo).not.toContain('Resumen copiado');
    expect(c.cuerpo.endsWith('Mi firma')).toBe(true);
  });
  it('las plantillas guardadas con el texto anterior de ArsVia reciben la lista', async () => {
    const { completarPlantillas } = await import('../src/crm/cartas.js');
    const { TEXTOS_LINEA_SIN_LISTA } = await import('../src/crm/cartasArsvia.js');
    const m = TEXTOS_LINEA_SIN_LISTA.find((x) => x.idioma === 'es' && x.linea === 'opera')!;
    const viejas = JSON.parse(JSON.stringify(PLANTILLAS_ARSVIA));
    viejas.es.lineas.opera.texto = m.antes;
    expect(completarPlantillas(viejas).es.lineas.opera.texto).toBe(m.ahora);
  });
});
