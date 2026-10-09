// Almacén en ficheros de lo descargado de la BDNS: datos/bdns/convocatorias/AAAA.json
// (un registro por línea, para que los cambios diarios se vean bien en git) y
// datos/bdns/estado.json con lo que queda pendiente de descargar.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { RegistroBdns } from './normalizar.js';

export interface EstadoRecoleccion {
  /** Fecha (aaaa-mm-dd) hasta la que se han buscado convocatorias. */
  descubiertoHasta: string | null;
  /** Convocatorias encontradas cuyo detalle aún no se ha descargado. */
  pendientes: string[];
  ultimaEjecucion: string | null;
}

const ESTADO_INICIAL: EstadoRecoleccion = { descubiertoHasta: null, pendientes: [], ultimaEjecucion: null };

const codigoDe = (r: RegistroBdns) => r.detalle.codigoBDNS ?? String(r.detalle.id);
const anioDe = (r: RegistroBdns) => /^(\d{4})/.exec(r.detalle.fechaRecepcion ?? '')?.[1] ?? 'sin-fecha';

export class Almacen {
  readonly registros = new Map<string, RegistroBdns>();
  estado: EstadoRecoleccion;

  constructor(private readonly raiz: string) {
    const dir = join(raiz, 'convocatorias');
    if (existsSync(dir)) {
      for (const fichero of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
        for (const r of JSON.parse(readFileSync(join(dir, fichero), 'utf8')) as RegistroBdns[]) {
          this.registros.set(codigoDe(r), r);
        }
      }
    }
    const rutaEstado = join(raiz, 'estado.json');
    this.estado = existsSync(rutaEstado)
      ? { ...ESTADO_INICIAL, ...(JSON.parse(readFileSync(rutaEstado, 'utf8')) as EstadoRecoleccion) }
      : { ...ESTADO_INICIAL };
  }

  guardar(registro: RegistroBdns) {
    const codigo = codigoDe(registro);
    const previo = this.registros.get(codigo);
    // Al refrescar una convocatoria se conservan la fecha de primera descarga y los textos ya extraídos.
    this.registros.set(
      codigo,
      previo
        ? { ...registro, primeraDescarga: previo.primeraDescarga, textos: registro.textos ?? previo.textos }
        : registro,
    );
  }

  /** Guarda el texto de un documento y devuelve su ruta relativa a la raíz del almacén. */
  guardarTexto(registro: RegistroBdns, idDocumento: number, texto: string): string {
    // Comprimidos: las bases ocupan mucho y solo se leen de una en una.
    const relativa = posix.join('documentos', anioDe(registro), `${idDocumento}.txt.gz`);
    mkdirSync(join(this.raiz, 'documentos', anioDe(registro)), { recursive: true });
    writeFileSync(join(this.raiz, relativa), gzipSync(`${texto}\n`, { level: 9 }));
    return relativa;
  }

  leerTexto(relativa: string): string | null {
    const ruta = join(this.raiz, relativa);
    if (!existsSync(ruta)) return null;
    const contenido = readFileSync(ruta);
    return (relativa.endsWith('.gz') ? gunzipSync(contenido) : contenido).toString('utf8');
  }

  /** Escribe todos los ficheros. Solo reescribe los años con contenido distinto. */
  escribir() {
    const dir = join(this.raiz, 'convocatorias');
    mkdirSync(dir, { recursive: true });
    const porAnio = new Map<string, RegistroBdns[]>();
    for (const r of this.registros.values()) {
      const anio = anioDe(r);
      if (!porAnio.has(anio)) porAnio.set(anio, []);
      porAnio.get(anio)!.push(r);
    }
    for (const [anio, registros] of porAnio) {
      registros.sort((a, b) => codigoDe(a).localeCompare(codigoDe(b), 'es', { numeric: true }));
      const contenido = `[\n${registros.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`;
      const ruta = join(dir, `${anio}.json`);
      if (!existsSync(ruta) || readFileSync(ruta, 'utf8') !== contenido) writeFileSync(ruta, contenido);
    }
    writeFileSync(join(this.raiz, 'estado.json'), `${JSON.stringify(this.estado, null, 2)}\n`);
  }
}
