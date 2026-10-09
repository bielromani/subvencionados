// Escribe docs/evaluacion-clasificador.md con las métricas del clasificador en cada muestra
// etiquetada de test/evaluacion/ (muestraX.json + etiquetasX.json).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type ElementoMuestra, type Etiqueta, evaluar, UNIVERSO_2024_2025 } from '../evaluacion.js';

const dir = new URL('../../test/evaluacion/', import.meta.url);
const leer = <T>(f: string) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as T;
const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')} %`;

const MUESTRAS: [nombre: string, muestra: string, etiquetas: string, nota: string][] = [
  ['Muestra 1 (ajuste)', 'muestra.json', 'etiquetas.json', 'Usada para corregir el clasificador: sus cifras son optimistas.'],
  ['Muestra 2 (validación)', 'muestra-validacion.json', 'etiquetas-validacion.json', 'Independiente: no se usó para ajustar. Es la cifra fiable.'],
];

const secciones: string[] = [];
for (const [nombre, fm, fe, nota] of MUESTRAS) {
  if (!existsSync(new URL(fm, dir)) || !existsSync(new URL(fe, dir))) continue;
  const etiquetas = leer<Etiqueta[]>(fe);
  const r = evaluar(leer<ElementoMuestra[]>(fm), etiquetas, UNIVERSO_2024_2025);
  secciones.push(
    [
      `### ${nombre}`,
      '',
      `${nota} ${etiquetas.length} convocatorias etiquetadas (${etiquetas.filter((e) => e.musical === null).length} dudosas, excluidas).`,
      '',
      '| Métrica | Valor |',
      '|---|---:|',
      `| Precisión (lo que marca como música, lo es) | ${pct(r.precision)} |`,
      `| Cobertura (de lo que es música, lo encuentra) | ${pct(r.cobertura)} |`,
      `| Cobertura de lo compatible con jazz, clásica u ópera | ${pct(r.coberturaCompatibles)} |`,
      `| Acierto al decidir si es compatible | ${pct(r.aciertoCompatibilidad)} |`,
      '',
      r.errores.length ? 'Errores que quedan:' : 'Sin errores.',
      '',
      ...r.errores.map((e) => `- ${e.codigo}: se esperaba «${e.esperado}» y sale «${e.obtenido}». ${e.titulo.slice(0, 140)}${e.nota ? ` (${e.nota})` : ''}`),
      '',
    ].join('\n'),
  );
}

const ruta = fileURLToPath(new URL('../../../docs/evaluacion-clasificador.md', import.meta.url));
const plantilla = readFileSync(ruta, 'utf8');
const marca = '<!-- resultados -->';
writeFileSync(ruta, `${plantilla.slice(0, plantilla.indexOf(marca) + marca.length)}\n\n${secciones.join('\n')}`);
console.log(`Escrito ${ruta}`);
