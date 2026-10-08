import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Convocatoria, Perfil } from './tipos.js';

// Para el MVP basta SQLite: guardamos cada convocatoria como JSON y filtramos en
// memoria (son miles de filas, no millones). Cuando haya usuarios múltiples se
// migrará a PostgreSQL.

export class Repositorio {
  private readonly db: DatabaseSync;

  constructor(ruta: string) {
    if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true });
    this.db = new DatabaseSync(ruta);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS convocatorias (
        id TEXT PRIMARY KEY,
        datos TEXT NOT NULL,
        vista_por_primera_vez TEXT NOT NULL,
        fecha_publicacion TEXT
      );
      CREATE TABLE IF NOT EXISTS perfil (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        datos TEXT NOT NULL
      );
    `);
  }

  /** Inserta o actualiza. Conserva la fecha en que se vio por primera vez. Devuelve true si es nueva. */
  guardarConvocatoria(c: Convocatoria): boolean {
    const previa = this.db
      .prepare('SELECT vista_por_primera_vez FROM convocatorias WHERE id = ?')
      .get(c.id) as { vista_por_primera_vez: string } | undefined;
    const guardada: Convocatoria = previa
      ? { ...c, vistaPorPrimeraVez: previa.vista_por_primera_vez }
      : c;
    this.db
      .prepare(
        `INSERT INTO convocatorias (id, datos, vista_por_primera_vez, fecha_publicacion)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET datos = excluded.datos, fecha_publicacion = excluded.fecha_publicacion`,
      )
      .run(guardada.id, JSON.stringify(guardada), guardada.vistaPorPrimeraVez, guardada.fechaPublicacion);
    return !previa;
  }

  listarConvocatorias(): Convocatoria[] {
    const filas = this.db
      .prepare('SELECT datos FROM convocatorias ORDER BY fecha_publicacion DESC NULLS LAST, id')
      .all() as { datos: string }[];
    return filas.map((f) => JSON.parse(f.datos) as Convocatoria);
  }

  obtenerConvocatoria(id: string): Convocatoria | null {
    const fila = this.db.prepare('SELECT datos FROM convocatorias WHERE id = ?').get(id) as
      | { datos: string }
      | undefined;
    return fila ? (JSON.parse(fila.datos) as Convocatoria) : null;
  }

  obtenerPerfil(): Perfil | null {
    const fila = this.db.prepare('SELECT datos FROM perfil WHERE id = 1').get() as
      | { datos: string }
      | undefined;
    return fila ? (JSON.parse(fila.datos) as Perfil) : null;
  }

  guardarPerfil(perfil: Perfil): void {
    this.db
      .prepare(
        'INSERT INTO perfil (id, datos) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET datos = excluded.datos',
      )
      .run(JSON.stringify(perfil));
  }

  cerrar() {
    this.db.close();
  }
}
