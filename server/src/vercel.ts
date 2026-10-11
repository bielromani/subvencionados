// Punto de entrada de la web publicada en Vercel (lo empaqueta scripts/vercel-build.mjs).
// La base de datos y los datos viajan junto a la función; la base se copia a /tmp porque el resto del disco es de
// solo lectura. Nada se guarda en el servidor: el perfil lo manda cada navegador (cabecera X-Perfil).
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { montarApp } from './servidor.js';

const aqui = (relativa: string) => fileURLToPath(new URL(relativa, import.meta.url));
const rutaDb = '/tmp/subvencionados.db';
if (!existsSync(rutaDb)) copyFileSync(aqui('./subvencionados.db'), rutaDb);

export default montarApp(rutaDb, aqui('./datos'));
