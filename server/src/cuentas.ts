// Cuentas de usuario: email y contraseña, y la lista de cada uno (guardadas, ocultas, clientes y perfil) en Postgres
// (Neon, conectado desde Vercel con DATABASE_URL). Sin DATABASE_URL no hay cuentas y la web sigue guardando en el
// navegador. Las tablas se crean solas la primera vez.

import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';

const scrypt = promisify(scryptCb) as (clave: string, sal: Buffer, largo: number) => Promise<Buffer>;

export type FrecuenciaAvisos = 'diario' | 'semanal' | 'nunca';
export const FRECUENCIAS: FrecuenciaAvisos[] = ['diario', 'semanal', 'nunca'];

export interface Usuario {
  id: string;
  email: string;
  avisos: FrecuenciaAvisos;
  ultimoAviso: string | null;
  tokenCalendario: string;
}

/** Lo que cada usuario guarda: lo mismo que la web tenía en el navegador. */
export interface DatosLista {
  marcas: { guardadas: string[]; ocultas: string[]; clientes: Record<string, { nombre: string; estado: string; nota: string; actualizado: string; proxima?: string | null }> };
  perfil: unknown;
}

const ESQUEMA = `
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  clave text not null,
  avisos text not null default 'semanal',
  ultimo_aviso date,
  token_calendario text not null unique,
  creado timestamptz not null default now()
);
create table if not exists listas (
  usuario uuid primary key references usuarios(id) on delete cascade,
  datos jsonb not null,
  actualizado timestamptz not null default now()
);
create table if not exists sesiones (
  token text primary key,
  usuario uuid not null references usuarios(id) on delete cascade,
  caduca timestamptz not null
);
create table if not exists restablecer (
  token text primary key,
  usuario uuid not null references usuarios(id) on delete cascade,
  caduca timestamptz not null
);
`;

const aleatorio = () => randomBytes(32).toString('base64url');
/** En la base de datos solo va el resumen de los tokens: si se filtrara, no sirven para entrar. */
const resumen = (token: string) => createHash('sha256').update(token).digest('hex');

export async function cifrarClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(clave.normalize('NFKC'), sal, 64);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

export async function comprobarClave(clave: string, guardada: string): Promise<boolean> {
  const [tipo, sal, hash] = guardada.split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const calculado = await scrypt(clave.normalize('NFKC'), Buffer.from(sal, 'hex'), 64);
  const esperado = Buffer.from(hash, 'hex');
  return esperado.length === calculado.length && timingSafeEqual(calculado, esperado);
}

const DIAS_SESION = 365;

type FilaUsuario = { id: string; email: string; avisos: FrecuenciaAvisos; ultimo_aviso: Date | string | null; token_calendario: string };
const aUsuario = (f: FilaUsuario): Usuario => ({
  id: f.id,
  email: f.email,
  avisos: f.avisos,
  ultimoAviso: f.ultimo_aviso ? (typeof f.ultimo_aviso === 'string' ? f.ultimo_aviso : f.ultimo_aviso.toISOString()).slice(0, 10) : null,
  tokenCalendario: f.token_calendario,
});
const COLUMNAS = 'id, email, avisos, ultimo_aviso::text as ultimo_aviso, token_calendario';

export class AlmacenCuentas {
  private listo: Promise<void> | null = null;
  constructor(private readonly pool: pg.Pool) {}

  static desdeUrl(url: string): AlmacenCuentas {
    // Neon exige SSL; en local (localhost) no hace falta.
    const ssl = /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: true };
    return new AlmacenCuentas(new pg.Pool({ connectionString: url, ssl, max: 3, idleTimeoutMillis: 10_000 }));
  }

  private async q<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.listo ??= this.pool.query(ESQUEMA).then(() => undefined);
    await this.listo;
    return (await this.pool.query<T>(sql, params)).rows;
  }

  async crear(email: string, clave: string): Promise<Usuario | null> {
    const filas = await this.q<FilaUsuario>(
      `insert into usuarios (email, clave, token_calendario) values ($1, $2, $3) on conflict (email) do nothing returning ${COLUMNAS}`,
      [email, await cifrarClave(clave), aleatorio()],
    );
    return filas[0] ? aUsuario(filas[0]) : null;
  }

  async entrar(email: string, clave: string): Promise<Usuario | null> {
    const [f] = await this.q<FilaUsuario & { clave: string }>(`select ${COLUMNAS}, clave from usuarios where email = $1`, [email]);
    // Sin usuario se cifra igual, para no delatar por el tiempo de respuesta qué emails tienen cuenta.
    const ok = await comprobarClave(clave, f?.clave ?? `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`);
    return f && ok ? aUsuario(f) : null;
  }

  async abrirSesion(usuario: string): Promise<string> {
    const token = aleatorio();
    await this.q(`insert into sesiones (token, usuario, caduca) values ($1, $2, now() + interval '${DIAS_SESION} days')`, [resumen(token), usuario]);
    await this.q('delete from sesiones where caduca < now()');
    return token;
  }

  async deSesion(token: string): Promise<Usuario | null> {
    const [f] = await this.q<FilaUsuario>(
      `select u.id, u.email, u.avisos, u.ultimo_aviso::text as ultimo_aviso, u.token_calendario
       from sesiones s join usuarios u on u.id = s.usuario where s.token = $1 and s.caduca > now()`,
      [resumen(token)],
    );
    return f ? aUsuario(f) : null;
  }

  async cerrarSesion(token: string) {
    await this.q('delete from sesiones where token = $1', [resumen(token)]);
  }

  async leerLista(usuario: string): Promise<{ datos: DatosLista; actualizado: string } | null> {
    const [f] = await this.q<{ datos: DatosLista; actualizado: Date }>('select datos, actualizado from listas where usuario = $1', [usuario]);
    return f ? { datos: f.datos, actualizado: f.actualizado.toISOString() } : null;
  }

  async guardarLista(usuario: string, datos: DatosLista): Promise<string> {
    const [f] = await this.q<{ actualizado: Date }>(
      `insert into listas (usuario, datos, actualizado) values ($1, $2, now())
       on conflict (usuario) do update set datos = excluded.datos, actualizado = now() returning actualizado`,
      [usuario, JSON.stringify(datos)],
    );
    return f!.actualizado.toISOString();
  }

  async deCalendario(token: string): Promise<DatosLista | null> {
    const [f] = await this.q<{ datos: DatosLista }>('select l.datos from usuarios u join listas l on l.usuario = u.id where u.token_calendario = $1', [token]);
    return f?.datos ?? null;
  }

  async nuevoCalendario(usuario: string): Promise<string> {
    const token = aleatorio();
    await this.q('update usuarios set token_calendario = $2 where id = $1', [usuario, token]);
    return token;
  }

  async ajustar(usuario: string, avisos: FrecuenciaAvisos) {
    await this.q('update usuarios set avisos = $2 where id = $1', [usuario, avisos]);
  }

  async cambiarClave(usuario: string, clave: string) {
    await this.q('update usuarios set clave = $2 where id = $1', [usuario, await cifrarClave(clave)]);
    // Al cambiar la contraseña se cierran las demás sesiones.
    await this.q('delete from sesiones where usuario = $1', [usuario]);
  }

  async borrar(usuario: string) {
    await this.q('delete from usuarios where id = $1', [usuario]);
  }

  async pedirRestablecer(email: string): Promise<string | null> {
    const [f] = await this.q<{ id: string }>('select id from usuarios where email = $1', [email]);
    if (!f) return null;
    const token = aleatorio();
    await this.q("insert into restablecer (token, usuario, caduca) values ($1, $2, now() + interval '1 hour')", [resumen(token), f.id]);
    return token;
  }

  /** Usa el enlace de restablecer (una sola vez) y devuelve el usuario. */
  async usarRestablecer(token: string): Promise<string | null> {
    const [f] = await this.q<{ usuario: string }>('delete from restablecer where token = $1 and caduca > now() returning usuario', [resumen(token)]);
    await this.q('delete from restablecer where caduca < now()');
    return f?.usuario ?? null;
  }

  /** Usuarios a los que toca enviar el resumen hoy (diario: si no se envió hoy; semanal: si hace 7 días o más). */
  async paraAvisar(hoy: string): Promise<(Usuario & { datos: DatosLista | null })[]> {
    const filas = await this.q<FilaUsuario & { datos: DatosLista | null }>(
      `select u.id, u.email, u.avisos, u.ultimo_aviso::text as ultimo_aviso, u.token_calendario, l.datos
       from usuarios u left join listas l on l.usuario = u.id
       where (u.avisos = 'diario' and (u.ultimo_aviso is null or u.ultimo_aviso < $1::date))
          or (u.avisos = 'semanal' and (u.ultimo_aviso is null or u.ultimo_aviso <= $1::date - 7))`,
      [hoy],
    );
    return filas.map((f) => ({ ...aUsuario(f), datos: f.datos }));
  }

  async marcarAvisado(usuario: string, hoy: string) {
    await this.q('update usuarios set ultimo_aviso = $2 where id = $1', [usuario, hoy]);
  }

  async cerrar() {
    await this.pool.end();
  }
}
