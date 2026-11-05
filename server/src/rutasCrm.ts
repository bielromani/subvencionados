// API del CRM (/api/crm): catálogo, entidades, oportunidades, secuencias, bandeja de aprobación, historial, panel de
// trabajo y encaje con ayudas y licitaciones. Todo es de la cuenta que ha iniciado sesión.

import express, { type NextFunction, type Request, type Response } from 'express';
import type { ContratoVista } from './contratos/vista.js';
import type { AlmacenCuentas, Usuario } from './cuentas.js';
import { type AlmacenCrm, ErrorCrm } from './crm/almacen.js';
import { descargarCatalogoArsvia } from './crm/importar.js';
import { noEncaja, prepararPropuestas, type PropuestaPreparada, redactarPropuesta } from './crm/prospeccion.js';
import { completarPlantillas, FIRMA_ARSVIA, type PlantillasCarta, PLANTILLAS_ARSVIA, PLANTILLAS_GENERICAS, plantillasDe, TEXTOS_PRODUCCIONES_ARSVIA } from './crm/cartas.js';
import type { OportunidadGestion } from './gestionFestivales.js';
import { certezaAyuda, encajeAyuda, encajeEntidad, encajeLicitacion } from './crm/encaje.js';
import { type AjustesCrm, AJUSTES_POR_DEFECTO, cupoDiario, type Entidad, type Espectaculo, type TipoHistorial, TIPOS_ESPECTACULO } from './crm/tipos.js';
import type { Programador } from './directorio.js';
import type { Enviar } from './email.js';
import { usuarioDeSesion } from './rutasCuenta.js';
import { tituloCorto } from './titulo.js';
import type { Convocatoria } from './tipos.js';

type ProgramadorConContacto = Programador & { codigoIne: string | null };

/** Lo que el CRM necesita de los datos públicos de la app. */
export interface ContextoCrm {
  programador: (id: string) => ProgramadorConContacto | undefined;
  contacto: (codigoIne: string | null) => { municipio: string; nombre: string | null; cargo: string | null; email: string | null; telefono: string | null; deCultura?: boolean } | null;
  convocatoria: (id: string) => Convocatoria | null;
  contrato: (id: string) => ContratoVista | undefined;
  /** Ayudas útiles para quien contrata, vigentes y que cubren el territorio de la entidad. */
  ayudasPara: (p: { codigoIne: string | null; provincia: string | null; ccaa: string | null }) => Convocatoria[];
  /** Licitaciones de conciertos con plazo abierto. */
  licitacionesAbiertas: () => ContratoVista[];
  /** Las abiertas de un programador concreto. */
  licitacionesDe: (programadorId: string) => ContratoVista[];
  /** Para las propuestas preparadas: todos los programadores, las ayudas vigentes para quien contrata y la gestión. */
  programadores: () => ProgramadorConContacto[];
  ayudasProgramadores: () => Convocatoria[];
  gestionDe: (programadorId: string) => OportunidadGestion | undefined;
  /** Ayudas útiles registradas desde una fecha. */
  ayudasNuevas: (desde: string) => Convocatoria[];
  resumida: (c: Convocatoria) => unknown;
  contratoResumido: (c: ContratoVista) => unknown;
}

const texto = (x: unknown, max = 2000) => (typeof x === 'string' ? x.slice(0, max) : '');
const numero = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);

function validarEspectaculo(b: Record<string, unknown>): Omit<Espectaculo, 'id'> {
  const nombre = texto(b.nombre, 200).trim();
  if (!nombre) throw new ErrorCrm('Falta el nombre del espectáculo', 400);
  const tipo = TIPOS_ESPECTACULO.includes(b.tipo as never) ? (b.tipo as Espectaculo['tipo']) : 'otro';
  const revisado = typeof b.revisado === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.revisado) ? b.revisado : null;
  return {
    nombre,
    tipo,
    formato: texto(b.formato),
    requisitos: texto(b.requisitos),
    precioMin: numero(b.precioMin),
    precioMax: numero(b.precioMax),
    disponibilidad: texto(b.disponibilidad),
    fechasCerradas: texto(b.fechasCerradas),
    ambito: texto(b.ambito, 300),
    enlace: /^https?:\/\//.test(texto(b.enlace, 500)) ? texto(b.enlace, 500) : '',
    estadoInfo: b.estadoInfo === 'vigente' ? 'vigente' : 'pendiente',
    revisado,
    textoCarta: texto(b.textoCarta, 4000),
    textoCartaCa: texto(b.textoCartaCa, 4000),
    // Lo que viene de una importación se conserva al editar la ficha.
    ...(typeof b.origen === 'string' && /^[a-z0-9.-]+#\d+$/.test(b.origen) && { origen: b.origen }),
    ...(typeof b.enWeb === 'boolean' && { enWeb: b.enWeb }),
    ...(typeof b.huellaWeb === 'string' && { huellaWeb: b.huellaWeb.slice(0, 20000) }),
  };
}

const IDIOMA_CATALAN = /catalu|catalunya/i;

/** Plantillas que manda el navegador: misma forma que las genéricas, solo textos (los que falten, los genéricos). */
const validarPlantillas = (x: unknown): PlantillasCarta => completarPlantillas(x);

export interface AlertaCrm {
  entidad: { id: string; nombre: string; ref: string | null };
  /** Oportunidades abiertas con esa entidad (para decidir si se suma o se abre otra). */
  oportunidades: { id: string; titulo: string }[];
  tipo: 'convocatoria' | 'licitacion';
  ref: string;
  titulo: string;
  fecha: string | null;
  espectaculos: { id: string; nombre: string }[];
}

const DIAS_ALERTA = 30;

/**
 * Convocatorias nuevas (últimos 30 días) y licitaciones abiertas que afectan a entidades con oportunidades abiertas y
 * que aún no están en ninguna de sus oportunidades ni se han descartado.
 */
export async function alertasCrm(crm: AlmacenCrm, ctx: ContextoCrm, u: string, hoy = new Date()): Promise<AlertaCrm[]> {
  const [entidades, oportunidades, vistas, catalogo] = await Promise.all([crm.entidades(u), crm.oportunidades(u), crm.alertasVistas(u), crm.espectaculos(u)]);
  const desde = new Date(hoy.getTime() - DIAS_ALERTA * 86_400_000).toISOString().slice(0, 10);
  const alertas: AlertaCrm[] = [];
  for (const e of entidades) {
    if (e.noContactar) continue;
    const abiertas = oportunidades.filter((o) => o.entidad === e.id && o.estado === 'abierta');
    if (!abiertas.length) continue;
    const usadas = new Set(oportunidades.filter((o) => o.entidad === e.id && o.ref).map((o) => o.ref!));
    const p = e.ref ? ctx.programador(e.ref) : undefined;
    const territorio = { codigoIne: p?.codigoIne ?? null, provincia: p?.provincia ?? e.provincia, ccaa: p?.ccaa ?? e.ccaa };
    const base = { entidad: { id: e.id, nombre: e.nombre, ref: e.ref }, oportunidades: abiertas.map((o) => ({ id: o.id, titulo: o.titulo })) };
    for (const c of ctx.ayudasPara(territorio)) {
      if ((c.fechaPublicacion ?? '') < desde || usadas.has(c.id) || vistas.has(`${e.id}|${c.id}`)) continue;
      alertas.push({ ...base, tipo: 'convocatoria', ref: c.id, titulo: tituloCorto(c.titulo), fecha: c.fechaPublicacion, espectaculos: encajeAyuda(catalogo, c).slice(0, 3).map((x) => ({ id: x.espectaculo.id, nombre: x.espectaculo.nombre })) });
    }
    for (const x of e.ref ? ctx.licitacionesDe(e.ref) : []) {
      if (usadas.has(x.id) || vistas.has(`${e.id}|${x.id}`)) continue;
      alertas.push({ ...base, tipo: 'licitacion', ref: x.id, titulo: x.titulo, fecha: x.finPlazo, espectaculos: encajeLicitacion(catalogo, x).slice(0, 3).map((m) => ({ id: m.espectaculo.id, nombre: m.espectaculo.nombre })) });
    }
  }
  return alertas.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
}

/** Entidades que no hay que proponer: ya en seguimiento (salvo recién añadidas sin contactar) o con «no contactar». */
async function excluidas(crm: AlmacenCrm, u: string): Promise<Set<string>> {
  const fuera = await crm.refsBloqueadas(u);
  for (const e of await crm.entidades(u)) if (e.ref && (e.noContactar || e.estadoRelacion !== 'nueva')) fuera.add(e.ref);
  return fuera;
}

/** Prepara hasta `limite` propuestas nuevas para la cuenta y las guarda. */
export async function prepararParaCuenta(crm: AlmacenCrm, ctx: ContextoCrm, u: string, opciones: { limite: number; ccaa?: string[] }): Promise<number> {
  const [catalogo, ajustes, fuera] = await Promise.all([crm.espectaculos(u), crm.ajustes(u), excluidas(crm, u)]);
  const nuevas = prepararPropuestas(
    { programadores: ctx.programadores, contacto: ctx.contacto, ayudasProgramadores: ctx.ayudasProgramadores, licitacionesAbiertas: ctx.licitacionesAbiertas, gestionDe: ctx.gestionDe },
    catalogo,
    ajustes,
    fuera,
    opciones,
  );
  await crm.guardarPropuestas(u, nuevas);
  return nuevas.length;
}

export function rutasCrm(cuentas: AlmacenCuentas | null, crm: AlmacenCrm | null, ctx: ContextoCrm, enviar: Enviar | null) {
  const r = express.Router();

  /** Todas las rutas necesitan sesión; los errores de regla de negocio salen con su código. */
  const ruta =
    (fn: (req: Request, res: Response, u: Usuario, crm: AlmacenCrm) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => {
      const u = crm ? await usuarioDeSesion(cuentas, req) : null;
      if (!u || !crm) {
        res.status(401).json({ error: crm ? 'Inicia sesión' : 'Las cuentas aún no están activadas' });
        return;
      }
      try {
        const salida = await fn(req, res, u, crm);
        if (!res.headersSent) res.set('Cache-Control', 'no-store').json(salida ?? { ok: true });
      } catch (e) {
        if (e instanceof ErrorCrm) res.status(e.estado).json({ error: e.message, ...(e.detalle ? { detalle: e.detalle } : {}) });
        else next(e);
      }
    };

  // ---------- Ajustes y catálogo ----------

  // Sin remitente configurado, el email de la cuenta (las cartas salen de su dirección y las respuestas le llegan a ella).
  r.get(
    '/ajustes',
    ruta(async (_q, _r, u, c) => {
      const a = await c.ajustes(u.id);
      return { ajustes: { ...a, email: a.email || u.email, plantillas: plantillasDe(a) }, envioConectado: enviar !== null, cupoHoy: cupoDiario(a) };
    }),
  );
  r.put(
    '/ajustes',
    ruta(async (req, _r, u, c) => {
      const b = req.body ?? {};
      const previo = await c.ajustes(u.id);
      const automatico = b.envioAutomatico === true;
      if (automatico && !enviar) throw new ErrorCrm('Para el envío automático hay que conectar antes el correo (Brevo)', 409);
      const a: AjustesCrm = {
        ...AJUSTES_POR_DEFECTO,
        remitente: texto(b.remitente, 200),
        organizacion: texto(b.organizacion, 200),
        email: texto(b.email, 200),
        telefono: texto(b.telefono, 100),
        web: texto(b.web, 300),
        firma: texto(b.firma, 1000),
        cargo: texto(b.cargo, 200),
        ...(b.plantillas && { plantillas: validarPlantillas(b.plantillas) }),
        diasEntreEnvios: Math.min(60, Math.max(3, Math.round(Number(b.diasEntreEnvios) || 10))),
        envioAutomatico: automatico,
        limiteDiario: Math.min(300, Math.max(5, Math.round(Number(b.limiteDiario) || 30))),
        // Al activarlo empieza la subida gradual; si ya estaba activo, se mantiene la fecha.
        automaticoDesde: automatico ? (previo.envioAutomatico && previo.automaticoDesde ? previo.automaticoDesde : new Date().toISOString().slice(0, 10)) : null,
      };
      await c.guardarAjustes(u.id, a);
      return { ajustes: a };
    }),
  );

  // Preajuste ArsVia: las cartas modelo de Joan (plantillas, firma) y el texto de cada producción en sus fichas
  // (solo en las que aún no tienen texto). Después se vuelven a redactar las propuestas pendientes.
  r.post(
    '/plantillas/arsvia',
    ruta(async (_q, _r, u, c) => {
      const a = await c.ajustes(u.id);
      await c.guardarAjustes(u.id, { ...a, plantillas: PLANTILLAS_ARSVIA, firma: a.firma.trim() ? a.firma : FIRMA_ARSVIA, cargo: a.cargo || 'Coordinación de proyectos y giras' });
      let textos = 0;
      for (const e of await c.espectaculos(u.id)) {
        const t = TEXTOS_PRODUCCIONES_ARSVIA.find((x) => x.patron.test(e.nombre));
        if (!t || e.textoCarta) continue;
        const { id, ...resto } = e;
        await c.guardarEspectaculo(u.id, { ...resto, textoCarta: t.es, textoCartaCa: t.ca }, id);
        textos++;
      }
      const ajustes = await c.ajustes(u.id);
      const catalogo = await c.espectaculos(u.id);
      return { textos, ...(await c.reescribirPropuestas(u.id, (p) => redactarPropuesta(p, ajustes, catalogo))) };
    }),
  );
  r.post(
    '/propuestas/reescribir',
    ruta(async (_q, _r, u, c) => {
      const ajustes = await c.ajustes(u.id);
      const catalogo = await c.espectaculos(u.id);
      return c.reescribirPropuestas(u.id, (p) => redactarPropuesta(p, ajustes, catalogo));
    }),
  );

  r.get('/catalogo', ruta(async (_q, _r, u, c) => ({ items: await c.espectaculos(u.id) })));
  r.post('/catalogo', ruta(async (req, _r, u, c) => ({ id: await c.guardarEspectaculo(u.id, validarEspectaculo(req.body ?? {})) })));
  // Importar el catálogo publicado en arsvia.org (sin duplicar; lo que no dice la web queda vacío y pendiente).
  r.post('/catalogo/importar', ruta(async (_q, _r, u, c) => c.importarCatalogo(u.id, await descargarCatalogoArsvia(), 'arsvia.org#')));
  r.put('/catalogo/:id', ruta(async (req, _r, u, c) => ({ id: await c.guardarEspectaculo(u.id, validarEspectaculo(req.body ?? {}), String(req.params.id)) })));
  r.delete('/catalogo/:id', ruta(async (req, _r, u, c) => c.borrarEspectaculo(u.id, String(req.params.id))));

  // ---------- Entidades ----------

  /** Ficha dinámica: datos, oportunidades, secuencias con sus mensajes, historial, propuestas que encajan y ayudas. */
  const ficha = async (u: string, c: AlmacenCrm, e: Entidad | null, p: ProgramadorConContacto | null) => {
    const catalogo = await c.espectaculos(u);
    const encaje = encajeEntidad(catalogo, p);
    const territorio = { codigoIne: p?.codigoIne ?? null, provincia: p?.provincia ?? e?.provincia ?? null, ccaa: p?.ccaa ?? e?.ccaa ?? null };
    const oportunidades = e ? await c.oportunidades(u, e.id) : [];
    const ayudas = ctx.ayudasPara(territorio).slice(0, 12).map((conv) => {
      const enCrm = oportunidades.find((o) => o.ref === conv.id);
      const auto = certezaAyuda(conv, { nombre: e?.nombre ?? p?.nombre ?? '', municipio: e?.municipio ?? p?.ciudad ?? null });
      return {
        convocatoria: ctx.resumida(conv),
        certeza: enCrm?.certeza === 'confirmada' || auto.certeza === 'confirmada' ? 'confirmada' : (enCrm?.certeza ?? auto.certeza),
        motivo: enCrm?.certeza === 'revisada' ? 'Requisitos principales revisados' : auto.motivo,
        espectaculos: encajeAyuda(catalogo, conv).slice(0, 4).map((x) => ({ id: x.espectaculo.id, nombre: x.espectaculo.nombre })),
      };
    });
    const secuencias = e ? await c.secuencias(u, { entidad: e.id }) : [];
    return {
      entidad: e,
      oportunidades,
      secuencias: await Promise.all(secuencias.map(async (s) => ({ ...s, mensajes: await c.mensajes(u, s.id) }))),
      historial: e ? await c.historial(u, e.id) : [],
      encaje: { amplio: encaje.amplio, propuestas: encaje.propuestas.slice(0, 8) },
      ayudas,
      licitaciones: p
        ? ctx.licitacionesDe(p.id).map((x) => ({
            contrato: ctx.contratoResumido(x),
            espectaculos: encajeLicitacion(catalogo, x).slice(0, 3).map((m) => ({ id: m.espectaculo.id, nombre: m.espectaculo.nombre, viabilidad: m.viabilidad, motivo: m.motivoViabilidad })),
          }))
        : [],
    };
  };

  r.get('/entidades', ruta(async (_q, _r, u, c) => ({ items: await c.entidades(u.id) })));

  r.get(
    '/entidades/:id',
    ruta(async (req, _r, u, c) => {
      const e = await c.entidad(u.id, String(req.params.id));
      return ficha(u.id, c, e, e.ref ? (ctx.programador(e.ref) ?? null) : null);
    }),
  );

  /** Ficha de un programador del directorio público, esté o no en el CRM todavía. */
  r.get(
    '/ref/:ref',
    ruta(async (req, _r, u, c) => {
      const ref = String(req.params.ref);
      const p = ctx.programador(ref) ?? null;
      return ficha(u.id, c, await c.entidadPorRef(u.id, ref), p);
    }),
  );

  /** Añade una entidad: desde el directorio (ref) con sus datos públicos, o a mano. */
  r.post(
    '/entidades',
    ruta(async (req, _r, u, c) => {
      const b = req.body ?? {};
      const ref = typeof b.ref === 'string' ? b.ref : null;
      const p = ref ? ctx.programador(ref) : undefined;
      if (ref && !p) throw new ErrorCrm('No está en el directorio', 404);
      const contacto = p ? ctx.contacto(p.codigoIne) : null;
      const ccaa = p?.ccaa ?? (texto(b.ccaa, 100) || null);
      const nombre = texto(b.nombre, 300) || (contacto?.municipio && /ayuntamiento|ajuntament|concello|alcald|junta de gobierno/i.test(p?.nombre ?? '') ? `Ayuntamiento de ${contacto.municipio}` : (p?.nombre ?? ''));
      if (!nombre) throw new ErrorCrm('Falta el nombre', 400);
      return c.guardarEntidad(u.id, {
        ref,
        nombre,
        tipo: ['ayuntamiento', 'auditorio', 'teatro', 'festival', 'otro'].includes(b.tipo) ? b.tipo : /ayuntamiento|ajuntament|concello|alcald|junta de gobierno/i.test(p?.nombre ?? nombre) ? 'ayuntamiento' : 'otro',
        municipio: contacto?.municipio ?? p?.ciudad ?? (texto(b.municipio, 200) || null),
        provincia: p?.provincia ?? (texto(b.provincia, 100) || null),
        ccaa,
        persona: texto(b.persona, 200) || contacto?.nombre || null,
        email: texto(b.email, 200) || contacto?.email?.split(/[;,\s]+/)[0] || null,
        telefono: texto(b.telefono, 100) || contacto?.telefono || null,
        idioma: b.idioma === 'ca' || b.idioma === 'es' ? b.idioma : ccaa && IDIOMA_CATALAN.test(ccaa) ? 'ca' : 'es',
        notas: texto(b.notas),
      });
    }),
  );

  r.put(
    '/entidades/:id',
    ruta(async (req, _r, u, c) => {
      const e = await c.entidad(u.id, String(req.params.id));
      const b = req.body ?? {};
      return c.guardarEntidad(
        u.id,
        {
          ref: e.ref,
          nombre: texto(b.nombre, 300) || e.nombre,
          tipo: ['ayuntamiento', 'auditorio', 'teatro', 'festival', 'otro'].includes(b.tipo) ? b.tipo : e.tipo,
          municipio: b.municipio !== undefined ? texto(b.municipio, 200) || null : e.municipio,
          provincia: e.provincia,
          ccaa: e.ccaa,
          persona: b.persona !== undefined ? texto(b.persona, 200) || null : e.persona,
          email: b.email !== undefined ? texto(b.email, 200) || null : e.email,
          telefono: b.telefono !== undefined ? texto(b.telefono, 100) || null : e.telefono,
          idioma: b.idioma === 'ca' || b.idioma === 'es' ? b.idioma : e.idioma,
          notas: b.notas !== undefined ? texto(b.notas) : e.notas,
        },
        e.id,
      );
    }),
  );

  r.delete('/entidades/:id', ruta(async (req, _r, u, c) => c.borrarEntidad(u.id, String(req.params.id))));

  r.post(
    '/entidades/:id/anotar',
    ruta(async (req, _r, u, c) => {
      const b = req.body ?? {};
      const tipos: TipoHistorial[] = ['respuesta', 'llamada', 'reunion', 'interesado', 'no_interesado', 'recontactar', 'optout', 'nota'];
      if (!tipos.includes(b.tipo)) throw new ErrorCrm('Tipo de anotación no válido', 400);
      await c.anotar(u.id, String(req.params.id), {
        tipo: b.tipo,
        texto: texto(b.texto),
        oportunidad: typeof b.oportunidad === 'string' ? b.oportunidad : null,
        vence: typeof b.vence === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.vence) ? b.vence : null,
      });
    }),
  );

  r.post(
    '/entidades/:id/estado',
    ruta(async (req, _r, u, c) => {
      const b = req.body ?? {};
      await c.corregirEstado(u.id, String(req.params.id), { estadoRelacion: b.estadoRelacion, noContactar: typeof b.noContactar === 'boolean' ? b.noContactar : undefined });
    }),
  );

  r.post('/historial/:id/hecho', ruta(async (req, _r, u, c) => c.marcarHecho(u.id, String(req.params.id), req.body?.hecho !== false)));

  // ---------- Oportunidades y secuencias ----------

  r.post(
    '/oportunidades',
    ruta(async (req, _r, u, c) => {
      const b = req.body ?? {};
      const tipo = ['subvencion', 'licitacion', 'ciclo', 'gestion_festival', 'propuesta'].includes(b.tipo) ? b.tipo : 'propuesta';
      const titulo = texto(b.titulo, 300).trim();
      if (!titulo) throw new ErrorCrm('Falta el título de la oportunidad', 400);
      return c.crearOportunidad(u.id, {
        entidad: String(b.entidad),
        tipo,
        ref: typeof b.ref === 'string' ? b.ref : null,
        titulo,
        espectaculos: Array.isArray(b.espectaculos) ? b.espectaculos.filter((x: unknown) => typeof x === 'string').slice(0, 20) : [],
        certeza: b.certeza === 'revisada' ? 'revisada' : 'potencial',
        enlaceConfirmacion: null,
        notas: texto(b.notas),
      });
    }),
  );

  r.put(
    '/oportunidades/:id',
    ruta(async (req, _r, u, c) => {
      const b = req.body ?? {};
      return c.actualizarOportunidad(u.id, String(req.params.id), {
        certeza: ['potencial', 'revisada', 'confirmada'].includes(b.certeza) ? b.certeza : undefined,
        enlaceConfirmacion: b.enlaceConfirmacion !== undefined ? (/^https?:\/\//.test(texto(b.enlaceConfirmacion, 500)) ? texto(b.enlaceConfirmacion, 500) : null) : undefined,
        espectaculos: Array.isArray(b.espectaculos) ? b.espectaculos.filter((x: unknown) => typeof x === 'string') : undefined,
        estado: b.estado === 'cerrada' || b.estado === 'abierta' ? b.estado : undefined,
        notas: b.notas !== undefined ? texto(b.notas) : undefined,
      });
    }),
  );

  r.post(
    '/secuencias',
    ruta(async (req, _r, u, c) => {
      const b = req.body ?? {};
      return c.abrirSecuencia(u.id, String(b.oportunidad), texto(b.destinatario, 200).trim(), b.decision === 'sustituir' || b.decision === 'nueva' ? b.decision : undefined);
    }),
  );
  r.post('/secuencias/:id/pausar', ruta(async (req, _r, u, c) => c.pausar(u.id, String(req.params.id), true)));
  r.post('/secuencias/:id/reanudar', ruta(async (req, _r, u, c) => c.regenerar(u.id, String(req.params.id))));

  // ---------- Bandeja de aprobación ----------

  r.get('/bandeja', ruta(async (_q, _r, u, c) => ({ items: await c.bandeja(u.id), envioConectado: enviar !== null, automatico: enviar !== null && !!(await c.ajustes(u.id)).envioAutomatico })));
  r.put('/mensajes/:id', ruta(async (req, _r, u, c) => c.editar(u.id, String(req.params.id), { asunto: texto(req.body?.asunto, 300), cuerpo: texto(req.body?.cuerpo, 20000) })));
  r.post(
    '/mensajes/:id/aprobar',
    ruta(async (req, _r, u, c) => {
      const programar = typeof req.body?.programarPara === 'string' ? req.body.programarPara : undefined;
      if (programar && !enviar) throw new ErrorCrm('Para programar envíos hay que conectar el correo; mientras tanto, apruébalo y envíalo desde tu correo', 409);
      await c.aprobar(u.id, String(req.params.id), programar);
    }),
  );
  r.post('/mensajes/:id/cancelar', ruta(async (req, _r, u, c) => c.cancelar(u.id, String(req.params.id))));
  r.post('/mensajes/:id/descartar', ruta(async (req, _r, u, c) => c.descartar(u.id, String(req.params.id))));
  /** El usuario confirma que lo ha enviado desde su correo: es el envío efectivo. */
  r.get('/enviados', ruta(async (_q, _r, u, c) => ({ items: await c.enviados(u.id) })));
  r.post('/mensajes/:id/enviado', ruta(async (req, _r, u, c) => c.registrarEnvio(u.id, String(req.params.id))));

  // ---------- Propuestas preparadas ----------

  r.get('/propuestas', ruta(async (_q, _r, u, c) => ({ items: await c.propuestas(u.id) })));
  r.post(
    '/propuestas/preparar',
    ruta(async (req, _r, u, c) => {
      const limite = Math.min(Math.max(Math.round(Number(req.body?.limite) || 20), 1), 100);
      const ccaa = Array.isArray(req.body?.ccaa) ? req.body.ccaa.filter((x: unknown) => typeof x === 'string') : typeof req.body?.ccaa === 'string' && req.body.ccaa ? [req.body.ccaa] : [];
      if (!(await c.espectaculos(u.id)).length) throw new ErrorCrm('Primero añade tu catálogo de espectáculos', 400);
      return { nuevas: await prepararParaCuenta(c, ctx, u.id, { limite, ccaa }) };
    }),
  );
  const cartaDe = (b: Record<string, unknown> | undefined) => {
    const destinatario = texto(b?.destinatario, 200).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) throw new ErrorCrm('Falta un email válido del destinatario', 400);
    return { asunto: texto(b?.asunto, 300), cuerpo: texto(b?.cuerpo, 20000), destinatario };
  };
  r.put('/propuestas/:id', ruta(async (req, _r, u, c) => c.editarPropuesta(u.id, String(req.params.id), cartaDe(req.body))));
  r.post('/propuestas/:id/descartar', ruta(async (req, _r, u, c) => c.descartarPropuesta(u.id, String(req.params.id))));
  /** Visto bueno: la entidad entra en seguimiento y la carta queda aprobada para enviarla desde el correo propio. */
  r.post(
    '/propuestas/:id/aceptar',
    ruta(async (req, _r, u, c) => {
      const carta = cartaDe(req.body);
      const p = (await c.propuestas(u.id)).find((x) => x.id === req.params.id);
      if (!p) throw new ErrorCrm('Esta propuesta ya no está pendiente', 409);
      return aceptar(u.id, c, p, carta);
    }),
  );
  // Visto bueno a varias de golpe, con el texto que tienen (para el envío automático). Las de email dudoso no se tocan.
  r.post(
    '/propuestas/aceptar-todas',
    ruta(async (req, _r, u, c) => {
      const ids = Array.isArray(req.body?.ids) ? new Set(req.body.ids.filter((x: unknown) => typeof x === 'string')) : null;
      let aceptadas = 0;
      let porRevisar = 0;
      for (const p of await c.propuestas(u.id)) {
        if (ids && !ids.has(p.id)) continue;
        if (p.revisarEmail) {
          porRevisar++;
          continue;
        }
        await aceptar(u.id, c, p, { asunto: p.asunto, cuerpo: p.cuerpo, destinatario: p.destinatario });
        aceptadas++;
      }
      return { aceptadas, porRevisar };
    }),
  );
  function aceptar(uid: string, c: AlmacenCrm, p: PropuestaPreparada & { id: string }, carta: { asunto: string; cuerpo: string; destinatario: string }) {
    const prog = ctx.programador(p.ref);
    return c.aceptarPropuesta(uid, p.id, carta, {
        ref: p.ref,
        nombre: p.nombre,
        tipo: /ayuntamiento|ajuntament|concello/i.test(p.nombre) ? 'ayuntamiento' : 'otro',
        municipio: p.municipio,
        provincia: prog?.provincia ?? p.provincia,
        ccaa: prog?.ccaa ?? p.ccaa,
        persona: p.persona,
        email: carta.destinatario,
        telefono: p.telefono,
        idioma: p.idioma,
        notas: '',
      });
  }

  // ---------- Panel de trabajo ----------

  r.get(
    '/panel',
    ruta(async (_q, _r, u, c) => {
      const catalogo = await c.espectaculos(u.id);
      const hace14 = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
      const ayudas = ctx
        .ayudasNuevas(hace14)
        .map((conv) => ({ conv, encaje: encajeAyuda(catalogo, conv) }))
        .filter((x) => !catalogo.length || x.encaje.length > 0)
        .slice(0, 10)
        .map((x) => ({ convocatoria: ctx.resumida(x.conv), certeza: 'potencial', espectaculos: x.encaje.slice(0, 3).map((e) => ({ id: e.espectaculo.id, nombre: e.espectaculo.nombre })) }));
      const licitaciones = ctx
        .licitacionesAbiertas()
        .filter((x) => !noEncaja(x.titulo))
        .map((x) => ({ contrato: x, encaje: encajeLicitacion(catalogo, x) }))
        .filter((x) => !catalogo.length || x.encaje.length > 0)
        .slice(0, 10)
        .map((x) => ({
          contrato: ctx.contratoResumido(x.contrato),
          espectaculos: x.encaje.slice(0, 3).map((e) => ({ id: e.espectaculo.id, nombre: e.espectaculo.nombre, viabilidad: e.viabilidad, motivo: e.motivoViabilidad })),
        }));
      const bandeja = await c.bandeja(u.id);
      const ajustes = await c.ajustes(u.id);
      const hace180 = Date.now() - 180 * 86_400_000;
      const completa = (e: (typeof catalogo)[number]) =>
        e.estadoInfo === 'vigente' && !!e.revisado && Date.parse(e.revisado) >= hace180 && (e.precioMin != null || e.precioMax != null) && !!e.requisitos.trim() && !!e.textoCarta?.trim();
      const puesta = {
        catalogo: catalogo.length,
        completas: catalogo.filter(completa).length,
        // Hechas si las plantillas guardadas no son las genéricas (al guardar la firma se guardan también).
        plantillas: !!ajustes.plantillas && JSON.stringify(completarPlantillas(ajustes.plantillas)) !== JSON.stringify(PLANTILLAS_GENERICAS),
        firma: !!(ajustes.firma.trim() || ajustes.remitente.trim()),
      };
      return {
        puesta,
        llamar: await c.pendientes(u.id),
        propuestas: await c.contarPropuestas(u.id),
        embudo: await c.embudo(u.id),
        alertas: await alertasCrm(c, ctx, u.id),
        bandeja: { total: bandeja.length, items: bandeja.slice(0, 5) },
        respuestas: await c.respuestas(u.id),
        ayudas,
        licitaciones,
        catalogo: catalogo.length,
      };
    }),
  );

  r.get(
    '/estadisticas',
    ruta(async (_q, _r, u, c) => c.estadisticas(u.id)),
  );

  r.post(
    '/alertas/descartar',
    ruta(async (req, _r, u, c) => c.descartarAlerta(u.id, String(req.body?.entidad), texto(req.body?.ref, 200))),
  );

  // ---------- Encaje con ayudas y licitaciones ----------

  r.get(
    '/encaje/convocatoria/:id',
    ruta(async (req, _r, u, c) => {
      const conv = ctx.convocatoria(String(req.params.id));
      if (!conv) throw new ErrorCrm('Convocatoria no encontrada', 404);
      return { espectaculos: encajeAyuda(await c.espectaculos(u.id), conv) };
    }),
  );
  r.get(
    '/encaje/contrato/:id',
    ruta(async (req, _r, u, c) => {
      const x = ctx.contrato(String(req.params.id));
      if (!x) throw new ErrorCrm('Contrato no encontrado', 404);
      return { espectaculos: encajeLicitacion(await c.espectaculos(u.id), x) };
    }),
  );

  return r;
}
