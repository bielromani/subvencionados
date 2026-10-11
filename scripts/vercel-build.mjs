// Construye la web para Vercel con la Build Output API (https://vercel.com/docs/build-output-api):
// - static/: la web (web/dist).
// - functions/api.func/: la API empaquetada en un fichero, con la base de datos y los datos que lee.
// Toda respuesta lleva X-Robots-Tag: noindex (la web no debe salir en buscadores de momento).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const raiz = new URL('..', import.meta.url).pathname;
const salida = join(raiz, '.vercel/output');
const funcion = join(salida, 'functions/api.func');
const rutaDb = join(raiz, 'server/.data/vercel.db');
const sh = (cmd, env = {}) => execSync(cmd, { cwd: raiz, stdio: 'inherit', env: { ...process.env, ...env } });

rmSync(salida, { recursive: true, force: true });
rmSync(rutaDb, { force: true });

// 1. Base de datos desde datos/bdns (la misma importación que en local).
sh('npm run importar', { SUBV_DB: rutaDb });
sh(`node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync(process.argv[1]).exec('VACUUM')" ${rutaDb}`);

// 2. Web.
sh('npm run build -w web');
cpSync(join(raiz, 'web/dist'), join(salida, 'static'), { recursive: true });

// 3. API en un solo fichero ESM.
await build({
  entryPoints: [join(raiz, 'server/src/vercel.ts')],
  outfile: join(funcion, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Express es CommonJS: en un paquete ESM necesita require.
  banner: { js: "import { createRequire as __crearRequire } from 'node:module'; const require = __crearRequire(import.meta.url);" },
});
writeFileSync(
  join(funcion, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: true, maxDuration: 60 }, null, 2),
);

// 4. Datos que lee la API.
cpSync(rutaDb, join(funcion, 'subvencionados.db'));
const datos = join(funcion, 'datos');
for (const d of ['fichas', 'contratos', 'bdns/documentos']) {
  if (existsSync(join(raiz, 'datos', d))) cpSync(join(raiz, 'datos', d), join(datos, d), { recursive: true });
}
mkdirSync(join(datos, 'directorio'), { recursive: true });
for (const f of ['ayuntamientos.csv', 'cultura.csv']) cpSync(join(raiz, 'datos/directorio', f), join(datos, 'directorio', f));

// 5. Rutas: /api/* a la función, el resto a la web; noindex en todo.
writeFileSync(
  join(salida, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: { 'X-Robots-Tag': 'noindex, nofollow' }, continue: true },
        { src: '/api/(.*)', dest: '/api' },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

const tamano = (ruta) =>
  statSync(ruta).isDirectory() ? readdirSync(ruta).reduce((t, f) => t + tamano(join(ruta, f)), 0) : statSync(ruta).size;
console.log(`Función de la API: ${(tamano(funcion) / 1e6).toFixed(0)} MB (límite de Vercel: 250 MB)`);
