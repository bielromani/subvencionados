import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { apartadosExtracto, datosBasicos, fichaBasica } from '../src/ficha/basica.js';
import { normalizarCita, type DocumentoTexto } from '../src/ficha/verificar.js';

// Bases reales del Palau Ressona 2026 (BDNS 928556).
const texto = gunzipSync(readFileSync(new URL('./fixtures/bases-1519395.txt.gz', import.meta.url))).toString('utf8');
const bases: DocumentoTexto = { id: 1519395, nombre: 'Bases2026_cast.pdf', paginas: texto.split('\f') };

describe('extracto por apartados', () => {
  it('reconoce títulos numerados, también con los párrafos pegados', () => {
    const a = apartadosExtracto(
      'Texto de la BDNS (http://x.es).Primero. Beneficiarios:Asociaciones culturales.\nSegundo. Objeto.\nConciertos de jazz.\nTercero. Cuantía\nLa dotación es de 50.000,00 €.\nCuarto. Plazo de presentación de solicitudes\nVeinte días hábiles.',
    );
    expect(a.map((x) => x.tipo)).toEqual(['beneficiarios', 'objeto', 'cuantia', 'plazo']);
    expect(a[0]!.texto).toBe('Beneficiarios:Asociaciones culturales.');
    expect(a[2]!.texto).toContain('50.000,00 €');
  });

  it('reconoce títulos sin número en su propia línea', () => {
    const a = apartadosExtracto('OBJETO:\nAyudas para la escuela de música.\nPERSONAS BENEFICIARIAS:\nMenores empadronados.');
    expect(a.map((x) => x.tipo)).toEqual(['objeto', 'beneficiarios']);
  });

  it('sin apartados reconocibles, todo el texto en uno', () => {
    expect(apartadosExtracto('Se convocan ayudas para conciertos.')).toEqual([{ tipo: 'otros', texto: 'Se convocan ayudas para conciertos.' }]);
    expect(apartadosExtracto('')).toEqual([]);
  });
});

describe('datos de las bases por reglas', () => {
  const doc = (paginas: string[]): DocumentoTexto[] => [{ id: 7, nombre: 'bases.pdf', paginas }];

  it('importe por beneficiario y porcentaje, con la frase literal', () => {
    const d = datosBasicos(
      doc([
        'Primera. La dotación máxima de la convocatoria es de 150.000,00 euros.\n',
        'Quinta. La cuantía máxima por solicitante será de 8.000 euros. La ayuda no podrá superar el 70 % del presupuesto del proyecto. Hasta un 15 % podrá justificarse con gastos generales.',
      ]),
    );
    expect(d.find((x) => x.campo === 'importeMaximo')).toMatchObject({ valor: 8000, pagina: 2, texto: 'La cuantía máxima por solicitante será de 8.000 euros.' });
    expect(d.find((x) => x.campo === 'porcentajeMaximo')).toMatchObject({ valor: 70 });
  });

  it('el plazo es la frase que lo fija, no un título ni el plazo para resolver', () => {
    const d = datosBasicos(
      doc([
        '5. Plazo de presentación de solicitudes.\nEl plazo máximo para resolver será de tres meses desde el inicio del plazo de presentación de solicitudes.\nEl plazo de presentación de solicitudes será de veinte días hábiles desde la publicación del extracto.',
      ]),
    );
    expect(d.find((x) => x.campo === 'plazo')?.texto).toBe(
      'El plazo de presentación de solicitudes será de veinte días hábiles desde la publicación del extracto.',
    );
  });

  it('en las bases reales cada frase aparece tal cual en su página', () => {
    const d = datosBasicos([bases]);
    expect(d.length).toBeGreaterThan(0);
    for (const x of d) expect(normalizarCita(bases.paginas[x.pagina - 1]!)).toContain(normalizarCita(x.texto));
  });

  it('ficha básica con el extracto más reciente', () => {
    const anuncio = (fecha: string, texto: string) => ({ titulo: 't', diario: 'BOP', fecha, url: null, texto });
    const f = fichaBasica([anuncio('2026-01-01', 'Antiguo'), anuncio('2026-02-01', 'Corrección'), anuncio('2026-03-01', '')], []);
    expect(f.extracto?.apartados[0]?.texto).toBe('Corrección');
    expect(fichaBasica([], []).extracto).toBeNull();
  });
});
