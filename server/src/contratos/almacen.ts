import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Contrato } from './placsp.js';

/**
 * Contratos guardados en datos/contratos/AAAA.json (un contrato por línea, para que git guarde bien los cambios).
 * El año es el de la primera vez que se vio el contrato y no cambia aunque se actualice después.
 */
export interface EstadoContratos {
  /** Última fecha de actualización leída de cada fuente (ATOM diario). */
  fuentes: Record<string, string>;
  /** Ficheros históricos ya procesados (p. ej. "licitaciones_2025"). */
  historicos: string[];
}

export class AlmacenContratos {
  readonly contratos = new Map<string, Contrato & { anio: number }>();
  estado: EstadoContratos = { fuentes: {}, historicos: [] };
  private cambiados = new Set<number>();

  constructor(private readonly raiz: string) {
    if (!existsSync(raiz)) return;
    for (const f of readdirSync(raiz).filter((x) => /^\d{4}\.json$/.test(x))) {
      const anio = Number(f.slice(0, 4));
      for (const c of JSON.parse(readFileSync(join(raiz, f), 'utf8')) as Contrato[]) this.contratos.set(c.id, { ...c, anio });
    }
    const estado = join(raiz, 'estado.json');
    if (existsSync(estado)) this.estado = JSON.parse(readFileSync(estado, 'utf8'));
  }

  /** Guarda el contrato si es nuevo o más reciente que el que había. Devuelve si cambió algo. */
  guardar(c: Contrato): boolean {
    const previo = this.contratos.get(c.id);
    if (previo && previo.actualizado >= c.actualizado) return false;
    const anio = previo?.anio ?? Number(c.actualizado.slice(0, 4));
    this.contratos.set(c.id, { ...c, anio });
    this.cambiados.add(anio);
    return true;
  }

  /** Sustituye un contrato ya guardado sin mirar la fecha (para limpiezas). */
  reescribir(c: Contrato & { anio: number }): void {
    this.contratos.set(c.id, c);
    this.cambiados.add(c.anio);
  }

  escribir(): void {
    mkdirSync(this.raiz, { recursive: true });
    for (const anio of this.cambiados) {
      const lista = [...this.contratos.values()]
        .filter((c) => c.anio === anio)
        .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
        .map(({ anio: _a, ...c }) => JSON.stringify(c));
      writeFileSync(join(this.raiz, `${anio}.json`), `[\n${lista.join(',\n')}\n]\n`);
    }
    this.cambiados.clear();
    writeFileSync(join(this.raiz, 'estado.json'), `${JSON.stringify(this.estado, null, 2)}\n`);
  }
}
