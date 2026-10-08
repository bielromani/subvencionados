// Carga los ejemplos de src/data/demo.ts en la base de datos local.
import { config } from '../config.js';
import { convocatoriasDemo } from '../data/demo.js';
import { Repositorio } from '../db.js';

const repo = new Repositorio(config.rutaDb);
const demo = convocatoriasDemo();
for (const c of demo) repo.guardarConvocatoria(c);
repo.cerrar();
console.log(`Cargadas ${demo.length} convocatorias de ejemplo en ${config.rutaDb}`);
