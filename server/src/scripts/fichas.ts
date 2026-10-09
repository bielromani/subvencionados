// Fichas de las bases (datos/fichas/). La lectura la hace Claude en la sesión de trabajo, sin API de pago:
// este script prepara los textos y después importa lo extraído, validándolo y comprobando cada cita.
//
//   npm run fichas -- --simular                         qué convocatorias merecen ficha y cuáles faltan
//   npm run fichas -- --preparar=DIR --limite=10        deja en DIR el texto de las 10 primeras pendientes,
//                                                       las instrucciones y el esquema (lote.json lista el lote)
//   npm run fichas -- --preparar=DIR --codigo=928556    convocatorias concretas
//   npm run fichas -- --importar=DIR                    lee DIR/CODIGO.json, comprueba y guarda en datos/fichas/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { Almacen } from '../bdns/almacen.js';
import { desdeBdns } from '../bdns/normalizar.js';
import { config } from '../config.js';
import { construirFicha, esquemaJson, INSTRUCCIONES, MAX_CARACTERES, textoParaModelo } from '../ficha/extractor.js';
import { AlmacenFichas, documentosConTexto, fichaAlDia, seleccionarParaFicha } from '../ficha/fichas.js';
import { Referencias } from '../referencias.js';
import { calcularSeries } from '../series.js';

const { values } = parseArgs({
  options: {
    limite: { type: 'string', default: '10' },
    codigo: { type: 'string' },
    simular: { type: 'boolean', default: false },
    preparar: { type: 'string' },
    importar: { type: 'string' },
  },
});

const almacen = new Almacen(config.rutaDatosBdns);
const fichas = new AlmacenFichas(join(config.rutaDatos, 'fichas'));
const referencias = Referencias.cargar(config.rutaDatos) ?? undefined;
const normalizadas = [...almacen.registros.values()].map((r) => desdeBdns(r, referencias));
const series = calcularSeries(normalizadas);
const convocatorias = normalizadas.map((c) => ({ ...c, serie: series.get(c.id) ?? null }));
const porCodigo = new Map(convocatorias.map((c) => [c.codigoBdns, c]));
const leer = (archivo: string) => almacen.leerTexto(archivo);

interface EntradaLote {
  codigo: string;
  motivo: string;
  titulo: string;
  caracteres: number;
}

if (values.importar) {
  const dir = values.importar;
  const lote = JSON.parse(readFileSync(join(dir, 'lote.json'), 'utf8')) as EntradaLote[];
  let hechas = 0;
  let fallidas = 0;
  let sinHacer = 0;
  const total = { verificadas: 0, revisar: 0, noConsta: 0 };
  for (const { codigo } of lote) {
    const ruta = join(dir, `${codigo}.json`);
    const c = porCodigo.get(codigo);
    if (!existsSync(ruta) || !c) {
      sinHacer++;
      continue;
    }
    try {
      const ficha = construirFicha(codigo, documentosConTexto(c, leer), JSON.parse(readFileSync(ruta, 'utf8')));
      fichas.guardar(ficha);
      hechas++;
      for (const k of ['verificadas', 'revisar', 'noConsta'] as const) total[k] += ficha.citas[k];
      const { verificadas, revisar, noConsta } = ficha.citas;
      console.log(`  ${codigo}: ${verificadas} citas verificadas, ${revisar} a revisar, ${noConsta} sin dato`);
    } catch (e) {
      fallidas++;
      console.error(`  ${codigo}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(
    `Importadas ${hechas}, con errores ${fallidas}, sin hacer ${sinHacer}. Citas: ${total.verificadas} verificadas, ` +
      `${total.revisar} a revisar (${((100 * total.revisar) / Math.max(1, total.verificadas + total.revisar)).toFixed(1)} %), ` +
      `${total.noConsta} datos que no constan.`,
  );
  if (fallidas > 0) process.exitCode = 1;
} else {
  const codigos = values.codigo?.split(',').map((x) => x.trim());
  const seleccion = codigos
    ? convocatorias.filter((c) => codigos.includes(c.codigoBdns)).map((c) => ({ convocatoria: c, motivo: 'pedida' }))
    : seleccionarParaFicha(convocatorias);
  const pendientes = seleccion
    .map((s) => ({ ...s, documentos: documentosConTexto(s.convocatoria, leer) }))
    .filter((s) => s.documentos.length > 0 && (codigos || !fichaAlDia(fichas.leer(s.convocatoria.codigoBdns), s.documentos)));
  const lote = pendientes.slice(0, Number(values.limite)).map((s) => ({ ...s, texto: textoParaModelo(s.documentos) }));
  const largos = lote.filter((s) => s.texto.length > MAX_CARACTERES);
  const validos = lote.filter((s) => s.texto.length <= MAX_CARACTERES);
  console.log(
    `${seleccion.length} convocatorias merecen ficha; ${pendientes.length} pendientes; en este lote ${validos.length} ` +
      `(${validos.reduce((t, s) => t + s.texto.length, 0).toLocaleString('es-ES')} caracteres de bases).`,
  );
  for (const s of largos) console.warn(`  ${s.convocatoria.codigoBdns}: más de ${MAX_CARACTERES} caracteres, no se prepara`);

  if (values.preparar) {
    const dir = values.preparar;
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'instrucciones.md'),
      `${INSTRUCCIONES}\n\nPara cada CODIGO.txt, escribe CODIGO.json con un objeto que cumpla este esquema JSON ` +
        `(todos los campos son obligatorios; usa null cuando el documento no dé el dato):\n\n` +
        '```json\n' + JSON.stringify(esquemaJson(), null, 1) + '\n```\n',
    );
    const entradas: EntradaLote[] = validos.map((s) => {
      writeFileSync(join(dir, `${s.convocatoria.codigoBdns}.txt`), s.texto);
      return { codigo: s.convocatoria.codigoBdns, motivo: s.motivo, titulo: s.convocatoria.titulo, caracteres: s.texto.length };
    });
    writeFileSync(join(dir, 'lote.json'), JSON.stringify(entradas, null, 1));
    console.log(`Preparado en ${dir}: instrucciones.md, lote.json y ${entradas.length} textos.`);
  } else {
    for (const s of validos) console.log(`  ${s.convocatoria.codigoBdns} [${s.motivo}] ${s.convocatoria.titulo.slice(0, 90)}`);
  }
}
