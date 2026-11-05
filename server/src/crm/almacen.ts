// Datos del CRM de cada cuenta en Postgres, y las reglas de las secuencias:
// - una sola secuencia activa por oportunidad y destinatario;
// - los plazos y las alertas de llamada cuentan desde el envío EFECTIVO (no desde la redacción ni la aprobación);
// - alerta de llamada tras el 2.º y el 4.º envío efectivo; tras el 5.º sin respuesta, la secuencia se archiva;
// - una respuesta, reunión, interés o rechazo detiene la secuencia; el opt-out se registra en la entidad y se respeta.

import type pg from 'pg';
import type { AlmacenCuentas } from '../cuentas.js';
import { generarCarta } from './plantillas.js';
import type { PropuestaPreparada } from './prospeccion.js';
import {
  AJUSTES_POR_DEFECTO,
  type AjustesCrm,
  type Entidad,
  type EntradaHistorial,
  type Espectaculo,
  type EstadoRelacion,
  type Mensaje,
  type Oportunidad,
  PASOS,
  PASOS_CON_LLAMADA,
  type Secuencia,
  type TipoHistorial,
} from './tipos.js';

const ESQUEMA = `
create table if not exists crm_ajustes (
  usuario uuid primary key references usuarios(id) on delete cascade,
  datos jsonb not null
);
create table if not exists crm_espectaculos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references usuarios(id) on delete cascade,
  datos jsonb not null,
  actualizado timestamptz not null default now()
);
create table if not exists crm_entidades (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references usuarios(id) on delete cascade,
  ref text,
  datos jsonb not null,
  estado_relacion text not null default 'nueva',
  no_contactar boolean not null default false,
  motivo_no_contactar text,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create unique index if not exists crm_entidades_ref on crm_entidades (usuario, ref) where ref is not null;
create table if not exists crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references usuarios(id) on delete cascade,
  entidad uuid not null references crm_entidades(id) on delete cascade,
  tipo text not null,
  ref text,
  titulo text not null,
  espectaculos uuid[] not null default '{}',
  certeza text not null default 'potencial',
  enlace_confirmacion text,
  estado text not null default 'abierta',
  notas text not null default '',
  creado timestamptz not null default now()
);
create table if not exists crm_secuencias (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references usuarios(id) on delete cascade,
  oportunidad uuid not null references crm_oportunidades(id) on delete cascade,
  entidad uuid not null references crm_entidades(id) on delete cascade,
  destinatario text not null,
  estado text not null default 'activa',
  motivo_cierre text,
  creado timestamptz not null default now(),
  cerrada timestamptz
);
create unique index if not exists crm_una_activa on crm_secuencias (oportunidad, lower(destinatario)) where estado in ('activa', 'pausada');
create table if not exists crm_mensajes (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references usuarios(id) on delete cascade,
  secuencia uuid not null references crm_secuencias(id) on delete cascade,
  paso int not null,
  asunto text not null,
  cuerpo text not null,
  estado text not null default 'borrador',
  disponible_desde date not null default current_date,
  programado_para timestamptz,
  enviado_en timestamptz,
  creado timestamptz not null default now()
);
create table if not exists crm_historial (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references usuarios(id) on delete cascade,
  entidad uuid not null references crm_entidades(id) on delete cascade,
  oportunidad uuid references crm_oportunidades(id) on delete set null,
  secuencia uuid references crm_secuencias(id) on delete set null,
  tipo text not null,
  texto text not null default '',
  fecha timestamptz not null default now(),
  vence date,
  hecho boolean not null default false
);
create index if not exists crm_historial_entidad on crm_historial (entidad, fecha desc);
create table if not exists crm_propuestas (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references usuarios(id) on delete cascade,
  ref text not null,
  datos jsonb not null,
  puntos real not null default 0,
  estado text not null default 'pendiente',
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create unique index if not exists crm_propuesta_pendiente on crm_propuestas (usuario, ref) where estado = 'pendiente';
create table if not exists crm_alertas_vistas (
  usuario uuid not null references usuarios(id) on delete cascade,
  entidad uuid not null references crm_entidades(id) on delete cascade,
  ref text not null,
  vista timestamptz not null default now(),
  primary key (usuario, entidad, ref)
);
`;

/** Error de regla de negocio: la API lo devuelve con su código (409 conflicto, 400 dato, 404 no existe). */
export class ErrorCrm extends Error {
  constructor(
    message: string,
    readonly estado: number,
    readonly detalle?: unknown,
  ) {
    super(message);
  }
}

const iso = (d: Date | string | null) => (d ? (typeof d === 'string' ? d : d.toISOString()) : null);
const dia = (d: Date | string | null) => (d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null);
const sumarDias = (fecha: Date, n: number) => new Date(fecha.getTime() + n * 86_400_000).toISOString().slice(0, 10);

type FilaEntidad = { id: string; ref: string | null; datos: Omit<Entidad, 'id' | 'ref' | 'estadoRelacion' | 'noContactar' | 'motivoNoContactar'>; estado_relacion: EstadoRelacion; no_contactar: boolean; motivo_no_contactar: string | null };
const aEntidad = (f: FilaEntidad): Entidad => ({ ...f.datos, id: f.id, ref: f.ref, estadoRelacion: f.estado_relacion, noContactar: f.no_contactar, motivoNoContactar: f.motivo_no_contactar });

type FilaOportunidad = { id: string; entidad: string; tipo: Oportunidad['tipo']; ref: string | null; titulo: string; espectaculos: string[]; certeza: Oportunidad['certeza']; enlace_confirmacion: string | null; estado: Oportunidad['estado']; notas: string; creado: Date };
const aOportunidad = (f: FilaOportunidad): Oportunidad => ({
  id: f.id,
  entidad: f.entidad,
  tipo: f.tipo,
  ref: f.ref,
  titulo: f.titulo,
  espectaculos: f.espectaculos,
  certeza: f.certeza,
  enlaceConfirmacion: f.enlace_confirmacion,
  estado: f.estado,
  notas: f.notas,
  creado: iso(f.creado)!,
});

type FilaSecuencia = { id: string; oportunidad: string; entidad: string; destinatario: string; estado: Secuencia['estado']; motivo_cierre: string | null; creado: Date; cerrada: Date | null };
const aSecuencia = (f: FilaSecuencia): Secuencia => ({
  id: f.id,
  oportunidad: f.oportunidad,
  entidad: f.entidad,
  destinatario: f.destinatario,
  estado: f.estado,
  motivoCierre: f.motivo_cierre,
  creado: iso(f.creado)!,
  cerrada: iso(f.cerrada),
});

type FilaMensaje = { id: string; secuencia: string; paso: number; asunto: string; cuerpo: string; estado: Mensaje['estado']; disponible_desde: Date | string; programado_para: Date | null; enviado_en: Date | null };
const aMensaje = (f: FilaMensaje): Mensaje => ({
  id: f.id,
  secuencia: f.secuencia,
  paso: f.paso,
  asunto: f.asunto,
  cuerpo: f.cuerpo,
  estado: f.estado,
  disponibleDesde: dia(f.disponible_desde)!,
  programadoPara: iso(f.programado_para),
  enviadoEn: iso(f.enviado_en),
});

type FilaHistorial = { id: string; entidad: string; oportunidad: string | null; secuencia: string | null; tipo: TipoHistorial; texto: string; fecha: Date; vence: Date | string | null; hecho: boolean };
const aHistorial = (f: FilaHistorial): EntradaHistorial => ({
  id: f.id,
  entidad: f.entidad,
  oportunidad: f.oportunidad,
  secuencia: f.secuencia,
  tipo: f.tipo,
  texto: f.texto,
  fecha: iso(f.fecha)!,
  vence: dia(f.vence),
  hecho: f.hecho,
});

/** Estados manuales que detienen la secuencia y en qué estado deja la relación. */
const DETIENEN: Partial<Record<TipoHistorial, EstadoRelacion>> = { respuesta: 'respondio', reunion: 'reunion', interesado: 'interesado', no_interesado: 'no_interesado' };
const RELACION_DE: Partial<Record<TipoHistorial, EstadoRelacion>> = { ...DETIENEN, llamada: 'llamada', recontactar: 'recontactar' };

type Q = <T extends pg.QueryResultRow>(sql: string, params?: unknown[]) => Promise<T[]>;

export class AlmacenCrm {
  private listo: Promise<void> | null = null;
  constructor(private readonly cuentas: AlmacenCuentas) {}

  private preparar() {
    this.listo ??= this.cuentas.preparar().then(() => this.cuentas.pool.query(ESQUEMA).then(() => undefined));
    return this.listo;
  }

  private async q<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.preparar();
    return (await this.cuentas.pool.query<T>(sql, params)).rows;
  }

  /** Varias operaciones juntas: o todas o ninguna. */
  private async transaccion<R>(fn: (q: Q) => Promise<R>): Promise<R> {
    await this.preparar();
    const c = await this.cuentas.pool.connect();
    try {
      await c.query('begin');
      const r = await fn(async (sql, params = []) => (await c.query(sql, params)).rows);
      await c.query('commit');
      return r;
    } catch (e) {
      await c.query('rollback');
      throw e;
    } finally {
      c.release();
    }
  }

  // ---------- Ajustes ----------

  async ajustes(u: string): Promise<AjustesCrm> {
    const [f] = await this.q<{ datos: AjustesCrm }>('select datos from crm_ajustes where usuario = $1', [u]);
    return { ...AJUSTES_POR_DEFECTO, ...f?.datos };
  }

  async guardarAjustes(u: string, a: AjustesCrm) {
    await this.q('insert into crm_ajustes (usuario, datos) values ($1, $2) on conflict (usuario) do update set datos = excluded.datos', [u, JSON.stringify(a)]);
  }

  // ---------- Catálogo ----------

  async espectaculos(u: string): Promise<Espectaculo[]> {
    const filas = await this.q<{ id: string; datos: Omit<Espectaculo, 'id'> }>('select id, datos from crm_espectaculos where usuario = $1 order by datos->>\'tipo\', datos->>\'nombre\'', [u]);
    return filas.map((f) => ({ ...f.datos, id: f.id }));
  }

  async guardarEspectaculo(u: string, e: Omit<Espectaculo, 'id'>, id?: string): Promise<string> {
    if (id) {
      const r = await this.q<{ id: string }>('update crm_espectaculos set datos = $3, actualizado = now() where id = $1 and usuario = $2 returning id', [id, u, JSON.stringify(e)]);
      if (!r[0]) throw new ErrorCrm('Espectáculo no encontrado', 404);
      return id;
    }
    const [f] = await this.q<{ id: string }>('insert into crm_espectaculos (usuario, datos) values ($1, $2) returning id', [u, JSON.stringify(e)]);
    return f!.id;
  }

  /**
   * Importa (o vuelve a importar) fichas de la web sin duplicar, por su origen. Si lo que dice la web ha cambiado desde
   * la última vez, se actualizan los campos de la web y la ficha vuelve a «pendiente» para revisarla; si no, se respeta
   * lo que haya editado el usuario. Las que ya no están en la web se marcan.
   */
  async importarCatalogo(u: string, items: Omit<Espectaculo, 'id'>[], prefijo: string) {
    const actuales = (await this.espectaculos(u)).filter((e) => e.origen?.startsWith(prefijo));
    const porOrigen = new Map(actuales.map((e) => [e.origen!, e]));
    const huella = (e: Omit<Espectaculo, 'id'>) => JSON.stringify([e.nombre, e.tipo, e.formato, e.requisitos, e.disponibilidad, e.enlace]);
    const cuenta = { nuevos: 0, actualizados: 0, retirados: 0, sinCambios: 0 };
    for (const item of items) {
      const h = huella(item);
      const ya = porOrigen.get(item.origen!);
      porOrigen.delete(item.origen!);
      if (!ya) {
        await this.guardarEspectaculo(u, { ...item, huellaWeb: h });
        cuenta.nuevos++;
      } else if (ya.huellaWeb !== h || ya.enWeb === false) {
        const { id, ...resto } = ya;
        await this.guardarEspectaculo(
          u,
          { ...resto, nombre: item.nombre, tipo: item.tipo, formato: item.formato, requisitos: item.requisitos || ya.requisitos, disponibilidad: item.disponibilidad, enlace: item.enlace, enWeb: true, estadoInfo: 'pendiente', huellaWeb: h },
          id,
        );
        cuenta.actualizados++;
      } else cuenta.sinCambios++;
    }
    for (const e of porOrigen.values()) {
      if (e.enWeb === false) continue;
      const { id, ...resto } = e;
      await this.guardarEspectaculo(u, { ...resto, enWeb: false, estadoInfo: 'pendiente' }, id);
      cuenta.retirados++;
    }
    return cuenta;
  }

  /** Cuentas que han importado fichas de una web (para revisar su vigencia cada día). */
  async usuariosConOrigen(prefijo: string): Promise<string[]> {
    return (await this.q<{ usuario: string }>("select distinct usuario from crm_espectaculos where datos->>'origen' like $1", [`${prefijo}%`])).map((f) => f.usuario);
  }

  async borrarEspectaculo(u: string, id: string) {
    await this.q('delete from crm_espectaculos where id = $1 and usuario = $2', [id, u]);
  }

  // ---------- Entidades ----------

  async entidades(u: string): Promise<Entidad[]> {
    return (await this.q<FilaEntidad>('select * from crm_entidades where usuario = $1 order by actualizado desc', [u])).map(aEntidad);
  }

  async entidad(u: string, id: string): Promise<Entidad> {
    const [f] = await this.q<FilaEntidad>('select * from crm_entidades where id = $1 and usuario = $2', [id, u]);
    if (!f) throw new ErrorCrm('Entidad no encontrada', 404);
    return aEntidad(f);
  }

  async entidadPorRef(u: string, ref: string): Promise<Entidad | null> {
    const [f] = await this.q<FilaEntidad>('select * from crm_entidades where ref = $1 and usuario = $2', [ref, u]);
    return f ? aEntidad(f) : null;
  }

  /** Crea la entidad (o la actualiza si ya existe con la misma referencia al directorio). */
  async guardarEntidad(u: string, e: Omit<Entidad, 'id' | 'estadoRelacion' | 'noContactar' | 'motivoNoContactar'>, id?: string): Promise<Entidad> {
    const { ref, ...datos } = e;
    if (id) {
      const [f] = await this.q<FilaEntidad>('update crm_entidades set datos = $3, ref = $4, actualizado = now() where id = $1 and usuario = $2 returning *', [id, u, JSON.stringify(datos), ref]);
      if (!f) throw new ErrorCrm('Entidad no encontrada', 404);
      return aEntidad(f);
    }
    if (ref) {
      const ya = await this.entidadPorRef(u, ref);
      if (ya) return this.guardarEntidad(u, e, ya.id);
    }
    const [f] = await this.q<FilaEntidad>('insert into crm_entidades (usuario, ref, datos) values ($1, $2, $3) returning *', [u, ref, JSON.stringify(datos)]);
    return aEntidad(f!);
  }

  async borrarEntidad(u: string, id: string) {
    await this.q('delete from crm_entidades where id = $1 and usuario = $2', [id, u]);
  }

  // ---------- Oportunidades ----------

  async oportunidades(u: string, entidad?: string): Promise<Oportunidad[]> {
    const filas = entidad
      ? await this.q<FilaOportunidad>('select * from crm_oportunidades where usuario = $1 and entidad = $2 order by creado desc', [u, entidad])
      : await this.q<FilaOportunidad>('select * from crm_oportunidades where usuario = $1 order by creado desc', [u]);
    return filas.map(aOportunidad);
  }

  async oportunidad(u: string, id: string): Promise<Oportunidad> {
    const [f] = await this.q<FilaOportunidad>('select * from crm_oportunidades where id = $1 and usuario = $2', [id, u]);
    if (!f) throw new ErrorCrm('Oportunidad no encontrada', 404);
    return aOportunidad(f);
  }

  async crearOportunidad(u: string, o: Omit<Oportunidad, 'id' | 'creado' | 'estado'>): Promise<Oportunidad> {
    await this.entidad(u, o.entidad);
    const [f] = await this.q<FilaOportunidad>(
      `insert into crm_oportunidades (usuario, entidad, tipo, ref, titulo, espectaculos, certeza, enlace_confirmacion, notas)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
      [u, o.entidad, o.tipo, o.ref, o.titulo, o.espectaculos, o.certeza, o.enlaceConfirmacion, o.notas],
    );
    return aOportunidad(f!);
  }

  async actualizarOportunidad(u: string, id: string, c: Partial<Pick<Oportunidad, 'certeza' | 'enlaceConfirmacion' | 'espectaculos' | 'estado' | 'notas' | 'titulo'>>) {
    const o = await this.oportunidad(u, id);
    // «Confirmada» solo con una confirmación oficial enlazada.
    const certeza = c.certeza ?? o.certeza;
    const enlace = c.enlaceConfirmacion !== undefined ? c.enlaceConfirmacion : o.enlaceConfirmacion;
    if (certeza === 'confirmada' && !enlace) throw new ErrorCrm('Para marcarla como «Financiación confirmada» enlaza la resolución o confirmación oficial', 400);
    const [f] = await this.q<FilaOportunidad>(
      'update crm_oportunidades set certeza = $3, enlace_confirmacion = $4, espectaculos = $5, estado = $6, notas = $7, titulo = $8 where id = $1 and usuario = $2 returning *',
      [id, u, certeza, enlace, c.espectaculos ?? o.espectaculos, c.estado ?? o.estado, c.notas ?? o.notas, c.titulo ?? o.titulo],
    );
    return aOportunidad(f!);
  }

  // ---------- Secuencias ----------

  async secuencias(u: string, filtro: { entidad?: string; estado?: string } = {}): Promise<Secuencia[]> {
    const condiciones = ['usuario = $1'];
    const params: unknown[] = [u];
    if (filtro.entidad) condiciones.push(`entidad = $${params.push(filtro.entidad)}`);
    if (filtro.estado) condiciones.push(`estado = $${params.push(filtro.estado)}`);
    return (await this.q<FilaSecuencia>(`select * from crm_secuencias where ${condiciones.join(' and ')} order by creado desc`, params)).map(aSecuencia);
  }

  /**
   * Abre la secuencia de una oportunidad con un destinatario y prepara el borrador de la primera carta.
   * - Nunca dos activas para la misma oportunidad y destinatario.
   * - Si la entidad ya tiene otra secuencia activa, no se abre sin una decisión del usuario: «sustituir» (cierra la
   *   anterior) o «nueva» (convivirán). «Esperar» es simplemente no abrirla todavía.
   */
  async abrirSecuencia(
    u: string,
    oportunidadId: string,
    destinatario: string,
    decision?: 'sustituir' | 'nueva',
    /** Primera carta ya redactada (propuestas preparadas) y, si el usuario ya la ha revisado, aprobada. */
    opciones: { carta?: { asunto: string; cuerpo: string }; aprobada?: boolean } = {},
  ): Promise<{ secuencia: Secuencia; mensaje: Mensaje }> {
    const o = await this.oportunidad(u, oportunidadId);
    const e = await this.entidad(u, o.entidad);
    if (e.noContactar) throw new ErrorCrm(`${e.nombre} pidió no recibir más comunicaciones${e.motivoNoContactar ? ` (${e.motivoNoContactar})` : ''}`, 409);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) throw new ErrorCrm('Falta un email válido del destinatario', 400);
    const activas = (await this.secuencias(u, { entidad: e.id })).filter((s) => s.estado === 'activa' || s.estado === 'pausada');
    const misma = activas.find((s) => s.oportunidad === o.id && s.destinatario.toLowerCase() === destinatario.toLowerCase());
    if (misma) throw new ErrorCrm('Ya hay una secuencia activa para esta oportunidad y este destinatario', 409, { secuencias: [misma] });
    if (activas.length && !decision) {
      throw new ErrorCrm(`${e.nombre} ya tiene ${activas.length === 1 ? 'una secuencia activa' : `${activas.length} secuencias activas`}: decide si esperar, sustituirla o iniciar otra`, 409, { conflicto: true, secuencias: activas });
    }
    const ajustes = await this.ajustes(u);
    const catalogo = await this.espectaculos(u);
    const carta =
      opciones.carta ??
      generarCarta({
        paso: 1,
        entidad: e,
        oportunidad: o,
        espectaculos: catalogo.filter((x) => o.espectaculos.includes(x.id)),
        ayuda: o.tipo === 'subvencion' ? { titulo: o.titulo, enlace: null } : null,
        ajustes,
      });
    return this.transaccion(async (q) => {
      if (decision === 'sustituir') {
        for (const s of activas) await this.cerrarSecuencia(q, s.id, 'sustituida', 'Sustituida por una propuesta nueva');
      }
      const [s] = await q<FilaSecuencia>('insert into crm_secuencias (usuario, oportunidad, entidad, destinatario) values ($1, $2, $3, $4) returning *', [u, o.id, e.id, destinatario.trim()]);
      const [m] = await q<FilaMensaje>('insert into crm_mensajes (usuario, secuencia, paso, asunto, cuerpo, estado) values ($1, $2, 1, $3, $4, $5) returning *', [
        u,
        s!.id,
        carta.asunto,
        carta.cuerpo,
        opciones.aprobada ? 'aprobado' : 'borrador',
      ]);
      await q("update crm_entidades set estado_relacion = 'en_secuencia', actualizado = now() where id = $1", [e.id]);
      await q('insert into crm_historial (usuario, entidad, oportunidad, secuencia, tipo, texto) values ($1, $2, $3, $4, $5, $6)', [u, e.id, o.id, s!.id, 'secuencia', `Secuencia iniciada con ${destinatario}`]);
      return { secuencia: aSecuencia(s!), mensaje: aMensaje(m!) };
    });
  }

  /** Cierra una secuencia y cancela lo que no se haya enviado (borradores, aprobados y programados). */
  private async cerrarSecuencia(q: Q, id: string, estado: Secuencia['estado'], motivo: string) {
    await q('update crm_secuencias set estado = $2, motivo_cierre = $3, cerrada = now() where id = $1', [id, estado, motivo]);
    await q("update crm_mensajes set estado = 'cancelado' where secuencia = $1 and estado in ('borrador', 'aprobado', 'programado')", [id]);
  }

  async pausar(u: string, secuenciaId: string, pausar: boolean) {
    const [s] = await this.q<FilaSecuencia>('select * from crm_secuencias where id = $1 and usuario = $2', [secuenciaId, u]);
    if (!s) throw new ErrorCrm('Secuencia no encontrada', 404);
    if (s.estado !== 'activa' && s.estado !== 'pausada') throw new ErrorCrm('La secuencia ya está cerrada', 409);
    await this.transaccion(async (q) => {
      await q('update crm_secuencias set estado = $2 where id = $1', [secuenciaId, pausar ? 'pausada' : 'activa']);
      // Al pausar, lo programado deja de salir y vuelve a borrador.
      if (pausar) await q("update crm_mensajes set estado = 'borrador', programado_para = null where secuencia = $1 and estado = 'programado'", [secuenciaId]);
    });
  }

  // ---------- Mensajes ----------

  /** Bandeja: borradores ya disponibles, aprobados pendientes de enviar y programados. */
  async bandeja(u: string, hoy = new Date()): Promise<(Mensaje & { entidad: Entidad; oportunidad: Oportunidad; destinatario: string; secuenciaEstado: Secuencia['estado'] })[]> {
    const filas = await this.q<FilaMensaje & { sec_estado: Secuencia['estado']; destinatario: string; oportunidad_id: string; entidad_id: string }>(
      `select m.*, s.estado as sec_estado, s.destinatario, s.oportunidad as oportunidad_id, s.entidad as entidad_id
       from crm_mensajes m join crm_secuencias s on s.id = m.secuencia
       where m.usuario = $1 and m.estado in ('borrador', 'aprobado', 'programado') and m.disponible_desde <= $2::date and s.estado = 'activa'
       order by m.estado = 'programado', m.disponible_desde, m.creado`,
      [u, hoy.toISOString().slice(0, 10)],
    );
    const entidades = new Map((await this.entidades(u)).map((e) => [e.id, e]));
    const oportunidades = new Map((await this.oportunidades(u)).map((o) => [o.id, o]));
    return filas.map((f) => ({ ...aMensaje(f), entidad: entidades.get(f.entidad_id)!, oportunidad: oportunidades.get(f.oportunidad_id)!, destinatario: f.destinatario, secuenciaEstado: f.sec_estado }));
  }

  /** Correos marcados como enviados, del más reciente al más antiguo: la constancia de lo que ha salido. */
  async enviados(u: string, limite = 300): Promise<(Mensaje & { entidad: Entidad; oportunidad: Oportunidad; destinatario: string; secuenciaEstado: Secuencia['estado'] })[]> {
    const filas = await this.q<FilaMensaje & { sec_estado: Secuencia['estado']; destinatario: string; oportunidad_id: string; entidad_id: string }>(
      `select m.*, s.estado as sec_estado, s.destinatario, s.oportunidad as oportunidad_id, s.entidad as entidad_id
       from crm_mensajes m join crm_secuencias s on s.id = m.secuencia
       where m.usuario = $1 and m.estado = 'enviado'
       order by m.enviado_en desc limit $2`,
      [u, limite],
    );
    const entidades = new Map((await this.entidades(u)).map((e) => [e.id, e]));
    const oportunidades = new Map((await this.oportunidades(u)).map((o) => [o.id, o]));
    return filas
      .filter((f) => entidades.has(f.entidad_id))
      .map((f) => ({ ...aMensaje(f), entidad: entidades.get(f.entidad_id)!, oportunidad: oportunidades.get(f.oportunidad_id)!, destinatario: f.destinatario, secuenciaEstado: f.sec_estado }));
  }

  async mensajes(u: string, secuencia: string): Promise<Mensaje[]> {
    return (await this.q<FilaMensaje>('select * from crm_mensajes where usuario = $1 and secuencia = $2 order by paso', [u, secuencia])).map(aMensaje);
  }

  private async mensajeConSecuencia(u: string, id: string) {
    const [f] = await this.q<FilaMensaje & { sec_estado: Secuencia['estado'] }>(
      'select m.*, s.estado as sec_estado from crm_mensajes m join crm_secuencias s on s.id = m.secuencia where m.id = $1 and m.usuario = $2',
      [id, u],
    );
    if (!f) throw new ErrorCrm('Mensaje no encontrado', 404);
    return f;
  }

  async editar(u: string, id: string, cambios: { asunto: string; cuerpo: string }) {
    const m = await this.mensajeConSecuencia(u, id);
    if (m.estado === 'enviado') throw new ErrorCrm('Ya se ha enviado', 409);
    await this.q('update crm_mensajes set asunto = $2, cuerpo = $3 where id = $1', [id, cambios.asunto, cambios.cuerpo]);
  }

  /** Visto bueno: queda listo para enviar desde el correo propio, o programado (solo con el envío conectado). */
  async aprobar(u: string, id: string, programarPara?: string) {
    const m = await this.mensajeConSecuencia(u, id);
    if (m.sec_estado !== 'activa') throw new ErrorCrm('La secuencia no está activa', 409);
    if (m.estado !== 'borrador' && m.estado !== 'aprobado') throw new ErrorCrm('Este mensaje ya no se puede aprobar', 409);
    if (programarPara && Number.isNaN(Date.parse(programarPara))) throw new ErrorCrm('Fecha de envío no válida', 400);
    await this.q('update crm_mensajes set estado = $2, programado_para = $3 where id = $1', [id, programarPara ? 'programado' : 'aprobado', programarPara ?? null]);
  }

  /** Cancela un envío programado o aprobado: vuelve a borrador y no sale. */
  async cancelar(u: string, id: string) {
    const m = await this.mensajeConSecuencia(u, id);
    if (m.estado === 'enviado') throw new ErrorCrm('Ya se ha enviado: no se puede cancelar', 409);
    await this.q("update crm_mensajes set estado = 'borrador', programado_para = null where id = $1", [id]);
  }

  /** Descarta el mensaje: no se envía y la secuencia queda en pausa hasta que se decida qué hacer. */
  async descartar(u: string, id: string) {
    const m = await this.mensajeConSecuencia(u, id);
    if (m.estado === 'enviado') throw new ErrorCrm('Ya se ha enviado', 409);
    await this.transaccion(async (q) => {
      await q("update crm_mensajes set estado = 'descartado', programado_para = null where id = $1", [id]);
      await q("update crm_secuencias set estado = 'pausada' where id = $1 and estado = 'activa'", [m.secuencia]);
    });
  }

  /** Vuelve a preparar el borrador de un paso descartado o cancelado (para reanudar la secuencia). */
  async regenerar(u: string, secuenciaId: string) {
    const [s] = await this.q<FilaSecuencia>('select * from crm_secuencias where id = $1 and usuario = $2', [secuenciaId, u]);
    if (!s || (s.estado !== 'activa' && s.estado !== 'pausada')) throw new ErrorCrm('La secuencia no está abierta', 409);
    const ms = await this.mensajes(u, secuenciaId);
    if (ms.some((m) => m.estado === 'borrador' || m.estado === 'aprobado' || m.estado === 'programado')) {
      await this.q("update crm_secuencias set estado = 'activa' where id = $1", [secuenciaId]);
      return;
    }
    const enviados = ms.filter((m) => m.estado === 'enviado').length;
    if (enviados >= PASOS) throw new ErrorCrm('La secuencia ya ha completado los cinco envíos', 409);
    await this.transaccion(async (q) => {
      await q("update crm_secuencias set estado = 'activa' where id = $1", [secuenciaId]);
      await this.prepararPaso(q, u, s, enviados + 1, new Date().toISOString().slice(0, 10));
    });
  }

  private async prepararPaso(q: Q, u: string, s: FilaSecuencia, paso: number, disponible: string) {
    const [o] = await q<FilaOportunidad>('select * from crm_oportunidades where id = $1', [s.oportunidad]);
    const [e] = await q<FilaEntidad>('select * from crm_entidades where id = $1', [s.entidad]);
    const catalogo = await this.espectaculos(u);
    // Los seguimientos responden a la primera carta: «Re:» con su asunto.
    const [primera] = await q<{ asunto: string }>('select asunto from crm_mensajes where secuencia = $1 and paso = 1 order by creado limit 1', [s.id]);
    const carta = generarCarta({
      paso,
      entidad: aEntidad(e!),
      oportunidad: aOportunidad(o!),
      espectaculos: catalogo.filter((x) => o!.espectaculos.includes(x.id)),
      ayuda: o!.tipo === 'subvencion' ? { titulo: o!.titulo, enlace: null } : null,
      ajustes: await this.ajustes(u),
      asuntoInicial: primera?.asunto.replace(/^Re:\s*/i, ''),
    });
    await q('insert into crm_mensajes (usuario, secuencia, paso, asunto, cuerpo, disponible_desde) values ($1, $2, $3, $4, $5, $6)', [u, s.id, paso, carta.asunto, carta.cuerpo, disponible]);
  }

  /**
   * Envío EFECTIVO de un mensaje (lo confirma el usuario tras enviarlo desde su correo, o lo registra el envío
   * automático de los programados). Solo aquí cuentan los plazos: prepara el siguiente borrador para dentro de
   * ~10 días, crea la alerta de llamada tras el 2.º y el 4.º y archiva la secuencia tras el 5.º.
   */
  async registrarEnvio(u: string, id: string, cuando = new Date()) {
    const m = await this.mensajeConSecuencia(u, id);
    if (m.estado === 'enviado') return;
    if (m.estado !== 'aprobado' && m.estado !== 'programado') throw new ErrorCrm('Antes de enviarlo necesita tu visto bueno', 409);
    if (m.sec_estado !== 'activa') throw new ErrorCrm('La secuencia no está activa', 409);
    const ajustes = await this.ajustes(u);
    await this.transaccion(async (q) => {
      await q("update crm_mensajes set estado = 'enviado', enviado_en = $2 where id = $1", [id, cuando]);
      const [s] = await q<FilaSecuencia>('select * from crm_secuencias where id = $1', [m.secuencia]);
      const [e] = await q<FilaEntidad>('select * from crm_entidades where id = $1', [s!.entidad]);
      await q('insert into crm_historial (usuario, entidad, oportunidad, secuencia, tipo, texto, fecha) values ($1, $2, $3, $4, $5, $6, $7)', [
        u,
        s!.entidad,
        s!.oportunidad,
        s!.id,
        'carta_enviada',
        `${m.paso}.º envío a ${s!.destinatario}: «${m.asunto}»`,
        cuando,
      ]);
      const llamada = PASOS_CON_LLAMADA[m.paso];
      if (llamada) {
        await q('insert into crm_historial (usuario, entidad, oportunidad, secuencia, tipo, texto, fecha, vence) values ($1, $2, $3, $4, $5, $6, $7, $8)', [
          u,
          s!.entidad,
          s!.oportunidad,
          s!.id,
          'alerta_llamada',
          `Llamar a ${aEntidad(e!).nombre} – ${llamada}`,
          cuando,
          cuando.toISOString().slice(0, 10),
        ]);
      }
      if (m.paso >= PASOS) {
        await this.cerrarSecuencia(q, s!.id, 'sin_respuesta', 'Cinco envíos sin respuesta: archivada');
        await q("update crm_entidades set estado_relacion = 'sin_respuesta', actualizado = now() where id = $1 and estado_relacion = 'en_secuencia'", [s!.entidad]);
      } else {
        await this.prepararPaso(q, u, s!, m.paso + 1, sumarDias(cuando, ajustes.diasEntreEnvios));
      }
    });
  }

  /** Cuentas cuyo remitente es este email (para leer las respuestas de su buzón). */
  async usuariosConRemitente(email: string): Promise<string[]> {
    return (await this.q<{ usuario: string }>("select usuario from crm_ajustes where lower(datos->>'email') = lower($1)", [email])).map((f) => f.usuario);
  }

  /** A quién se le está haciendo el seguimiento (activo o en pausa) y desde cuándo, para reconocer sus respuestas. */
  async seguimientosActivos(u: string): Promise<{ entidad: string; destinatario: string; desde: Date }[]> {
    return this.q(
      `select s.entidad, s.destinatario, min(m.enviado_en) as desde from crm_secuencias s join crm_mensajes m on m.secuencia = s.id
       where s.usuario = $1 and s.estado in ('activa', 'pausada') and m.estado = 'enviado' group by s.entidad, s.destinatario`,
      [u],
    );
  }

  /** Cuentas con el envío automático activado. */
  async usuariosConEnvioAutomatico(): Promise<string[]> {
    return (await this.q<{ usuario: string }>("select usuario from crm_ajustes where datos->>'envioAutomatico' = 'true'")).map((f) => f.usuario);
  }

  /** Correos que han salido desde una hora (para el tope diario). */
  async enviadosDesde(u: string, desde: Date): Promise<number> {
    const [f] = await this.q<{ n: string }>("select count(*) as n from crm_mensajes where usuario = $1 and estado = 'enviado' and enviado_en >= $2", [u, desde]);
    return Number(f?.n ?? 0);
  }

  /**
   * Lo que el envío automático puede mandar hoy: primeros correos con visto bueno (al aceptar la propuesta) y
   * seguimientos que ya tocan. Primero los seguimientos (tienen fecha), después los primeros, del más antiguo al nuevo.
   */
  async colaAutomatica(u: string, limite: number, hoy = new Date()) {
    return this.q<FilaMensaje & { destinatario: string }>(
      `select m.*, s.destinatario from crm_mensajes m join crm_secuencias s on s.id = m.secuencia
       join crm_entidades e on e.id = s.entidad
       where m.usuario = $1 and s.estado = 'activa' and not e.no_contactar and m.disponible_desde <= $2::date
         and (m.estado = 'aprobado' or (m.estado = 'borrador' and m.paso > 1))
       order by m.paso = 1, m.disponible_desde, m.creado limit $3`,
      [u, hoy.toISOString().slice(0, 10), limite],
    );
  }

  /** Programados que ya toca enviar (para la tarea automática, si hay envío conectado). */
  async programadosPendientes(hasta = new Date()) {
    return this.q<FilaMensaje & { usuario: string; destinatario: string }>(
      `select m.*, s.destinatario from crm_mensajes m join crm_secuencias s on s.id = m.secuencia
       where m.estado = 'programado' and m.programado_para <= $1 and s.estado = 'activa'`,
      [hasta],
    );
  }

  // ---------- Estados manuales e historial ----------

  /**
   * Anota lo que pasa fuera del correo: respuesta, llamada, reunión, interés, rechazo, volver a contactar, opt-out o
   * una nota. Respuesta, reunión, interés y rechazo detienen las secuencias activas (de la oportunidad si se indica;
   * si no, de la entidad). El opt-out las anula todas y se respeta en el futuro.
   */
  async anotar(u: string, entidadId: string, a: { tipo: TipoHistorial; texto?: string; oportunidad?: string | null; vence?: string | null }) {
    const e = await this.entidad(u, entidadId);
    if (a.tipo === 'carta_enviada' || a.tipo === 'alerta_llamada' || a.tipo === 'secuencia') throw new ErrorCrm('Ese tipo lo registra el sistema', 400);
    if (a.tipo === 'recontactar' && !a.vence) throw new ErrorCrm('Indica cuándo volver a contactar', 400);
    const activas = (await this.secuencias(u, { entidad: e.id })).filter((s) => (s.estado === 'activa' || s.estado === 'pausada') && (!a.oportunidad || s.oportunidad === a.oportunidad));
    await this.transaccion(async (q) => {
      await q('insert into crm_historial (usuario, entidad, oportunidad, tipo, texto, vence) values ($1, $2, $3, $4, $5, $6)', [u, e.id, a.oportunidad ?? null, a.tipo, a.texto ?? '', a.vence ?? null]);
      if (a.tipo === 'optout') {
        await q('update crm_entidades set no_contactar = true, motivo_no_contactar = $2, actualizado = now() where id = $1', [e.id, a.texto || 'Pidió no recibir más comunicaciones']);
        for (const s of (await this.secuencias(u, { entidad: e.id })).filter((x) => x.estado === 'activa' || x.estado === 'pausada')) {
          await this.cerrarSecuencia(q, s.id, 'anulada', 'Pidió no recibir más comunicaciones');
        }
      }
      const detiene = DETIENEN[a.tipo];
      if (detiene) {
        for (const s of activas) await this.cerrarSecuencia(q, s.id, a.tipo === 'no_interesado' ? 'anulada' : 'respondida', `Marcado a mano: ${a.tipo.replace('_', ' ')}`);
      }
      // Una llamada hecha resuelve las alertas de llamada pendientes de la entidad.
      if (a.tipo === 'llamada') await q("update crm_historial set hecho = true where entidad = $1 and tipo = 'alerta_llamada' and not hecho", [e.id]);
      const relacion = RELACION_DE[a.tipo];
      if (relacion) await q('update crm_entidades set estado_relacion = $2, actualizado = now() where id = $1', [e.id, relacion]);
    });
  }

  /** El usuario puede corregir el estado de la relación o quitar el «no contactar» en cualquier momento. */
  async corregirEstado(u: string, entidadId: string, c: { estadoRelacion?: EstadoRelacion; noContactar?: boolean }) {
    const e = await this.entidad(u, entidadId);
    await this.q('update crm_entidades set estado_relacion = $3, no_contactar = $4, motivo_no_contactar = case when $4 then motivo_no_contactar else null end, actualizado = now() where id = $1 and usuario = $2', [
      e.id,
      u,
      c.estadoRelacion ?? e.estadoRelacion,
      c.noContactar ?? e.noContactar,
    ]);
  }

  // ---------- Propuestas preparadas (un correo por sitio, pendiente de revisar) ----------

  async propuestas(u: string): Promise<(PropuestaPreparada & { id: string; creado: string })[]> {
    const filas = await this.q<{ id: string; datos: PropuestaPreparada; creado: Date }>("select id, datos, creado from crm_propuestas where usuario = $1 and estado = 'pendiente' order by puntos desc, creado", [u]);
    return filas.map((f) => ({ ...f.datos, id: f.id, creado: f.creado.toISOString() }));
  }

  async contarPropuestas(u: string): Promise<number> {
    const [f] = await this.q<{ n: string }>("select count(*) as n from crm_propuestas where usuario = $1 and estado = 'pendiente'", [u]);
    return Number(f?.n ?? 0);
  }

  /** Embudo de la temporada: propuestas pendientes, entidades contactadas, con respuesta, con reunión e interesadas. */
  async embudo(u: string): Promise<{ preparadas: number; contactadas: number; respuesta: number; reunion: number; interesadas: number }> {
    const [e] = await this.q<{ contactadas: string; respuesta: string; reunion: string; interesadas: string }>(
      `select
         (select count(distinct s.entidad) from crm_mensajes m join crm_secuencias s on s.id = m.secuencia where m.usuario = $1 and m.estado = 'enviado') as contactadas,
         count(*) filter (where estado_relacion in ('respondio', 'reunion', 'interesado', 'no_interesado')) as respuesta,
         count(*) filter (where estado_relacion in ('reunion', 'interesado')) as reunion,
         count(*) filter (where estado_relacion = 'interesado') as interesadas
       from crm_entidades where usuario = $1`,
      [u],
    );
    return {
      preparadas: await this.contarPropuestas(u),
      contactadas: Number(e?.contactadas ?? 0),
      respuesta: Number(e?.respuesta ?? 0),
      reunion: Number(e?.reunion ?? 0),
      interesadas: Number(e?.interesadas ?? 0),
    };
  }

  /**
   * Resultados de la cuenta: embudo completo, en qué correo responden, qué líneas y comunidades responden más, cuánto
   * tardan y la actividad de las últimas 12 semanas. Solo cuenta lo registrado en la app (envíos confirmados y
   * respuestas anotadas).
   */
  async estadisticas(u: string) {
    const RESPUESTA = "('respondio', 'reunion', 'interesado', 'no_interesado')";
    const n = (x: unknown) => Number(x ?? 0);
    const [prop] = await this.q<Record<string, string>>(
      `select count(*) filter (where estado = 'pendiente') as pendientes, count(*) filter (where estado = 'aceptada') as aceptadas,
              count(*) filter (where estado = 'descartada') as descartadas, count(*) as total
       from crm_propuestas where usuario = $1`,
      [u],
    );
    const [ent] = await this.q<Record<string, string>>(
      `with contactadas as (
         select distinct s.entidad from crm_mensajes m join crm_secuencias s on s.id = m.secuencia where m.usuario = $1 and m.estado = 'enviado')
       select (select count(*) from contactadas) as contactadas,
              count(*) filter (where e.estado_relacion in ${RESPUESTA}) as respuesta,
              count(*) filter (where e.estado_relacion in ('reunion', 'interesado')) as reunion,
              count(*) filter (where e.estado_relacion = 'interesado') as interesadas,
              count(*) filter (where e.estado_relacion = 'no_interesado') as no_interesadas,
              count(*) filter (where e.estado_relacion = 'sin_respuesta') as sin_respuesta,
              count(*) filter (where e.no_contactar) as no_contactar
       from crm_entidades e where e.usuario = $1 and (e.id in (select entidad from contactadas) or e.estado_relacion in ${RESPUESTA})`,
      [u],
    );
    const [act] = await this.q<Record<string, string>>(
      `select (select count(*) from crm_mensajes where usuario = $1 and estado = 'enviado') as correos,
              (select count(*) from crm_historial where usuario = $1 and tipo = 'llamada') as llamadas,
              (select count(*) from crm_historial where usuario = $1 and tipo = 'respuesta') as respuestas`,
      [u],
    );
    // En qué correo de la secuencia contestan: el último enviado antes de que se cerrara por respuesta.
    const porPaso = await this.q<{ paso: number; n: string }>(
      `select m.paso, count(*) as n from crm_secuencias s
         join lateral (select max(paso) as paso from crm_mensajes where secuencia = s.id and estado = 'enviado') m on m.paso is not null
       where s.usuario = $1 and s.estado = 'respondida' group by m.paso order by m.paso`,
      [u],
    );
    // Por línea del catálogo: entidades contactadas con una oportunidad que lleva ese tipo de espectáculo, y cuántas responden.
    const porTipo = await this.q<{ tipo: string; contactadas: string; respuesta: string }>(
      `with env as (
         select distinct s.entidad, s.oportunidad from crm_mensajes m join crm_secuencias s on s.id = m.secuencia where m.usuario = $1 and m.estado = 'enviado')
       select es.datos->>'tipo' as tipo, count(distinct env.entidad) as contactadas,
              count(distinct env.entidad) filter (where e.estado_relacion in ${RESPUESTA}) as respuesta
       from env join crm_oportunidades o on o.id = env.oportunidad
         join crm_espectaculos es on es.id = any(o.espectaculos)
         join crm_entidades e on e.id = env.entidad
       group by 1 order by 2 desc`,
      [u],
    );
    const porCcaa = await this.q<{ ccaa: string | null; contactadas: string; respuesta: string }>(
      `with env as (select distinct s.entidad from crm_mensajes m join crm_secuencias s on s.id = m.secuencia where m.usuario = $1 and m.estado = 'enviado')
       select e.datos->>'ccaa' as ccaa, count(*) as contactadas, count(*) filter (where e.estado_relacion in ${RESPUESTA}) as respuesta
       from env join crm_entidades e on e.id = env.entidad group by 1 order by 2 desc`,
      [u],
    );
    // Días desde el primer correo enviado hasta la primera respuesta anotada.
    const [dias] = await this.q<{ mediana: string | null; n: string }>(
      `with primero as (
         select s.entidad, min(m.enviado_en) as enviado from crm_mensajes m join crm_secuencias s on s.id = m.secuencia
         where m.usuario = $1 and m.estado = 'enviado' group by s.entidad),
       resp as (select entidad, min(fecha) as fecha from crm_historial where usuario = $1 and tipo = 'respuesta' group by entidad)
       select percentile_cont(0.5) within group (order by extract(epoch from r.fecha - p.enviado) / 86400) as mediana, count(*) as n
       from primero p join resp r on r.entidad = p.entidad and r.fecha >= p.enviado`,
      [u],
    );
    const semanas = await this.q<{ semana: string; correos: string; respuestas: string; llamadas: string }>(
      `with s as (select generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as semana)
       select to_char(s.semana, 'YYYY-MM-DD') as semana,
         (select count(*) from crm_mensajes where usuario = $1 and estado = 'enviado' and date_trunc('week', enviado_en) = s.semana) as correos,
         (select count(*) from crm_historial where usuario = $1 and tipo = 'respuesta' and date_trunc('week', fecha) = s.semana) as respuestas,
         (select count(*) from crm_historial where usuario = $1 and tipo = 'llamada' and date_trunc('week', fecha) = s.semana) as llamadas
       from s order by s.semana`,
      [u],
    );
    return {
      propuestas: { total: n(prop?.total), pendientes: n(prop?.pendientes), aceptadas: n(prop?.aceptadas), descartadas: n(prop?.descartadas) },
      entidades: {
        contactadas: n(ent?.contactadas),
        respuesta: n(ent?.respuesta),
        reunion: n(ent?.reunion),
        interesadas: n(ent?.interesadas),
        noInteresadas: n(ent?.no_interesadas),
        sinRespuesta: n(ent?.sin_respuesta),
        noContactar: n(ent?.no_contactar),
      },
      actividad: { correos: n(act?.correos), llamadas: n(act?.llamadas), respuestas: n(act?.respuestas) },
      porPaso: [1, 2, 3, 4, 5].map((paso) => ({ paso, respuestas: n(porPaso.find((x) => Number(x.paso) === paso)?.n) })),
      porTipo: porTipo.map((x) => ({ tipo: x.tipo, contactadas: n(x.contactadas), respuesta: n(x.respuesta) })),
      porCcaa: porCcaa.map((x) => ({ ccaa: x.ccaa ?? 'Sin comunidad', contactadas: n(x.contactadas), respuesta: n(x.respuesta) })),
      diasHastaRespuesta: dias?.mediana == null ? null : Math.round(Number(dias.mediana) * 10) / 10,
      respuestasConFecha: n(dias?.n),
      semanas: semanas.map((x) => ({ semana: x.semana, correos: n(x.correos), respuestas: n(x.respuestas), llamadas: n(x.llamadas) })),
    };
  }

  /** Sitios que no hay que volver a proponer: pendientes, aceptados, o descartados hace menos de 90 días. */
  async refsBloqueadas(u: string): Promise<Set<string>> {
    const filas = await this.q<{ ref: string }>(
      "select ref from crm_propuestas where usuario = $1 and (estado in ('pendiente', 'aceptada') or (estado = 'descartada' and actualizado > now() - interval '90 days'))",
      [u],
    );
    return new Set(filas.map((f) => f.ref));
  }

  async guardarPropuestas(u: string, ps: PropuestaPreparada[]) {
    for (const p of ps) {
      await this.q("insert into crm_propuestas (usuario, ref, datos, puntos) values ($1, $2, $3, $4) on conflict (usuario, ref) where estado = 'pendiente' do nothing", [
        u,
        p.ref,
        JSON.stringify(p),
        p.puntos,
      ]);
    }
  }

  async editarPropuesta(u: string, id: string, c: { asunto: string; cuerpo: string; destinatario: string }) {
    const [f] = await this.q<{ datos: PropuestaPreparada }>("select datos from crm_propuestas where id = $1 and usuario = $2 and estado = 'pendiente'", [id, u]);
    if (!f) throw new ErrorCrm('Esta propuesta ya no está pendiente', 409);
    await this.q('update crm_propuestas set datos = $3, actualizado = now() where id = $1 and usuario = $2', [id, u, JSON.stringify({ ...f.datos, ...c, editadaAMano: true })]);
  }

  /** Cuentas con catálogo (para preparar propuestas cada día). */
  async usuariosConCatalogo(): Promise<string[]> {
    return (await this.q<{ usuario: string }>('select distinct usuario from crm_espectaculos')).map((f) => f.usuario);
  }

  /** Vuelve a redactar las propuestas pendientes (tras cambiar plantillas, firma o textos del catálogo). */
  async reescribirPropuestas(u: string, redactar: (p: PropuestaPreparada) => { asunto: string; cuerpo: string }): Promise<{ reescritas: number; aMano: number }> {
    const filas = await this.q<{ id: string; datos: PropuestaPreparada & { editadaAMano?: boolean } }>("select id, datos from crm_propuestas where usuario = $1 and estado = 'pendiente'", [u]);
    let reescritas = 0;
    let aMano = 0;
    for (const f of filas) {
      // Las retocadas a mano se dejan como están: no se pierde lo escrito.
      if (f.datos.editadaAMano) {
        aMano++;
        continue;
      }
      // Las preparadas antes de guardar el historial de estilos se redactan sin él.
      const datos = { ...f.datos, historial: f.datos.historial ?? [] };
      await this.q('update crm_propuestas set datos = $2, actualizado = now() where id = $1', [f.id, JSON.stringify({ ...datos, ...redactar(datos) })]);
      reescritas++;
    }
    return { reescritas, aMano };
  }

  async descartarPropuesta(u: string, id: string) {
    await this.q("update crm_propuestas set estado = 'descartada', actualizado = now() where id = $1 and usuario = $2 and estado = 'pendiente'", [id, u]);
  }

  /**
   * Visto bueno a una propuesta: la entidad entra en seguimiento con su oportunidad y su secuencia, y la primera carta
   * (con los cambios del usuario) queda aprobada para enviarla desde su correo.
   */
  async aceptarPropuesta(u: string, id: string, carta: { asunto: string; cuerpo: string; destinatario: string }, entidadBase: Omit<Entidad, 'id' | 'estadoRelacion' | 'noContactar' | 'motivoNoContactar'>) {
    const [f] = await this.q<{ datos: PropuestaPreparada }>("select datos from crm_propuestas where id = $1 and usuario = $2 and estado = 'pendiente'", [id, u]);
    if (!f) throw new ErrorCrm('Esta propuesta ya no está pendiente', 409);
    const p = f.datos;
    const e = await this.guardarEntidad(u, { ...entidadBase, email: entidadBase.email ?? carta.destinatario });
    const o = await this.crearOportunidad(u, {
      entidad: e.id,
      tipo: p.ayudas.length ? 'subvencion' : p.licitaciones.length ? 'licitacion' : 'propuesta',
      ref: p.ayudas[0]?.id ?? p.licitaciones[0]?.id ?? null,
      titulo: p.ayudas[0]?.titulo ?? p.licitaciones[0]?.titulo ?? carta.asunto,
      espectaculos: p.espectaculos.map((x) => x.id),
      certeza: 'potencial',
      enlaceConfirmacion: null,
      notas: p.motivos.join('\n'),
    });
    const r = await this.abrirSecuencia(u, o.id, carta.destinatario, 'nueva', { carta, aprobada: true });
    await this.q("update crm_propuestas set estado = 'aceptada', actualizado = now() where id = $1", [id]);
    return { ...r, entidad: e };
  }

  /** Alertas de convocatorias o licitaciones nuevas ya vistas o descartadas (no se vuelven a enseñar). */
  async alertasVistas(u: string): Promise<Set<string>> {
    return new Set((await this.q<{ entidad: string; ref: string }>('select entidad, ref from crm_alertas_vistas where usuario = $1', [u])).map((f) => `${f.entidad}|${f.ref}`));
  }

  async descartarAlerta(u: string, entidad: string, ref: string) {
    await this.entidad(u, entidad);
    await this.q('insert into crm_alertas_vistas (usuario, entidad, ref) values ($1, $2, $3) on conflict do nothing', [u, entidad, ref]);
  }

  /** Cuentas con oportunidades abiertas (para los avisos por email). */
  async usuariosConOportunidades(): Promise<string[]> {
    return (await this.q<{ usuario: string }>("select distinct usuario from crm_oportunidades where estado = 'abierta'")).map((f) => f.usuario);
  }

  async marcarHecho(u: string, historialId: string, hecho = true) {
    await this.q('update crm_historial set hecho = $3 where id = $1 and usuario = $2', [historialId, u, hecho]);
  }

  async historial(u: string, entidad: string): Promise<EntradaHistorial[]> {
    return (await this.q<FilaHistorial>('select * from crm_historial where usuario = $1 and entidad = $2 order by fecha desc', [u, entidad])).map(aHistorial);
  }

  /** «¿A quién llamar ahora?»: alertas de llamada y «volver a contactar» que ya tocan, sin hacer. */
  async pendientes(u: string, hoy = new Date()) {
    const filas = await this.q<FilaHistorial>(
      `select * from crm_historial where usuario = $1 and not hecho and tipo in ('alerta_llamada', 'recontactar') and vence <= $2::date order by vence`,
      [u, hoy.toISOString().slice(0, 10)],
    );
    const entidades = new Map((await this.entidades(u)).map((e) => [e.id, e]));
    return filas.map((f) => ({ ...aHistorial(f), entidadDatos: entidades.get(f.entidad)! }));
  }

  /** Respuestas y acciones manuales recientes que piden un siguiente paso (interesados y reuniones). */
  async respuestas(u: string) {
    const filas = await this.q<FilaHistorial>(
      `select h.* from crm_historial h join crm_entidades e on e.id = h.entidad
       where h.usuario = $1 and not h.hecho and h.tipo in ('respuesta', 'reunion', 'interesado') and e.estado_relacion in ('respondio', 'reunion', 'interesado')
       order by h.fecha desc limit 20`,
      [u],
    );
    const entidades = new Map((await this.entidades(u)).map((e) => [e.id, e]));
    return filas.map((f) => ({ ...aHistorial(f), entidadDatos: entidades.get(f.entidad)! }));
  }
}
