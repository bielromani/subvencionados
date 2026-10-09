// Saca de la BDNS una muestra reproducible de títulos para evaluar el clasificador:
// 150 que el clasificador acepta como música, 100 rechazados al azar y 50 rechazados
// "difíciles" (con palabras cercanas a la música). Escribe test/evaluacion/muestra.json
// para etiquetarla a mano.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClienteBdns, FINALIDAD_CULTURA } from '../bdns/cliente.js';
import { TERMINOS } from '../bdns/recolector.js';
import type { BdnsResultadoBusqueda } from '../bdns/tipos.js';
import { clasificar, normalizar } from '../clasificacion/musica.js';
import { config } from '../config.js';

const cliente = new ClienteBdns({ urlsBase: config.urlsBdns });
const listado = new Map<string, BdnsResultadoBusqueda>();
for (const anio of [2024, 2025]) {
  const desde = new Date(anio, 0, 1);
  const hasta = new Date(anio, 11, 31);
  for (const r of await cliente.buscarTodas({ finalidad: FINALIDAD_CULTURA, fechaDesde: desde, fechaHasta: hasta })) {
    if (r.numeroConvocatoria) listado.set(r.numeroConvocatoria, r);
  }
  for (const termino of TERMINOS) {
    for (const r of await cliente.buscarTodas({ texto: termino, fechaDesde: desde, fechaHasta: hasta })) {
      if (r.numeroConvocatoria) listado.set(r.numeroConvocatoria, r);
    }
  }
}

// Generador pseudoaleatorio con semilla fija: la muestra es reproducible.
let semilla = 20261009;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const barajar = <T>(xs: T[]) => xs.map((x) => [azar(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

const titulo = (r: BdnsResultadoBusqueda) => [r.descripcion, r.descripcionLeng].filter(Boolean).join('\n');
const todos = [...listado.values()].sort((a, b) => a.numeroConvocatoria!.localeCompare(b.numeroConvocatoria!));
const aceptados = todos.filter((r) => clasificar({ texto: titulo(r) }).musical);
const rechazados = todos.filter((r) => !clasificar({ texto: titulo(r) }).musical);
const DIFICIL = /\b(banda|bandas|coro|cor|fiesta|fiestas|festival|festivales|cultural|culturales|escenic|espectacul|danza|teatro|artistic|charanga|txaranga|tamborrada|cofradia|semana santa)\b/;
const dificiles = rechazados.filter((r) => DIFICIL.test(normalizar(titulo(r))));

const muestra = [
  ...barajar(aceptados).slice(0, 150).map((r) => ({ r, estrato: 'aceptado' })),
  ...barajar(rechazados).slice(0, 100).map((r) => ({ r, estrato: 'rechazado' })),
  ...barajar(dificiles).slice(0, 50).map((r) => ({ r, estrato: 'rechazado-dificil' })),
];
const salida = [...new Map(muestra.map((m) => [m.r.numeroConvocatoria, m])).values()].map(({ r, estrato }) => ({
  codigo: r.numeroConvocatoria,
  estrato,
  titulo: r.descripcion,
  tituloLengua: r.descripcionLeng ?? null,
  organo: [r.nivel1, r.nivel2, r.nivel3].filter(Boolean).join(' > '),
  fecha: r.fechaRecepcion,
}));

const ruta = fileURLToPath(new URL('../../test/evaluacion/muestra.json', import.meta.url));
mkdirSync(dirname(ruta), { recursive: true });
writeFileSync(ruta, `[\n${salida.map((x) => JSON.stringify(x)).join(',\n')}\n]\n`);
console.log(
  `${todos.length} convocatorias en los listados de 2024-2025: ${aceptados.length} aceptadas, ` +
    `${rechazados.length} rechazadas (${dificiles.length} difíciles). Muestra: ${salida.length} en ${ruta}`,
);
