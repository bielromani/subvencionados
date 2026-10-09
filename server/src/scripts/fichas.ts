// Genera con Claude las fichas de las convocatorias que lo merecen (abiertas, por abrir y recurrentes)
// y las guarda en datos/fichas/. Necesita ANTHROPIC_API_KEY (en GitHub Actions, el secreto del repositorio).
//
//   npm run fichas -- --simular                  qué convocatorias se procesarían y cuánto texto suman
//   npm run fichas -- --limite=5                 las 5 primeras pendientes
//   npm run fichas -- --codigo=934378,932065     convocatorias concretas
//   npm run fichas -- --presupuesto-usd=10       se para al gastar 10 $

import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { Almacen } from '../bdns/almacen.js';
import { desdeBdns } from '../bdns/normalizar.js';
import { config } from '../config.js';
import { ErrorFicha, extraerFicha, llamadaClaude, MAX_CARACTERES, textoParaModelo, type Esfuerzo } from '../ficha/extractor.js';
import { AlmacenFichas, documentosConTexto, fichaAlDia, seleccionarParaFicha } from '../ficha/fichas.js';
import { Referencias } from '../referencias.js';
import { calcularSeries } from '../series.js';

const { values } = parseArgs({
  options: {
    limite: { type: 'string', default: '5' },
    codigo: { type: 'string' },
    esfuerzo: { type: 'string', default: 'medium' },
    'presupuesto-usd': { type: 'string', default: '5' },
    simular: { type: 'boolean', default: false },
  },
});

const almacen = new Almacen(config.rutaDatosBdns);
const fichas = new AlmacenFichas(join(config.rutaDatos, 'fichas'));
const referencias = Referencias.cargar(config.rutaDatos) ?? undefined;
const normalizadas = [...almacen.registros.values()].map((r) => desdeBdns(r, referencias));
const series = calcularSeries(normalizadas);
const convocatorias = normalizadas.map((c) => ({ ...c, serie: series.get(c.id) ?? null }));
const leer = (archivo: string) => almacen.leerTexto(archivo);

const codigos = values.codigo?.split(',').map((x) => x.trim());
const seleccion = codigos
  ? convocatorias.filter((c) => codigos.includes(c.codigoBdns)).map((c) => ({ convocatoria: c, motivo: 'pedida' as const }))
  : seleccionarParaFicha(convocatorias);
const pendientes = seleccion
  .map((s) => ({ ...s, documentos: documentosConTexto(s.convocatoria, leer) }))
  .filter((s) => s.documentos.length > 0 && (codigos || !fichaAlDia(fichas.leer(s.convocatoria.codigoBdns), s.documentos)));

const limite = Number(values.limite);
const presupuesto = Number(values['presupuesto-usd']);
const lote = pendientes.slice(0, limite);
const caracteres = lote.reduce((t, s) => t + textoParaModelo(s.documentos).length, 0);
console.log(
  `${seleccion.length} convocatorias merecen ficha; ${pendientes.length} pendientes; ` +
    `en este lote ${lote.length} (${caracteres.toLocaleString('es-ES')} caracteres de bases).`,
);

const resumen: string[] = ['## Fichas', '', '| Código | Motivo | Citas verificadas | A revisar | No consta | Coste |', '|---|---|---:|---:|---:|---:|'];
let gastado = 0;
let hechas = 0;
let fallidas = 0;

if (values.simular) {
  for (const s of lote) console.log(`  ${s.convocatoria.codigoBdns} [${s.motivo}] ${s.convocatoria.titulo.slice(0, 90)}`);
} else {
  const llamar = llamadaClaude();
  for (const s of lote) {
    if (gastado >= presupuesto) {
      console.log(`Presupuesto de ${presupuesto} $ agotado: se para aquí.`);
      break;
    }
    const codigo = s.convocatoria.codigoBdns;
    try {
      const ficha = await extraerFicha(codigo, s.documentos, llamar, { esfuerzo: values.esfuerzo as Esfuerzo });
      fichas.guardar(ficha);
      gastado += ficha.uso.costeUsd;
      hechas++;
      const { verificadas, revisar, noConsta } = ficha.citas;
      console.log(`  ${codigo}: ${verificadas} citas verificadas, ${revisar} a revisar, ${noConsta} sin dato · ${ficha.uso.costeUsd} $`);
      resumen.push(`| ${codigo} | ${s.motivo} | ${verificadas} | ${revisar} | ${noConsta} | ${ficha.uso.costeUsd} $ |`);
    } catch (e) {
      fallidas++;
      const mensaje = e instanceof ErrorFicha ? e.message : String(e);
      console.error(`  ${codigo}: ${mensaje}`);
      resumen.push(`| ${codigo} | ${s.motivo} | — | — | — | error: ${mensaje.slice(0, 80)} |`);
    }
  }
  const media = hechas ? gastado / hechas : 0;
  const pie = [
    '',
    `Hechas ${hechas}, fallidas ${fallidas}. Gastado ${gastado.toFixed(2)} $ (media ${media.toFixed(3)} $ por ficha).`,
    `Pendientes después de este lote: ${pendientes.length - hechas}` +
      (media ? ` (unos ${((pendientes.length - hechas) * media).toFixed(0)} $ al ritmo actual).` : '.'),
    `Documentos de más de ${MAX_CARACTERES.toLocaleString('es-ES')} caracteres no se procesan.`,
  ];
  console.log(pie.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, [...resumen, ...pie, ''].join('\n'));
  if (fallidas > 0 && hechas === 0) process.exitCode = 1;
}
