// Festivales de los directorios del sector (FestClásica, Redescena, REMA) → datos/festivales/directorios.json.
// Se ejecuta en GitHub Actions (el proxy de las sesiones de trabajo bloquea estas webs). Una petición por segundo.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import {
  enlacesFestclasica,
  enlacesRedescena,
  FESTCLASICA,
  type FestivalExterno,
  fichaFestclasica,
  fichaRedescena,
  fichaRema,
  miembrosRema,
  REDESCENA,
  REMA,
} from '../festivalesExternos.js';

const espera = () => new Promise((ok) => setTimeout(ok, 1000));
async function pagina(url: string): Promise<string | null> {
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; subvencionados)' }, signal: AbortSignal.timeout(60_000) });
      await espera();
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch {
      await espera();
    }
  }
  console.warn(`No se pudo leer ${url}`);
  return null;
}

const salida: FestivalExterno[] = [];

const lista = await pagina(FESTCLASICA);
for (const url of lista ? enlacesFestclasica(lista) : []) {
  const html = await pagina(url);
  const f = html && fichaFestclasica(html, url);
  if (f) salida.push(f);
}
console.log(`FestClásica: ${salida.length}`);

const antes = salida.length;
const vistos = new Set<string>();
for (let n = 1; n <= 20; n++) {
  const html = await pagina(`${REDESCENA}?pagina=${n}`);
  const nuevos = html ? enlacesRedescena(html).filter((u) => !vistos.has(u)) : [];
  if (!nuevos.length) break;
  for (const url of nuevos) {
    vistos.add(url);
    const ficha = await pagina(url);
    const f = ficha && fichaRedescena(ficha, url);
    if (f) salida.push(f);
  }
}
console.log(`Redescena (de música): ${salida.length - antes} de ${vistos.size}`);

const antesRema = salida.length;
const rema = await pagina(REMA);
for (const m of rema ? miembrosRema(rema) : []) {
  const html = await pagina(m.url);
  salida.push(html ? fichaRema(html, m) : fichaRema('', m));
}
console.log(`REMA (festivales de España): ${salida.length - antesRema}`);

if (!salida.length) throw new Error('No se ha leído ningún festival: no se sobrescribe el fichero.');
const dir = join(config.rutaDatos, 'festivales');
mkdirSync(dir, { recursive: true });
salida.sort((a, b) => a.directorio.localeCompare(b.directorio) || a.nombre.localeCompare(b.nombre, 'es'));
writeFileSync(join(dir, 'directorios.json'), `[\n${salida.map((f) => JSON.stringify(f)).join(',\n')}\n]\n`);
console.log(`Total: ${salida.length}`);
