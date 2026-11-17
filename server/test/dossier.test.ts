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
