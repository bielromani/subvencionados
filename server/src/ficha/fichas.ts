// Fichas guardadas en datos/fichas/ (una por convocatoria, versionadas en git como el resto de datos)
// y selección de las convocatorias que merecen ficha.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { plazo } from '../emparejamiento.js';
import type { Convocatoria } from '../tipos.js';
import { VERSION_FICHA, type Ficha } from './esquema.js';
import { huella } from './extractor.js';
import type { DocumentoTexto } from './verificar.js';

export class AlmacenFichas {
  private existentes: Set<string> | null = null;

  constructor(private readonly raiz: string) {}

  /** Para los listados: se lee la carpeta una vez (las fichas llegan con git pull y reinicio). */
  tiene(codigo: string): boolean {
    this.existentes ??= new Set(this.codigos());
    return this.existentes.has(codigo);
  }

  private ruta(codigo: string) {
    return join(this.raiz, `${codigo}.json`);
  }

  leer(codigo: string): Ficha | null {
    const ruta = this.ruta(codigo);
    return existsSync(ruta) ? (JSON.parse(readFileSync(ruta, 'utf8')) as Ficha) : null;
  }

  guardar(ficha: Ficha) {
    mkdirSync(this.raiz, { recursive: true });
    writeFileSync(this.ruta(ficha.codigoBdns), `${JSON.stringify(ficha, null, 1)}\n`);
    this.existentes?.add(ficha.codigoBdns);
  }

  codigos(): string[] {
    if (!existsSync(this.raiz)) return [];
    return readdirSync(this.raiz)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5));
  }
}

/** Texto por páginas de los documentos de una convocatoria que tienen texto extraído. */
export function documentosConTexto(c: Convocatoria, leerTexto: (archivo: string) => string | null): DocumentoTexto[] {
  return c.documentos.flatMap((d) => {
    const texto = d.texto ? leerTexto(d.texto.archivo) : null;
    return texto ? [{ id: d.id, nombre: d.nombre, paginas: texto.split('\f') }] : [];
  });
}

/** Hay que (re)generar la ficha si no existe, cambió el esquema o cambió el texto de los documentos. */
export function fichaAlDia(ficha: Ficha | null, documentos: DocumentoTexto[]): boolean {
  if (!ficha || ficha.version !== VERSION_FICHA) return false;
  const actuales = documentos.map((d) => `${d.id}:${huella(d.paginas)}`).sort();
  const guardados = ficha.documentos.map((d) => `${d.id}:${d.huella}`).sort();
  return actuales.join() === guardados.join();
}

export type MotivoFicha = 'abierta' | 'proxima' | 'recurrente';

/**
 * Convocatorias que merecen ficha, por orden de prioridad: concursos de música compatibles o de cultura
 * general (sin los de formación) con el plazo abierto (los que cierran antes primero), por abrir, y
 * concursos recientes de series que se repiten (la próxima edición suele tener las mismas bases).
 */
export function seleccionarParaFicha(
  convocatorias: Convocatoria[],
  hoy = new Date(),
): { convocatoria: Convocatoria; motivo: MotivoFicha }[] {
  const haceUnAnio = new Date(hoy.getTime() - 400 * 86_400_000).toISOString().slice(0, 10);
  const candidatas = convocatorias.filter(
    (c) =>
      c.tipo === 'concurrencia' &&
      c.documentos.some((d) => d.texto) &&
      // Becas de estudio y escuelas de música no son para el promotor (se pueden pedir con --codigo).
      !c.clasificacion.lineas.includes('formacion') &&
      ((c.clasificacion.musical && c.clasificacion.estilosCompatibles.length > 0) || c.clasificacion.culturaGeneral),
  );
  const elegidas: { convocatoria: Convocatoria; motivo: MotivoFicha; orden: string }[] = [];
  for (const c of candidatas) {
    const p = plazo(c, hoy);
    if (p === 'abierta') elegidas.push({ convocatoria: c, motivo: 'abierta', orden: `0${c.fechaFinSolicitud ?? '9999'}` });
    else if (p === 'proxima') elegidas.push({ convocatoria: c, motivo: 'proxima', orden: `1${c.fechaInicioSolicitud ?? '9999'}` });
    else if (c.serie && c.serie.anios.length > 1 && (c.fechaPublicacion ?? '') >= haceUnAnio && c.clasificacion.musical) {
      elegidas.push({ convocatoria: c, motivo: 'recurrente', orden: `2${c.serie.proximaPrevista ?? '9999'}` });
    }
  }
  return elegidas.sort((a, b) => a.orden.localeCompare(b.orden)).map(({ convocatoria, motivo }) => ({ convocatoria, motivo }));
}
