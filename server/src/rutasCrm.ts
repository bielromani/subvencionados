// API del CRM (/api/crm): catálogo, entidades, oportunidades, secuencias, bandeja de aprobación, historial, panel de
// trabajo y encaje con ayudas y licitaciones. Todo es de la cuenta que ha iniciado sesión.

import { randomUUID } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { ContratoVista } from './contratos/vista.js';
import type { AlmacenCuentas, Usuario } from './cuentas.js';
import { type AlmacenCrm, ErrorCrm } from './crm/almacen.js';
import { descargarCatalogoArsvia } from './crm/importar.js';
import { correoHtml } from './crm/correoHtml.js';
import { enviarMensaje, inicioDiaMadrid, pieBaja } from './crm/envio.js';
import { enZona, idiomaDe } from './crm/idioma.js';
import { configImapDesdeEntorno } from './crm/respuestas.js';
import { elegirEspectaculos, noEncaja, prepararPropuestas, type PropuestaPreparada, redactarPropuesta } from './crm/prospeccion.js';
import { acortarSaludo, completarPlantillas, LINEAS, tituloCorreo, type Linea, type PlantillasCarta, PLANTILLAS_GENERICAS, plantillasDe } from './crm/cartas.js';
import { type DatosDossier, dossierDeAnexo, dossierDeCorreo, dossierDeLinea, dossierDelCorreo, nombreArchivoDossier, pdfDossier } from './crm/dossier.js';
import { FICHAS_NUEVAS_ARSVIA, FIRMA_ARSVIA, FIRMA_ARSVIA_CA, FIRMAS_ANTERIORES_ARSVIA, FUERA_DE_CARTAS_ARSVIA, PLANTILLAS_ARSVIA, TEXTOS_ANTERIORES_ARSVIA, TEXTOS_PRODUCCIONES_ARSVIA } from './crm/cartasArsvia.js';
import type { OportunidadGestion } from './gestionFestivales.js';
import { certezaAyuda, encajeAyuda, encajeEntidad, encajeLicitacion } from './crm/encaje.js';
import { type AjustesCrm, AJUSTES_POR_DEFECTO, type Anexo, type Campana, cupoDiario, DOSSIER_VACIO, type Entidad, type Espectaculo, type FichaDossier, type TipoHistorial, TIPOS_ESPECTACULO } from './crm/tipos.js';
import type { Programador } from './directorio.js';
import type { Enviar } from './email.js';
import { usuarioDeSesion } from './rutasCuenta.js';
import { tituloCorto } from './titulo.js';
import type { Convocatoria } from './tipos.js';

type ProgramadorConContacto = Programador & { codigoIne: string | null };

/** Lo que el CRM necesita de los datos públicos de la app. */
export interface ContextoCrm {
  /** Tipografías del dossier en PDF (datos/fuentes). */
  rutaFuentes?: string;
  programador: (id: string) => ProgramadorConContacto | undefined;
  /** Email y teléfono genéricos de un festival (de FestClásica, Redescena…). */
  contactoFestival?: (id: string) => { email: string | null; telefono: string | null } | undefined;
  contacto: (
    codigoIne: string | null,
  ) => { municipio: string; nombre: string | null; cargo: string | null; email: string | null; telefono: string | null; deCultura?: boolean; poblacion?: number | null; partido?: string | null } | null;
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
const ids = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string' && /^[\w-]{1,60}$/.test(y)).slice(0, 30) : []);
const numero = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);

/** Dossier de una ficha: solo los campos conocidos, como texto; si todo está vacío, no se guarda. */
function validarDossier(x: unknown): FichaDossier | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const d = Object.fromEntries(Object.keys(DOSSIER_VACIO).map((k) => [k, texto(o[k], 8000)])) as unknown as FichaDossier;
  return Object.values(d).some((v) => v.trim()) ? d : null;
}

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
    ...((b.prioridad === 'alta' || b.prioridad === 'baja') && { prioridad: b.prioridad }),
    ...(typeof b.enCartas === 'boolean' && { enCartas: b.enCartas }),
    ...(validarDossier(b.dossier) && { dossier: validarDossier(b.dossier)! }),
    ...(validarDossier(b.dossierCa) && { dossierCa: validarDossier(b.dossierCa)! }),
    // Lo que viene de una importación se conserva al editar la ficha.
    ...(typeof b.origen === 'string' && /^[a-z0-9.-]+#\d+$/.test(b.origen) && { origen: b.origen }),
    ...(typeof b.enWeb === 'boolean' && { enWeb: b.enWeb }),
    ...(typeof b.huellaWeb === 'string' && { huellaWeb: b.huellaWeb.slice(0, 20000) }),
  };
}

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
export async function prepararParaCuenta(crm: AlmacenCrm, ctx: ContextoCrm, u: string, opciones: { limite: number; ccaa?: string[]; campana?: string }): Promise<number> {
  const [catalogo, ajustes, fuera, deCampana] = await Promise.all([crm.espectaculos(u), crm.ajustes(u), excluidas(crm, u), crm.refsDeCampana(u)]);
  const campana = opciones.campana ? ajustes.campanas?.find((x) => x.id === opciones.campana) : undefined;
  if (opciones.campana && !campana) throw new ErrorCrm('Esa campaña ya no existe', 404);
  if (campana && !campana.espectaculos.length) throw new ErrorCrm('La campaña no tiene producciones', 400);
  if (campana && !campana.ccaa.length && !campana.provincias.length) throw new ErrorCrm('La campaña no tiene territorio: elige comunidades o provincias', 400);
  // La tanda general no escribe a quien ya tiene una propuesta de campaña pendiente.
  if (!campana) for (const r of deCampana) fuera.add(r);
  // Sin comunidad concreta, la zona de la cuenta («Resto de España», «Cataluña»...): también en la tanda diaria.
  const zona = opciones.ccaa?.length || campana ? undefined : ajustes.zona;
  const nuevas = prepararPropuestas(
    { programadores: ctx.programadores, contacto: ctx.contacto, ayudasProgramadores: ctx.ayudasProgramadores, licitacionesAbiertas: ctx.licitacionesAbiertas, gestionDe: ctx.gestionDe },
    catalogo,
    ajustes,
    fuera,
    { limite: opciones.limite, ...(opciones.ccaa && { ccaa: opciones.ccaa }), zona, ...(campana && { campana }) },
  );
  // Solo la campaña: sus sitios dejan la propuesta general pendiente (si no se ha retocado a mano).
  if (campana) {
    const refs = new Set(nuevas.map((p) => p.ref));
    await crm.borrarPendientes(u, (_ccaa, c, ref) => !c && refs.has(ref));
  }
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
      return { ajustes: { ...a, email: a.email || u.email, plantillas: plantillasDe(a) }, envioConectado: enviar !== null, cupoHoy: cupoDiario(a), buzonConectado: configImapDesdeEntorno() !== null };
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
        firmaCa: texto(b.firmaCa, 1000),
        zona: typeof b.zona === 'string' ? texto(b.zona, 80) : (previo.zona ?? ''),
        cargo: texto(b.cargo, 200),
        ...(b.plantillas && { plantillas: validarPlantillas(b.plantillas) }),
        diasEntreEnvios: Math.min(60, Math.max(3, Math.round(Number(b.diasEntreEnvios) || 10))),
        obrasPorCorreo: Math.min(8, Math.max(1, Math.round(Number(b.obrasPorCorreo) || 6))),
        obrasPorTipo: Math.min(4, Math.max(1, Math.round(Number(b.obrasPorTipo) || 2))),
        afines: b.afines !== false,
        envioAutomatico: automatico,
        limiteDiario: Math.min(300, Math.max(5, Math.round(Number(b.limiteDiario) || 30))),
        // Al activarlo empieza la subida gradual; si ya estaba activo, se mantiene la fecha.
        automaticoDesde: automatico ? (previo.envioAutomatico && previo.automaticoDesde ? previo.automaticoDesde : new Date().toISOString().slice(0, 10)) : null,
        // Anexos y campañas se guardan aparte (PUT /anexos y /campanas).
        ...(previo.anexos && { anexos: previo.anexos }),
        ...(previo.campanas && { campanas: previo.campanas }),
      };
      await c.guardarAjustes(u.id, a);
      return { ajustes: a };
    }),
  );

  // Preajuste ArsVia: las cartas modelo de Joan (plantillas por líneas, firmas) y, en cada producción, su texto en las
  // cartas, su página del dossier y su precio, solo donde la ficha aún no los tiene (o tiene los de un preajuste
  // anterior). Crea las producciones de las cartas que no están en el catálogo y aparta de las cartas las que Joan no
  // ofrece ahora. Después se vuelven a redactar las propuestas pendientes.
  r.post(
    '/plantillas/arsvia',
    ruta(async (_q, _r, u, c) => {
      const a = await c.ajustes(u.id);
      const firmaVieja = !a.firma.trim() || FIRMAS_ANTERIORES_ARSVIA.includes(a.firma.trim());
      await c.guardarAjustes(u.id, { ...a, plantillas: PLANTILLAS_ARSVIA, firma: firmaVieja ? FIRMA_ARSVIA : a.firma, firmaCa: a.firmaCa?.trim() ? a.firmaCa : FIRMA_ARSVIA_CA, cargo: a.cargo || 'Coordinación de proyectos y giras' });
      let catalogo = await c.espectaculos(u.id);
      let creadas = 0;
      for (const n of FICHAS_NUEVAS_ARSVIA) {
        const ya = catalogo.some((e) => e.origen === n.origen || TEXTOS_PRODUCCIONES_ARSVIA.some((t) => t.patron.test(n.nombre) && t.patron.test(e.nombre)));
        if (ya) continue;
        await c.guardarEspectaculo(u.id, n);
        creadas++;
      }
      if (creadas) catalogo = await c.espectaculos(u.id);
      let textos = 0;
      let apartadas = 0;
      for (const e of catalogo) {
        const t = TEXTOS_PRODUCCIONES_ARSVIA.find((x) => x.patron.test(e.nombre));
        const propio = (x: string | undefined) => !!x?.trim() && !TEXTOS_ANTERIORES_ARSVIA.includes(x.trim());
        const { id, ...resto } = e;
        const nueva: Omit<Espectaculo, 'id'> = { ...resto };
        if (t) {
          if (!propio(e.textoCarta)) nueva.textoCarta = t.es;
          if (!propio(e.textoCartaCa)) nueva.textoCartaCa = t.ca;
          if (!e.dossier) nueva.dossier = t.dossier;
          if (e.precioMin == null && t.precioMin != null) nueva.precioMin = t.precioMin;
          if (e.precioMax == null && t.precioMax != null) nueva.precioMax = t.precioMax;
        } else if (e.enCartas === undefined && FUERA_DE_CARTAS_ARSVIA.some((x) => x.test(e.nombre))) {
          nueva.enCartas = false;
          apartadas++;
        }
        if (JSON.stringify(nueva) === JSON.stringify(resto)) continue;
        await c.guardarEspectaculo(u.id, nueva, id);
        if (t) textos++;
      }
      const ajustes = await c.ajustes(u.id);
      catalogo = await c.espectaculos(u.id);
      return { textos, creadas, apartadas, ...(await c.reescribirPropuestas(u.id, rehacer(ajustes, catalogo))) };
    }),
  );
  r.post(
    '/propuestas/reescribir',
    ruta(async (_q, _r, u, c) => {
      const ajustes = await c.ajustes(u.id);
      const catalogo = await c.espectaculos(u.id);
      return c.reescribirPropuestas(u.id, rehacer(ajustes, catalogo));
    }),
  );

  // Al volver a redactar: también se vuelven a elegir las producciones (por si han cambiado las fichas o su prioridad).
  function rehacer(ajustes: AjustesCrm, catalogo: Espectaculo[]) {
    const disponibles = catalogo.filter((e) => e.enWeb !== false);
    return (p: PropuestaPreparada) => {
      const prog = ctx.programador(p.ref);
      // Se conservan las producciones (la carta combinada y las campañas llevan más que las elegidas), salvo las que
      // ya no están en el catálogo; si no queda ninguna, se vuelven a elegir.
      const siguen = p.espectaculos.filter((x) => catalogo.some((e) => e.id === x.id));
      const espectaculos = siguen.length ? siguen : prog && disponibles.length ? elegirEspectaculos(disponibles, prog, ajustes) : p.espectaculos;
      return { espectaculos, ...redactarPropuesta({ ...p, espectaculos }, ajustes, catalogo) };
    };
  }

  // Dossier en PDF: el de una línea con todo lo que entra en las cartas, o el que lleva un correo concreto.
  const mandarPdf = async (res: Response, d: DatosDossier, organizacion: string, descargar: boolean) => {
    if (!ctx.rutaFuentes) throw new ErrorCrm('El dossier en PDF no está disponible en este servidor', 503);
    const pdf = await pdfDossier(d, ctx.rutaFuentes);
    const nombre = nombreArchivoDossier(d, organizacion);
    res
      .set({ 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${nombre}"` })
      .send(pdf);
  };
  // ?linea=opera: el dossier de esa línea (la carta combinada lleva uno por línea).
  const lineaPedida = (x: unknown) => (typeof x === 'string' && LINEAS.includes(x as Linea) ? (x as Linea) : null);
  // Estas rutas se abren en una pestaña nueva: el aviso, en texto legible y no en JSON.
  const sinDossier = (res: Response, motivo: string) => {
    res.status(404).type('text/plain; charset=utf-8').send(`${motivo}. Rellena «En el dossier PDF» en la ficha de la producción (Catálogo).`);
  };
  r.get(
    '/dossier/:linea',
    ruta(async (q, res, u, c) => {
      const linea = q.params.linea as Linea;
      if (!LINEAS.includes(linea)) return sinDossier(res, 'Esa línea no existe');
      const idioma = q.query.idioma === 'ca' ? 'ca' : 'es';
      const [catalogo, a] = await Promise.all([c.espectaculos(u.id), c.ajustes(u.id)]);
      const d = dossierDeLinea(linea, idioma, catalogo, a);
      if (!d.producciones.length) return sinDossier(res, 'No hay producciones de esta línea en las cartas');
      await mandarPdf(res, d, a.organizacion, q.query.descargar === '1');
    }),
  );
  r.get(
    '/anexos/:id/dossier',
    ruta(async (q, res, u, c) => {
      const [catalogo, a] = await Promise.all([c.espectaculos(u.id), c.ajustes(u.id)]);
      const anexo = a.anexos?.find((x) => x.id === q.params.id);
      if (!anexo) return sinDossier(res, 'Ese anexo no existe (guárdalo antes de verlo)');
      const d = dossierDeAnexo(anexo, q.query.idioma === 'ca' ? 'ca' : 'es', catalogo, a);
      if (!d?.producciones.length) return sinDossier(res, 'El anexo no tiene producciones');
      await mandarPdf(res, d, a.organizacion, q.query.descargar === '1');
    }),
  );
  r.get(
    '/mensajes/:id/dossier',
    ruta(async (q, res, u, c) => {
      const [x, a] = await Promise.all([c.paraDossier(u.id, String(q.params.id)), c.ajustes(u.id)]);
      if (!x) return sinDossier(res, 'No existe ese correo');
      const campana = x.campana ? (a.campanas?.find((k) => k.id === x.campana) ?? null) : null;
      const linea = lineaPedida(q.query.linea);
      const d = linea ? dossierDeCorreo(x.espectaculos, x.idioma, a, linea) : dossierDelCorreo(x.espectaculos, x.idioma, a, { campana, catalogo: x.catalogo });
      if (!d) return sinDossier(res, 'Las producciones de este correo no tienen dossier preparado');
      await mandarPdf(res, d, a.organizacion, q.query.descargar === '1');
    }),
  );

  r.get(
    '/propuestas/:id/dossier',
    ruta(async (q, res, u, c) => {
      const [propuestas, catalogo, a] = await Promise.all([c.propuestas(u.id), c.espectaculos(u.id), c.ajustes(u.id)]);
      const p = propuestas.find((x) => x.id === q.params.id);
      if (!p) return sinDossier(res, 'No existe esa propuesta');
      const porId = new Map(catalogo.map((e) => [e.id, e]));
      const es = p.espectaculos.map((x) => porId.get(x.id)).filter((e): e is Espectaculo => !!e);
      const campana = p.campana ? (a.campanas?.find((k) => k.id === p.campana) ?? null) : null;
      const linea = lineaPedida(q.query.linea);
      const d = linea ? dossierDeCorreo(es, p.idioma, a, linea) : dossierDelCorreo(es, p.idioma, a, { campana, catalogo });
      if (!d) return sinDossier(res, 'Las producciones de esta propuesta no tienen dossier preparado');
      await mandarPdf(res, d, a.organizacion, q.query.descargar === '1');
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
      const deFestival = ref ? ctx.contactoFestival?.(ref) : undefined;
      const ccaa = p?.ccaa ?? (texto(b.ccaa, 100) || null);
      const nombre = texto(b.nombre, 300) || (contacto?.municipio && /ayuntamiento|ajuntament|concello|alcald|junta de gobierno/i.test(p?.nombre ?? '') ? `Ayuntamiento de ${contacto.municipio}` : (p?.nombre ?? ''));
      if (!nombre) throw new ErrorCrm('Falta el nombre', 400);
      return c.guardarEntidad(u.id, {
        ref,
        nombre,
        tipo: ['ayuntamiento', 'auditorio', 'teatro', 'festival', 'otro'].includes(b.tipo) ? b.tipo : deFestival ? 'festival' : /ayuntamiento|ajuntament|concello|alcald|junta de gobierno/i.test(p?.nombre ?? nombre) ? 'ayuntamiento' : 'otro',
        municipio: contacto?.municipio ?? p?.ciudad ?? (texto(b.municipio, 200) || null),
        provincia: p?.provincia ?? (texto(b.provincia, 100) || null),
        ccaa,
        persona: texto(b.persona, 200) || contacto?.nombre || null,
        email: texto(b.email, 200) || contacto?.email?.split(/[;,\s]+/)[0] || deFestival?.email || null,
        telefono: texto(b.telefono, 100) || contacto?.telefono || deFestival?.telefono || null,
        idioma: b.idioma === 'ca' || b.idioma === 'es' ? b.idioma : idiomaDe(ccaa, contacto?.partido),
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
  /** Cómo llegará el correo: el texto maquetado en HTML, como sale al enviarlo desde la web. */
  r.post(
    '/vista-previa',
    ruta(async (req, _r, u, c) => {
      const cuerpo = acortarSaludo(typeof req.body?.cuerpo === 'string' ? req.body.cuerpo.slice(0, 50_000) : '');
      const a = await c.ajustes(u.id);
      // El título de la línea, en el primer correo (de una propuesta o de la Bandeja).
      let titulo: string | null = null;
      let idioma: 'es' | 'ca' = 'es';
      if (typeof req.body?.propuesta === 'string') {
        const [ps, catalogo] = await Promise.all([c.propuestas(u.id), c.espectaculos(u.id)]);
        const p = ps.find((x) => x.id === req.body.propuesta);
        if (p) {
          idioma = p.idioma;
          titulo = tituloCorreo(catalogo.filter((e) => p.espectaculos.some((x) => x.id === e.id)), p.idioma, a);
        }
      } else if (typeof req.body?.mensaje === 'string') {
        const x = await c.paraDossier(u.id, req.body.mensaje).catch(() => null);
        if (x) idioma = x.idioma;
        if (x?.paso === 1) titulo = tituloCorreo(x.espectaculos, x.idioma, a);
      }
      return { html: correoHtml(cuerpo, { cabecera: a.organizacion, titulo, pie: pieBaja(idioma), idioma }) };
    }),
  );
  /** Enviar ahora desde la web (con el dossier en el primero): cuenta como envío efectivo y en el tope del día. */
  r.post(
    '/mensajes/:id/enviar',
    ruta(async (req, _r, u, c) => {
      if (!enviar) throw new ErrorCrm('El envío desde la web no está conectado: envíalo desde tu correo y marca «Ya lo he enviado»', 409);
      const a = await c.ajustes(u.id);
      if (!a.email) throw new ErrorCrm('Falta el email del remitente en «Remitente y firma»', 409);
      const m = await c.paraEnviar(u.id, String(req.params.id));
      if (m.estado === 'enviado') return { enviado: true };
      if (m.sec_estado !== 'activa') throw new ErrorCrm('El seguimiento de este sitio está parado: no se envía', 409);
      if (m.no_contactar) throw new ErrorCrm('Este sitio está marcado como «no contactar»', 409);
      const cupo = cupoDiario(a);
      const hoy = await c.enviadosDesde(u.id, inicioDiaMadrid());
      if (hoy >= cupo)
        throw new ErrorCrm(`Hoy ya han salido ${hoy} correos y el tope de hoy es ${cupo} (sube 10 cada semana hasta tu límite diario). Mañana podrás enviar más.`, 409);
      const ok = await enviarMensaje(c, enviar, u.id, m, a, { completo: true, rutaFuentes: ctx.rutaFuentes });
      if (!ok) throw new ErrorCrm('El servicio de correo no ha aceptado el envío. Vuelve a intentarlo en unos minutos.', 502);
      return { enviado: true, hoy: hoy + 1, cupo };
    }),
  );
  r.post('/mensajes/:id/enviado', ruta(async (req, _r, u, c) => c.registrarEnvio(u.id, String(req.params.id))));

  // ---------- Propuestas preparadas ----------

  r.get('/propuestas', ruta(async (_q, _r, u, c) => ({ items: await c.propuestas(u.id) })));
  r.post(
    '/propuestas/preparar',
    ruta(async (req, _r, u, c) => {
      const limite = Math.min(Math.max(Math.round(Number(req.body?.limite) || 20), 1), 100);
      const ccaa = Array.isArray(req.body?.ccaa) ? req.body.ccaa.filter((x: unknown) => typeof x === 'string') : typeof req.body?.ccaa === 'string' && req.body.ccaa ? [req.body.ccaa] : [];
      const campana = typeof req.body?.campana === 'string' && req.body.campana ? req.body.campana : undefined;
      if (!(await c.espectaculos(u.id)).length) throw new ErrorCrm('Primero añade tu catálogo de espectáculos', 400);
      return { nuevas: await prepararParaCuenta(c, ctx, u.id, { limite, ccaa, ...(campana && { campana }) }) };
    }),
  );
  /** Comunidades y sus provincias, tal como vienen en los datos (para el territorio de las campañas). */
  r.get(
    '/territorio',
    ruta(async () => {
      const m = new Map<string, Set<string>>();
      for (const p of ctx.programadores()) if (p.ccaa) (m.get(p.ccaa) ?? m.set(p.ccaa, new Set()).get(p.ccaa)!).add(p.provincia ?? '');
      return {
        items: [...m]
          .map(([ccaa, ps]) => ({ ccaa, provincias: [...ps].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')) }))
          .sort((a, b) => a.ccaa.localeCompare(b.ccaa, 'es')),
      };
    }),
  );
  /** Anexos a medida (dossieres con producciones de varias líneas). */
  r.put(
    '/anexos',
    ruta(async (req, _r, u, c) => {
      const xs = Array.isArray(req.body?.anexos) ? req.body.anexos.slice(0, 30) : [];
      const textosAnexo = (x: Record<string, unknown> | undefined) => ({
        titulo: texto(x?.titulo, 200),
        subtitulo: texto(x?.subtitulo, 300),
        condiciones: texto(x?.condiciones, 6000),
        notaFinal: texto(x?.notaFinal, 2000),
      });
      const anexos: Anexo[] = xs.map((x: Record<string, unknown>) => ({
        id: texto(x.id, 60) || randomUUID(),
        nombre: texto(x.nombre, 120) || 'Anexo',
        espectaculos: ids(x.espectaculos),
        es: textosAnexo(x.es as Record<string, unknown>),
        ca: textosAnexo(x.ca as Record<string, unknown>),
      }));
      await c.guardarAjustes(u.id, { ...(await c.ajustes(u.id)), anexos });
      return { anexos };
    }),
  );
  /** Campañas: producciones, territorio y su carta. */
  r.put(
    '/campanas',
    ruta(async (req, _r, u, c) => {
      const xs = Array.isArray(req.body?.campanas) ? req.body.campanas.slice(0, 30) : [];
      const carta = (x: Record<string, unknown> | undefined) => ({
        asunto: texto(x?.asunto, 300),
        intro: texto(x?.intro, 4000),
        texto: texto(x?.texto, 12000),
        cierre: texto(x?.cierre, 4000),
      });
      const lista = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string').map((y) => y.slice(0, 80)).slice(0, 60) : []);
      const campanas: Campana[] = xs.map((x: Record<string, unknown>) => ({
        id: texto(x.id, 60) || randomUUID(),
        nombre: texto(x.nombre, 120) || 'Campaña',
        espectaculos: ids(x.espectaculos),
        ccaa: lista(x.ccaa),
        provincias: lista(x.provincias),
        anexo: typeof x.anexo === 'string' && x.anexo ? x.anexo.slice(0, 60) : null,
        es: carta(x.es as Record<string, unknown>),
        ca: carta(x.ca as Record<string, unknown>),
      }));
      await c.guardarAjustes(u.id, { ...(await c.ajustes(u.id)), campanas });
      return { campanas };
    }),
  );
  /** La zona de las propuestas («Resto de España», «Cataluña», una comunidad o toda España): se guarda en la cuenta. */
  r.put(
    '/zona',
    ruta(async (req, _r, u, c) => {
      const zona = typeof req.body?.zona === 'string' ? texto(req.body.zona, 80) : '';
      await c.guardarAjustes(u.id, { ...(await c.ajustes(u.id)), zona });
      return { zona };
    }),
  );
  /** Rehacer la tanda: borra las pendientes sin retocar y prepara otras con las reglas de hoy. */
  r.post(
    '/propuestas/rehacer',
    ruta(async (req, _r, u, c) => {
      if (!(await c.espectaculos(u.id)).length) throw new ErrorCrm('Primero añade tu catálogo de espectáculos', 400);
      // Una campaña: solo sus propuestas. Si no, las generales de la zona elegida; las demás se quedan como están.
      const campana = typeof req.body?.campana === 'string' && req.body.campana ? req.body.campana : undefined;
      const zona = (await c.ajustes(u.id)).zona;
      const borradas = await c.borrarPendientes(u.id, (ccaa, cp) => (campana ? cp === campana : !cp && enZona(ccaa, zona)));
      const limite = Math.min(Math.max(Math.round(Number(req.body?.limite) || 20), 1), 100);
      return { borradas, nuevas: await prepararParaCuenta(c, ctx, u.id, { limite, ...(campana && { campana }) }) };
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
