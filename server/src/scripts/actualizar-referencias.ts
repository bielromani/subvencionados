// Descarga el catálogo de entidades locales de la BDNS a datos/referencia/entidades-locales.json.
// El nomenclátor del INE (municipios-ine.json) lo genera el workflow referencias.yml.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClienteBdns } from '../bdns/cliente.js';
import type { BdnsNodoOrgano } from '../bdns/tipos.js';
import { config } from '../config.js';
import type { EntidadLocal } from '../referencias.js';

const nombre = (n: BdnsNodoOrgano) => n.descripcion?.trim() ?? '';

const arbol = await new ClienteBdns({ urlsBase: config.urlsBdns }).organos('L');
const entidades: EntidadLocal[] = [];
for (const provincia of arbol) {
  for (const entidad of provincia.children ?? []) {
    entidades.push({
      provincia: nombre(provincia),
      entidad: nombre(entidad),
      organos: (entidad.children ?? []).map(nombre).filter(Boolean),
    });
  }
}
entidades.sort((a, b) => a.provincia.localeCompare(b.provincia, 'es') || a.entidad.localeCompare(b.entidad, 'es'));
if (entidades.length < 5000) throw new Error(`Catálogo sospechosamente pequeño: ${entidades.length} entidades`);

const dir = join(config.rutaDatos, 'referencia');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'entidades-locales.json'), `[\n${entidades.map((e) => JSON.stringify(e)).join(',\n')}\n]\n`);
console.log(`${entidades.length} entidades locales en ${arbol.length} provincias`);
