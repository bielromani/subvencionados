// Descarga de la BDNS las convocatorias de música y sus concesiones a datos/bdns/.
//
//   npm run recolectar                          incremental (desde la última ejecución)
//   npm run recolectar -- --desde=2014-01-01    histórico completo
//   npm run recolectar -- --minutos=60          para a la hora y deja el resto pendiente

import { appendFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Almacen } from '../bdns/almacen.js';
import { ClienteBdns } from '../bdns/cliente.js';
import { desdeBdns } from '../bdns/normalizar.js';
import { recolectar, type ResultadoRecoleccion } from '../bdns/recolector.js';
import { Referencias } from '../referencias.js';
import { config } from '../config.js';
import { plazo } from '../emparejamiento.js';
import type { Convocatoria } from '../tipos.js';

const { values } = parseArgs({
  options: {
    desde: { type: 'string' },
    hasta: { type: 'string' },
    minutos: { type: 'string', default: '330' },
    'refrescar-dias': { type: 'string', default: '60' },
    'pausa-ms': { type: 'string', default: '400' },
  },
});

const almacen = new Almacen(config.rutaDatosBdns);

// Por defecto retoma una semana antes de lo último buscado (la BDNS registra con retraso).
let desde: Date;
if (values.desde) desde = new Date(values.desde);
else if (almacen.estado.descubiertoHasta) desde = new Date(Date.parse(almacen.estado.descubiertoHasta) - 7 * 86_400_000);
else desde = new Date('2014-01-01');
const hasta = values.hasta ? new Date(values.hasta) : new Date();

console.log(`Datos en ${config.rutaDatosBdns} (${almacen.registros.size} convocatorias ya descargadas)`);
console.log(`Buscando publicadas entre ${desde.toISOString().slice(0, 10)} y ${hasta.toISOString().slice(0, 10)}`);

const resultado = await recolectar({
  cliente: new ClienteBdns({ urlsBase: config.urlsBdns, pausaMs: Number(values['pausa-ms']) }),
  almacen,
  desde,
  hasta,
  limiteMs: Number(values.minutos) * 60_000,
  refrescarDias: Number(values['refrescar-dias']),
});

const referencias = Referencias.cargar(config.rutaDatos);
const resumen = resumir([...almacen.registros.values()].map((r) => desdeBdns(r, referencias)), resultado);
console.log(`\n${resumen}`);
// En GitHub Actions, el resumen aparece en la página de la ejecución y las cifras
// sirven al workflow para decidir si relanzarse.
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${resumen}\n`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `nuevas=${resultado.nuevas}\npendientes=${resultado.pendientes}\n`);
}

function contar(valores: string[]): [string, number][] {
  const cuenta = new Map<string, number>();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
}

function tabla(titulo: string, filas: [string, number][]): string {
  return [`| ${titulo} | Convocatorias |`, '|---|---:|', ...filas.map(([k, n]) => `| ${k} | ${n} |`)].join('\n');
}

function resumir(todas: Convocatoria[], r: ResultadoRecoleccion): string {
  const musicales = todas.filter((c) => c.clasificacion.musical);
  const objetivo = musicales.filter((c) => c.clasificacion.estilosCompatibles.length > 0);
  const euros = (n: number) => `${Math.round(n).toLocaleString('es-ES')} €`;
  const porAnio = contar(musicales.map((c) => c.fechaPublicacion?.slice(0, 4) ?? 'sin fecha')).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const ambito = (c: Convocatoria) => (c.ambitoNacional ? ['Sin restricción'] : c.ccaa.length ? c.ccaa : ['No indicado']);
  return [
    '## Recolección BDNS',
    '',
    `- Esta ejecución: ${r.descubiertas} con título musical, ${r.nuevas} nuevas, ${r.refrescadas} refrescadas, ${r.fallidas.length} fallidas.`,
    `- Pendientes para la próxima ejecución: ${r.pendientes}${r.completada ? ' (al día)' : ''}.`,
    `- Total guardadas: ${todas.length} · de música: ${musicales.length} · compatibles con jazz, clásica u ópera: ${objetivo.length}.`,
    `- Concursos abiertos hoy: ${objetivo.filter((c) => plazo(c) === 'abierta').length} · por abrir: ${objetivo.filter((c) => plazo(c) === 'proxima').length}.`,
    `- Importe concedido registrado en las compatibles: ${euros(objetivo.reduce((t, c) => t + (c.concesiones?.importeTotal ?? 0), 0))}.`,
    '',
    tabla('Año', porAnio),
    '',
    tabla('Estilo compatible', contar(musicales.flatMap((c) => c.clasificacion.estilosCompatibles))),
    '',
    tabla('Administración (compatibles)', contar(objetivo.map((c) => c.administracion))),
    '',
    tabla('Tipo (compatibles)', contar(objetivo.map((c) => c.tipo))),
    '',
    tabla('Comunidad (compatibles)', contar(objetivo.flatMap(ambito))),
  ].join('\n');
}
