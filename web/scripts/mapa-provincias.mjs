// Genera src/datos/provincias.json: el trazado SVG de cada provincia, ya proyectado y con Canarias en un
// recuadro abajo a la izquierda. Se ejecuta una vez (no hace falta en cada compilación):
//
//   npm pack es-atlas@0.6.0 && tar xzf es-atlas-0.6.0.tgz
//   node scripts/mapa-provincias.mjs package/es/provinces.json
//
// Límites: © Instituto Geográfico Nacional (CC BY 4.0), vía es-atlas (https://github.com/martgnz/es-atlas).
import { readFileSync, writeFileSync } from 'node:fs';

const topo = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { scale, translate } = topo.transform;

// Arcos de TopoJSON: coordenadas cuantizadas y en diferencias.
const arcos = topo.arcs.map((arco) => {
  let x = 0;
  let y = 0;
  return arco.map(([dx, dy]) => [(x += dx) * scale[0] + translate[0], (y += dy) * scale[1] + translate[1]]);
});
const arco = (i) => (i >= 0 ? arcos[i] : [...arcos[~i]].reverse());
const anillo = (indices) => indices.flatMap((i, n) => (n ? arco(i).slice(1) : arco(i)));

const CANARIAS = new Set(['35', '38']);
const COS = Math.cos((40 * Math.PI) / 180);
const ESCALA = 44;
// Canarias se desplaza junto a la península (recuadro abajo a la izquierda).
const proyectar = ([lon, lat], canarias) => {
  const [l, f] = canarias ? [lon + 7.7, lat + 6.5] : [lon, lat];
  return [(l + 10.9) * COS * ESCALA, (44.2 - f) * ESCALA];
};

// Gibraltar (54) viene en los datos del IGN pero no es una provincia.
const provincias = topo.objects.provinces.geometries.filter((g) => g.id !== '54').map((g) => {
  const canarias = CANARIAS.has(g.id);
  const poligonos = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  const d = poligonos
    .flatMap((anillos) => anillos.map(anillo))
    .map((puntos) => {
      const p = puntos.map((x) => proyectar(x, canarias).map((v) => Math.round(v * 10) / 10));
      // Sin puntos repetidos tras redondear.
      const unicos = p.filter((x, i) => !i || x[0] !== p[i - 1][0] || x[1] !== p[i - 1][1]);
      return `M${unicos.map((x) => x.join(',')).join('L')}Z`;
    })
    .join('');
  return { codigo: g.id, nombre: g.properties.name, d };
});

const todos = provincias.flatMap((p) => p.d.match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g).map((x) => x.split(',').map(Number)));
const ancho = Math.ceil(Math.max(...todos.map((x) => x[0])));
let alto = Math.ceil(Math.max(...todos.map((x) => x[1])));
// Recuadro de Canarias.
const c = provincias.filter((p) => CANARIAS.has(p.codigo)).flatMap((p) => p.d.match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g).map((x) => x.split(',').map(Number)));
const margen = 6;
const recuadro = [
  Math.min(...c.map((x) => x[0])) - margen,
  Math.min(...c.map((x) => x[1])) - margen,
  Math.max(...c.map((x) => x[0])) + margen,
  Math.max(...c.map((x) => x[1])) + margen,
].map(Math.round);
alto = Math.max(alto, recuadro[3] + 1);
writeFileSync(
  new URL('../src/datos/provincias.json', import.meta.url),
  JSON.stringify({ ancho, alto, recuadroCanarias: recuadro, provincias }),
);
console.log(`${provincias.length} provincias, ${ancho}×${alto}`);
