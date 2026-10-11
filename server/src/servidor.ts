// Monta la app con los datos de disco: lo comparten el servidor local (index.ts) y la web publicada (vercel.ts).
import { join } from 'node:path';
import { crearApp } from './app.js';
import { leerTextoDocumento } from './bdns/almacen.js';
import { Contactos } from './contactos.js';
import { AlmacenContratos } from './contratos/almacen.js';
import { esDeMusica } from './contratos/placsp.js';
import { enriquecer } from './contratos/vista.js';
import { Repositorio } from './db.js';
import { AlmacenFichas } from './ficha/fichas.js';

export function montarApp(rutaDb: string, rutaDatos: string) {
  const repo = new Repositorio(rutaDb);
  const fichas = new AlmacenFichas(join(rutaDatos, 'fichas'));
  const contratos = [...new AlmacenContratos(join(rutaDatos, 'contratos')).contratos.values()]
    // El filtro se vuelve a aplicar al cargar: si se afina, no hace falta volver a descargar.
    .filter((c) => esDeMusica(c))
    .map(({ anio: _a, ...c }) => enriquecer(c));
  return crearApp(repo, {
    leerTexto: (relativa) => leerTextoDocumento(join(rutaDatos, 'bdns'), relativa),
    fichas: { leer: (codigo) => fichas.leer(codigo), tiene: (codigo) => fichas.tiene(codigo) },
    contratos,
    contactos: Contactos.cargar(rutaDatos),
  });
}
