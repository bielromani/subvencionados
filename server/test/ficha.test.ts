import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { desdeBdns } from '../src/bdns/normalizar.js';
import type { FichaExtraida } from '../src/ficha/esquema.js';
import { ErrorFicha, extraerFicha, MAX_CARACTERES, textoParaModelo, type LlamadaModelo } from '../src/ficha/extractor.js';
import { fichaAlDia, seleccionarParaFicha } from '../src/ficha/fichas.js';
import { comprobarCita, comprobarFicha, normalizarCita, type DocumentoTexto } from '../src/ficha/verificar.js';
import { detalle, registro } from './ayudas.js';

// Bases reales del Palau Ressona 2026 (BDNS 928556), tal como las guarda el recolector.
const texto = gunzipSync(readFileSync(new URL('./fixtures/bases-1519395.txt.gz', import.meta.url))).toString('utf8');
const bases: DocumentoTexto = { id: 1519395, nombre: 'Bases2026_cast.pdf', paginas: texto.split('\f') };
const cita = (pagina: number, t: string) => ({ documento: 1519395, pagina, texto: t });

const vacio = { valor: null, cita: null };
/** Una ficha como la devolvería el modelo para estas bases, con algunos errores a propósito. */
function fichaModelo(): FichaExtraida {
  return {
    documentoEsBases: true,
    resumen: ['Concurso de música joven con final el 21 de noviembre.'],
    objeto: { valor: 'Concurso de música joven', cita: cita(1, 'convoca el Palau Ressona, XXI edición del Concurso de Música Joven') },
    beneficiarios: {
      valor: 'Grupos o solistas de 12 a 30 años',
      // Página equivocada: la cita está en la 1.
      cita: cita(2, 'Todos aquellos grupos o solistas jóvenes que tengan interés, independientemente de su lugar de residencia'),
    },
    plazos: {
      presentacion: {
        valor: 'Del 28 de septiembre al 25 de octubre, telemáticamente',
        // Cruza un salto de línea del PDF.
        cita: cita(3, 'La documentación deberá entregarse a partir del 28 de setiembre y hasta el domingo 25 de octubre'),
      },
      inicioPresentacion: vacio,
      finPresentacion: vacio,
      resolucion: vacio,
      ejecucion: { valor: 'Final el 21 de noviembre', cita: cita(4, 'Los conciertos se realizarán el día 21 de noviembre') },
      justificacion: vacio,
    },
    dinero: {
      presupuestoTotal: vacio,
      // Cifra que la cita no contiene: inventada.
      importeMaximo: { valor: 1500, cita: cita(4, 'Cada grupo dispondrá de 20 minutos de actuación') },
      porcentajeMaximo: vacio,
      pago: vacio,
      compatibilidad: vacio,
      minimis: vacio,
    },
    requisitos: [
      { texto: 'Repertorio de 20 minutos', cita: cita(1, 'tengan un repertorio suficiente de 20 minutos en el momento del concurso') },
      // Cita que no está en el documento.
      { texto: 'Estar empadronado', cita: cita(1, 'Los participantes deberán estar empadronados en el municipio') },
    ],
    gastosSubvencionables: [],
    gastosNoSubvencionables: [],
    criterios: [{ criterio: 'Musicalidad', puntosMaximos: null, cita: cita(4, 'la musicalidad, la originalidad, la proyección, la puesta en escena') }],
    documentacion: [{ texto: 'El rider técnico', cita: cita(3, '3. El rider técnico del grupo.') }],
    presentacion: {
      lugar: { valor: 'Telemáticamente', cita: null },
      url: { valor: 'https://palauplegamans.cat/inscripcio-palau-ressona', cita: cita(3, 'telemáticamente en https://palauplegamans.cat/inscripcio-palau-ressona') },
      certificadoDigital: vacio,
    },
    avisos: [],
  };
}

describe('comprobación de citas', () => {
  it('normaliza tildes, signos, saltos y guiones de corte', () => {
    expect(normalizarCita('«Ópera»   y\nzar-\nzuela, 6.000 €')).toBe('opera y zarzuela 6 000 €');
  });

  it('acepta la cita literal y corrige la página si está en otra', () => {
    const ok = comprobarCita(cita(1, 'Tengan un contrato discográfico'), [bases]);
    expect(ok).toMatchObject({ estado: 'verificada', pagina: 1 });
    const otraPagina = comprobarCita(cita(4, 'Tengan un contrato discográfico'), [bases]);
    expect(otraPagina).toMatchObject({ estado: 'verificada', pagina: 1 });
  });

  it('marca para revisar lo que no está en el documento o es demasiado corto', () => {
    expect(comprobarCita(cita(1, 'Premio de 3.000 euros al ganador'), [bases]).estado).toBe('revisar');
    expect(comprobarCita(cita(1, 'jóvenes'), [bases])).toMatchObject({ estado: 'revisar', motivo: 'Cita demasiado corta' });
  });

  it('una cifra tiene que aparecer en su cita, con o sin separadores', () => {
    const doc: DocumentoTexto = { id: 1, nombre: 'x', paginas: ['El importe máximo será de 6.000,00 euros por proyecto.'] };
    const c = { documento: 1, pagina: 1, texto: 'El importe máximo será de 6.000,00 euros por proyecto' };
    expect(comprobarCita(c, [doc], 6000).estado).toBe('verificada');
    expect(comprobarCita(c, [doc], 5000)).toMatchObject({ estado: 'revisar', motivo: 'La cifra no aparece en la cita' });
  });

  it('cuenta la ficha: verificadas, a revisar (inventadas, sin cita o con cifra falsa) y sin dato', () => {
    const { datos, citas } = comprobarFicha(fichaModelo(), [bases]);
    expect(datos.beneficiarios.cita).toMatchObject({ estado: 'verificada', pagina: 1 });
    expect(datos.plazos.presentacion.cita?.estado).toBe('verificada');
    expect(datos.dinero.importeMaximo.cita?.estado).toBe('revisar');
    expect(datos.requisitos[1]!.cita?.estado).toBe('revisar');
    expect(datos.presentacion.lugar).toMatchObject({ cita: null, sinCita: true });
    expect(datos.plazos.resolucion).toEqual({ valor: null, cita: null });
    expect(citas).toEqual({ verificadas: 8, revisar: 3, noConsta: 10 });
  });
});

describe('extracción', () => {
  const llamada =
    (datos: FichaExtraida | null, motivoFin = 'end_turn'): LlamadaModelo =>
    async () => ({ datos, modelo: 'claude-opus-5-5', motivoFin, entrada: 10_000, salida: 2_000 });

  it('marca documento y página en el texto que recibe el modelo', () => {
    const t = textoParaModelo([bases]);
    expect(t.startsWith('[[Documento 1519395: Bases2026_cast.pdf]]\n[[Página 1]]\nPALAU RESSONA')).toBe(true);
    expect(t).toContain('[[Página 7]]');
  });

  it('guarda la ficha comprobada con los documentos usados y el coste', async () => {
    const ficha = await extraerFicha('928556', [bases], llamada(fichaModelo()), { ahora: () => new Date('2026-10-09T12:00:00Z') });
    expect(ficha).toMatchObject({
      codigoBdns: '928556',
      generada: '2026-10-09T12:00:00.000Z',
      citas: { verificadas: 8, revisar: 3, noConsta: 10 },
      uso: { entrada: 10_000, salida: 2_000, costeUsd: 0.08 },
    });
    expect(ficha.documentos).toEqual([{ id: 1519395, nombre: 'Bases2026_cast.pdf', paginas: 7, huella: expect.any(String) }]);
    expect(fichaAlDia(ficha, [bases])).toBe(true);
    expect(fichaAlDia(ficha, [{ ...bases, paginas: [...bases.paginas, 'Corrección de errores'] }])).toBe(false);
    expect(fichaAlDia({ ...ficha, version: 0 }, [bases])).toBe(false);
  });

  it('no recorta documentos enormes ni acepta respuestas sin ficha', async () => {
    const enorme: DocumentoTexto = { id: 1, nombre: 'x', paginas: ['a'.repeat(MAX_CARACTERES + 1)] };
    await expect(extraerFicha('1', [enorme], llamada(fichaModelo()))).rejects.toThrow(ErrorFicha);
    await expect(extraerFicha('1', [bases], llamada(null, 'refusal'))).rejects.toThrow('refusal');
  });
});

describe('selección de convocatorias para ficha', () => {
  const hoy = new Date('2026-10-08T10:00:00Z');
  const conTexto = (codigo: string, cambios: Parameters<typeof detalle>[1]) => {
    const c = desdeBdns(registro(detalle(codigo, cambios)));
    return { ...c, documentos: [{ id: 1, nombre: 'Bases.pdf', descripcion: null, fecha: null, bytes: null, url: '', texto: { paginas: 1, caracteres: 10, archivo: 'x' } }] };
  };

  it('prioriza los concursos abiertos que cierran antes y deja fuera la formación y lo que no tiene texto', () => {
    const abiertaTarde = conTexto('1', { descripcion: 'Ayudas a festivales de jazz', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-12-01' });
    const abiertaPronto = conTexto('2', { descripcion: 'Ayudas a la música en vivo', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-10-20' });
    const proxima = conTexto('3', { descripcion: 'Ayudas a giras de música clásica', fechaInicioSolicitud: '2026-11-01', fechaFinSolicitud: '2026-11-30' });
    const becas = conTexto('4', { descripcion: 'Becas de formación musical', fechaInicioSolicitud: '2026-10-01', fechaFinSolicitud: '2026-10-30' });
    const sinTexto = { ...conTexto('5', { descripcion: 'Ayudas a la ópera', fechaFinSolicitud: '2026-10-30' }), documentos: [] };
    const orden = seleccionarParaFicha([abiertaTarde, proxima, becas, sinTexto, abiertaPronto], hoy).map((s) => [s.convocatoria.codigoBdns, s.motivo]);
    expect(orden).toEqual([
      ['2', 'abierta'],
      ['1', 'abierta'],
      ['3', 'proxima'],
    ]);
  });
});
