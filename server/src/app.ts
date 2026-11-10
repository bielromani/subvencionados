import express, { type Request } from 'express';
import { accion } from './accion.js';
import { emailAviso } from './avisos.js';
import type { AlmacenCuentas, DatosLista } from './cuentas.js';
import { type Enviar, escaparHtml } from './email.js';
import { rutasCuenta, usuarioDeSesion } from './rutasCuenta.js';
import { alertasCrm, type ContextoCrm, prepararParaCuenta, rutasCrm } from './rutasCrm.js';
import { descargarCatalogoArsvia } from './crm/importar.js';
import { noEncaja } from './crm/prospeccion.js';
import { cubreTerritorio, type OportunidadGestion, oportunidadesGestion } from './gestionFestivales.js';
import type { AlmacenCrm } from './crm/almacen.js';
import { estimarCierre } from './cierre.js';
import { aICal, calendario, type EventoCalendario, eventosDe, utilParaManager } from './calendario.js';
import { normalizar } from './clasificacion/musica.js';
import { PROVINCIAS_INE } from './referencias.js';
import { mercado } from './mercado.js';
import type { ContactoMunicipio, Contactos } from './contactos.js';
import { type Circuito, circuitos, type Festival, festivales, idProgramador, type Programador, programadores } from './directorio.js';
import type { FestivalExterno } from './festivalesExternos.js';
import { indiceSubvenciones, type IndiceSubvenciones, PEDANIA, type Pedania } from './subvencionesMunicipio.js';
import { abierta, type ContratoVista, filtrarContratos, mercadoContratos } from './contratos/vista.js';
import { coincidenciasGenericas, nuevas, porGrupo, seleccionar } from './inicio.js';
import type { Repositorio } from './db.js';
import { type Coincidencia, emparejar, plazo } from './emparejamiento.js';
import { agruparOrganismos, idOrganismo, type Organismo } from './organismos.js';
import { LINEAS, PERFIL_POR_DEFECTO, validarPerfil } from './perfil.js';
import { CCAA } from './regiones.js';
import { fichaBasica } from './ficha/basica.js';
import { tituloCorto } from './titulo.js';
import type { Ficha } from './ficha/esquema.js';
import { documentosConTexto } from './ficha/fichas.js';
import { ESTILOS, type Convocatoria, type Perfil } from './tipos.js';
import { type AjustesCrm, cupoDiario } from './crm/tipos.js';
import { puedeEntrar } from './acceso.js';
import { configImapDesdeEntorno, detectarRespuestas, leerBuzon } from './crm/respuestas.js';

const lista = (valor: unknown): string[] =>
  typeof valor === 'string' && valor ? valor.split(',').map((x) => x.trim()).filter(Boolean) : [];

/** Lo que devolvemos al cliente: la convocatoria sin el texto bruto y con el plazo calculado hoy. */
function vista(c: Convocatoria) {
  const { texto: _texto, ...resto } = c;
  // Sin fecha de fin publicada, el cierre aproximado a partir del texto del plazo ("15 días hábiles...").
  const cierreAproximado = c.fechaFinSolicitud ? null : (estimarCierre(c)?.fecha ?? null);
  return { ...resto, tituloCorto: tituloCorto(c.titulo), plazo: plazo(c), cierreAproximado, organismoId: idOrganismo(c.organoNiveles) };
}

/** En los listados no hace falta el texto completo de los extractos. */
function vistaResumida(c: Convocatoria) {
  const v = vista(c);
  return { ...v, anuncios: v.anuncios.map(({ texto: _t, ...a }) => a) };
}

function filtrar(convocatorias: Convocatoria[], q: Request['query']): Convocatoria[] {
  const estilos = lista(q.estilo);
  const ccaa = lista(q.ccaa);
  const administraciones = lista(q.administracion);
  const lineas = lista(q.linea);
  const texto = typeof q.q === 'string' ? normalizar(q.q.trim()) : '';
  const plazoBuscado = typeof q.plazo === 'string' ? q.plazo : '';
  // Por defecto solo lo que le sirve al mánager (para sus grupos o para quien les contrata); todas=true, todo.
  const incluirDescartadas = q.todas === 'true';
  const para = q.para === 'grupos' || q.para === 'programadores' ? q.para : '';
  const tipo = typeof q.tipo === 'string' ? q.tipo : '';
  const desde = typeof q.desde === 'string' ? q.desde : '';

  // ids=a,b: las guardadas por el usuario, sean cuales sean.
  const ids = new Set(lista(q.ids));
  return convocatorias.filter((c) => {
    const cl = c.clasificacion;
    if (ids.size) return ids.has(c.id);
    if (!incluirDescartadas && !utilParaManager(c)) return false;
    if (para && cl.destino !== para) return false;
    // La programación cultural general de un ayuntamiento no tiene estilo: vale para todos.
    if (estilos.length && cl.musical && !estilos.some((e) => cl.estilosCompatibles.includes(e as never))) return false;
    // Una convocatoria sin restricción territorial aplica a cualquier comunidad.
    if (ccaa.length && !c.ambitoNacional && !ccaa.some((x) => c.ccaa.includes(x))) return false;
    if (tipo && c.tipo !== tipo) return false;
    if (desde && (c.fechaPublicacion ?? '') < desde) return false;
    if (administraciones.length && !administraciones.includes(c.administracion)) return false;
    if (lineas.length && !lineas.some((l) => cl.lineas.includes(l as never))) return false;
    if (plazoBuscado === 'vigentes' ? !['abierta', 'proxima'].includes(plazo(c)) : plazoBuscado && plazo(c) !== plazoBuscado) return false;
    if (texto && !normalizar(`${c.titulo} ${c.organoNiveles.join(' ')} ${c.texto}`).includes(texto)) {
      return false;
    }
    return true;
  });
}

/** recientes: por fecha de publicación; cierre: las que cierran antes primero (solo con plazo abierto o próximo). */
function ordenar(convocatorias: Convocatoria[], orden: unknown): Convocatoria[] {
  if (orden !== 'cierre') return convocatorias;
  const clave = (c: Convocatoria) => {
    const p = plazo(c);
    return p === 'abierta' || p === 'proxima' ? (c.fechaFinSolicitud ?? '9999') : '~';
  };
  return [...convocatorias].sort((a, b) => clave(a).localeCompare(clave(b)));
}

export interface OpcionesApp {
  /** Lee el texto extraído de un documento (ruta relativa a datos/bdns). */
  leerTexto?: (relativa: string) => string | null;
  /** Ficha extraída de las bases (datos/fichas/), si la hay. */
  fichas?: { leer: (codigoBdns: string) => Ficha | null; tiene: (codigoBdns: string) => boolean };
  /** Festivales de los directorios del sector (datos/festivales/directorios.json). */
  festivalesExternos?: FestivalExterno[];
  /** Pedanías de los registros oficiales con su municipio (datos/directorio/pedanias.json). */
  pedanias?: Pedania[];
  /** Contratos de música de la Plataforma de Contratación (datos/contratos/). */
  contratos?: ContratoVista[];
  /** Directorio de ayuntamientos y responsables de cultura (datos/directorio/). */
  contactos?: Contactos | null;
  /** Cuentas de usuario (Postgres); sin ellas, las listas viven solo en el navegador. */
  cuentas?: AlmacenCuentas | null;
  /** Envío de emails (avisos y restablecer contraseña). */
  enviar?: Enviar | null;
  /** Prospección y seguimiento de cada cuenta (necesita las cuentas). */
  crm?: AlmacenCrm | null;
  /** Web privada: toda la información pide sesión de una persona autorizada (ver acceso.ts). */
  privado?: boolean;
}

/** Lo que responde sin sesión en la web privada: entrar, la salud, las tareas programadas (con su secreto) y el calendario personal (con su enlace secreto). */
const SIN_SESION = [/^\/cuenta(\/|$)/, /^\/salud$/, /^\/crm-envios$/, /^\/avisos$/, /^\/mi-calendario\.ics$/];

/** "Palmas de Gran Canaria, Las" (INE) y "Las Palmas de Gran Canaria" son el mismo municipio. */
export function mismoMunicipio(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const forma = (x: string) => {
    const n = normalizar(x);
    const m = n.match(/^(.*), (el|la|los|las|l|lo|o|a|os|as|es|sa|ses|els|les)$/);
    return m ? `${m[2]} ${m[1]}` : n;
  };
  return forma(a) === forma(b);
}

const filtroContratos = (q: Request['query']) => ({
  q: typeof q.q === 'string' ? q.q : undefined,
  ccaa: lista(q.ccaa),
  provincia: lista(q.provincia),
  estilo: lista(q.estilo),
  estado: (q.estado === 'abiertas' || q.estado === 'adjudicadas' ? q.estado : '') as 'abiertas' | 'adjudicadas' | '',
  menor: (q.menor === 'si' || q.menor === 'no' ? q.menor : '') as 'si' | 'no' | '',
  desde: typeof q.desde === 'string' ? q.desde : undefined,
});

const PIE_BAJA = 'Si no desea recibir más correos nuestros, responda a este mensaje indicándolo y no volveremos a escribirle.';

/** Hora, minuto y si es día laborable en Madrid. */
function horaMadrid(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { hora: Number(p.hour), minuto: Number(p.minute), laborable: !['Sat', 'Sun'].includes(p.weekday!) };
}

export function crearApp(repo: Repositorio, opciones: OpcionesApp = {}) {
  const app = express();
  const resumida = (c: Convocatoria) => ({ ...vistaResumida(c), tieneFicha: opciones.fichas?.tiene(c.codigoBdns) ?? false });
  const contratos = opciones.contratos ?? [];
  const contratoResumido = (c: ContratoVista) => {
    const { documentos: _d, ...resto } = c;
    return { ...resto, abierta: abierta(c) };
  };


  // Los organismos se recalculan solo cuando cambian las convocatorias.
  let organismosCache: { version: number; lista: Organismo[]; porId: Map<string, Organismo> } | null = null;
  const organismos = () => {
    if (organismosCache?.version !== repo.version) {
      const lista = agruparOrganismos(repo.listarConvocatorias());
      organismosCache = { version: repo.version, lista, porId: new Map(lista.map((o) => [o.id, o])) };
    }
    return organismosCache;
  };
  // Detrás del proxy de Vercel: https y la IP real (para cookies Secure y enlaces en los emails).
  app.set('trust proxy', true);
  app.use(express.json({ limit: '100kb' }));
  if (opciones.privado) {
    app.use('/api', async (req, res, next) => {
      if (SIN_SESION.some((r) => r.test(req.path))) return next();
      const u = await usuarioDeSesion(opciones.cuentas ?? null, req).catch(() => null);
      if (!u || !puedeEntrar(u.email)) {
        res.status(401).set('Cache-Control', 'no-store').json({ error: 'Esta web es privada: entra con tu cuenta.', privado: true });
        return;
      }
      res.set('Cache-Control', 'private, no-store');
      next();
    });
  }
  app.use('/api/cuenta', rutasCuenta(opciones.cuentas ?? null, opciones.enviar ?? null, !!opciones.privado));

  app.get('/api/salud', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/meta', (_req, res) => {
    const todas = repo.listarConvocatorias();
    res.json({
      ccaa: CCAA,
      estilos: ESTILOS,
      lineas: LINEAS,
      total: todas.length,
      musicales: todas.filter((c) => c.clasificacion.musical).length,
      utiles: todas.filter(utilParaManager).length,
      culturaGeneral: todas.filter((c) => c.clasificacion.culturaGeneral).length,
      ultimaActualizacion: todas.map((c) => c.actualizada).sort().at(-1) ?? null,
      fuente: 'Base de Datos Nacional de Subvenciones (BDNS) · IGAE, Ministerio de Hacienda',
    });
  });

  app.get('/api/convocatorias', (req, res) => {
    const resultado = ordenar(filtrar(visibles(req), req.query), req.query.orden);
    const porPagina = Math.min(Math.max(Number(req.query.porPagina) || 50, 1), 500);
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    const items = resultado.slice((pagina - 1) * porPagina, pagina * porPagina);
    res.json({ total: resultado.length, pagina, porPagina, items: items.map(resumida) });
  });

  app.get('/api/convocatorias/:id', (req, res) => {
    const c = repo.obtenerConvocatoria(req.params.id);
    if (!c) {
      res.status(404).json({ error: 'Convocatoria no encontrada' });
      return;
    }
    const ficha = opciones.fichas?.leer(c.codigoBdns) ?? null;
    // Sin ficha leída por IA, la básica automática: extracto por apartados y frases literales de las bases.
    const basica = ficha ? null : fichaBasica(c.anuncios, documentosConTexto(c, (a) => opciones.leerTexto?.(a) ?? null));
    // Si la convoca un ayuntamiento, a quién contactar allí.
    const contacto = opciones.contactos?.porCodigo(c.ubicacion?.codigoMunicipio) ?? null;
    // Ediciones anteriores, de la más reciente a la más antigua, para saber cuánto se concedió de verdad.
    const anteriores = (c.serie?.convocatorias ?? [])
      .filter((s) => s.id !== c.id && (s.anio ?? 0) <= Number(c.fechaPublicacion?.slice(0, 4) ?? 9999))
      .reverse()
      .map((s) => repo.obtenerConvocatoria(s.id))
      .filter((x): x is Convocatoria => x !== null);
    const hoy = new Date();
    res.json({ ...vista(c), clasificacion: c.clasificacion, ficha, basica, contacto, accion: accion(c, ficha, basica, anteriores, contacto !== null, hoy) });
  });

  // "Añadir al calendario" de una convocatoria: apertura y cierre del plazo (o la próxima edición prevista).
  app.get('/api/convocatorias/:id/calendario.ics', (req, res) => {
    const c = repo.obtenerConvocatoria(req.params.id);
    if (!c) {
      res.status(404).json({ error: 'Convocatoria no encontrada' });
      return;
    }
    const base = `${req.protocol}://${req.get('host')}`;
    res.type('text/calendar; charset=utf-8').set('Content-Disposition', `attachment; filename="convocatoria-${c.codigoBdns}.ics"`);
    res.send(aICal(eventosDe(c, new Date()), base));
  });

  app.get('/api/convocatorias/:id/documentos/:idDocumento', (req, res) => {
    const c = repo.obtenerConvocatoria(req.params.id);
    const doc = c?.documentos.find((d) => String(d.id) === req.params.idDocumento);
    const texto = doc?.texto && opciones.leerTexto ? opciones.leerTexto(doc.texto.archivo) : null;
    if (!doc || !texto) {
      res.status(404).json({ error: 'Texto del documento no disponible' });
      return;
    }
    // Las páginas van separadas por saltos de página (\f), para poder citarlas.
    res.json({ id: doc.id, nombre: doc.nombre, url: doc.url, paginas: texto.split('\f').map((p) => p.trim()) });
  });

  // Mismos filtros que el listado (estilo, ccaa, administracion, linea, q); el tipo y el plazo los fija el calendario.
  const eventos = (req: Request) =>
    calendario(filtrar(visibles(req), { ...req.query, tipo: undefined, plazo: undefined }));

  app.get('/api/calendario', (req, res) => {
    // Licitaciones de conciertos con plazo abierto: el día que cierran.
    const licitaciones = filtrarContratos(contratos, { ccaa: lista(req.query.ccaa), estilo: lista(req.query.estilo), estado: 'abiertas' })
      .sort((a, b) => (a.finPlazo ?? '').localeCompare(b.finPlazo ?? ''))
      .map(contratoResumido);
    res.json({ eventos: eventos(req), licitaciones });
  });

  app.get('/api/calendario.ics', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    res.type('text/calendar; charset=utf-8').set('Content-Disposition', 'attachment; filename="subvenciones-musica.ics"');
    res.send(aICal(eventos(req), base));
  });

  // Música compatible con jazz, clásica u ópera (o el estilo pedido), sin formación salvo que se pida.
  app.get('/api/mercado', (req, res) => {
    const conFormacion = req.query.formacion === 'true';
    const base = filtrar(repo.listarConvocatorias(), { ...req.query, todas: undefined, cultura: undefined, plazo: undefined }).filter(
      (c) => c.clasificacion.estilosCompatibles.length > 0 && (conFormacion || !c.clasificacion.lineas.includes('formacion')),
    );
    res.json(mercado(base));
  });

  // Directorio de dónde tocar: se recalcula solo cuando cambian las convocatorias.
  type ProgramadorConContacto = Programador & {
    codigoIne: string | null;
    conContacto: boolean;
    /** Ayudas de cultura y música recibidas por el ayuntamiento y las entidades del municipio (o por la pedanía). */
    subvenciones: { importe: number; numero: number; ultima: string | null } | null;
  };
  let directorio: {
    version: number;
    programadores: ProgramadorConContacto[];
    festivales: Festival[];
    circuitos: Circuito[];
    subvenciones: IndiceSubvenciones;
  } | null = null;
  /** Un sitio que no contrata por la Plataforma pero recibe ayudas para programar: también es un cliente. */
  const sinContratos = (id: string, nombre: string, m: ContactoMunicipio | null, codigoProvincia: string | null): Programador => ({
    id,
    nombre,
    ciudad: m?.municipio ?? null,
    provincia: m?.provincia ?? (codigoProvincia ? (PROVINCIAS_INE[codigoProvincia]?.[0] ?? null) : null),
    codigoProvincia: m?.codigoIne.slice(0, 2) ?? codigoProvincia,
    ccaa: m?.ccaa ?? (codigoProvincia ? (PROVINCIAS_INE[codigoProvincia]?.[1] ?? null) : null),
    web: m?.ayuntamiento.web ?? null,
    contratos: 0,
    menores: 0,
    adjudicado: 0,
    importeHabitual: null,
    estilos: {},
    empresas: 0,
    primero: null,
    ultimo: null,
    meses: [],
    recientes: [],
    rango: null,
    proveedores: [],
    recientesEstilo: [],
    formaciones: {},
    rangos: {},
  });
  const tieneContactoCultura = (m: ContactoMunicipio | null) => !!m && (m.personas.length > 0 || !!m.cultura.email || !!m.cultura.telefono);
  const dir = () => {
    if (directorio?.version !== repo.version) {
      const conv = repo.listarConvocatorias();
      const indice = indiceSubvenciones(conv, opciones.contactos ?? null, opciones.pedanias ?? []);
      const deMunicipio = (ine: string | null) => {
        const s = ine ? indice.porMunicipio.get(ine) : undefined;
        if (!s) return null;
        const todas = [s.ayuntamiento, ...s.entidades];
        const ultima = todas.map((x) => x.ultima).filter((x): x is string => !!x).sort().at(-1) ?? null;
        return { importe: todas.reduce((t, x) => t + x.importe, 0), numero: todas.reduce((t, x) => t + x.numero, 0), ultima };
      };
      const progs: ProgramadorConContacto[] = programadores(contratos).map((p) => {
        const m = opciones.contactos?.deOrgano(p.nombre, p.ciudad, p.codigoProvincia) ?? null;
        return { ...p, codigoIne: m?.codigoIne ?? null, conContacto: tieneContactoCultura(m), subvenciones: deMunicipio(m?.codigoIne ?? null) };
      });
      // Ayuntamientos y pedanías sin contratos de música, pero con ayudas de cultura o música.
      const conFicha = new Set(progs.map((p) => p.codigoIne).filter(Boolean));
      for (const [ine, s] of indice.porMunicipio) {
        if (conFicha.has(ine) || !s.ayuntamiento.numero) continue;
        const m = opciones.contactos?.porCodigo(ine) ?? null;
        if (!m) continue;
        progs.push({ ...sinContratos(`p-ine-${ine}`, `Ayuntamiento de ${m.municipio}`, m, null), codigoIne: ine, conContacto: tieneContactoCultura(m), subvenciones: deMunicipio(ine) });
      }
      const nombres = new Set(progs.map((p) => `${normalizar(p.nombre)}|${p.codigoProvincia ?? ''}`));
      for (const x of indice.pedanias) {
        if (nombres.has(`${normalizar(x.nombre)}|${x.codigoProvincia ?? ''}`)) continue;
        const id = `p-ped-${normalizar(`${x.nombre} ${x.codigoProvincia ?? ''}`).replace(/[^a-z0-9]+/g, '-')}`;
        progs.push({ ...sinContratos(id, x.nombre, x.municipio, x.codigoProvincia), web: null, codigoIne: null, conContacto: false, subvenciones: { importe: x.importe, numero: x.numero, ultima: x.ultima } });
      }
      directorio = {
        version: repo.version,
        programadores: progs,
        festivales: festivales(contratos, conv, opciones.festivalesExternos ?? []),
        circuitos: circuitos(contratos, conv),
        subvenciones: indice,
      };
    }
    return directorio;
  };
  const paginar = <T,>(req: Request, xs: T[], salida: (x: T) => unknown = (x) => x) => {
    const porPagina = Math.min(Math.max(Number(req.query.porPagina) || 50, 1), 200);
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    return { total: xs.length, pagina, porPagina, items: xs.slice((pagina - 1) * porPagina, pagina * porPagina).map(salida) };
  };
  const coincideTexto = (q: unknown, ...textos: (string | null)[]) =>
    typeof q !== 'string' || !q.trim() || normalizar(textos.filter(Boolean).join(' ')).includes(normalizar(q.trim()));

  // Lo justo para llamar o escribir desde un listado: la persona de cultura (o el ayuntamiento) con email y teléfono.
  const contactoBreve = (codigoIne: string | null) => {
    const m = opciones.contactos?.porCodigo(codigoIne);
    if (!m) return null;
    const p = m.personas.find((x) => x.email || x.telefono) ?? m.personas[0];
    return {
      municipio: m.municipio,
      nombre: p?.nombre ?? null,
      cargo: p?.cargo ?? null,
      email: p?.email ?? m.cultura.email ?? m.ayuntamiento.email,
      telefono: p?.telefono ?? m.cultura.telefono ?? m.ayuntamiento.telefono,
      deCultura: !!(p?.email || p?.telefono || m.cultura.email || m.cultura.telefono),
      poblacion: m.poblacion,
    };
  };
  /** Un festival también se puede seguir y recibir propuestas: como cliente, con su estilo y su web. */
  const festivalComoCliente = (id: string): ProgramadorConContacto | undefined => {
    if (!id.startsWith('f-')) return undefined;
    const f = dir().festivales.find((x) => x.id === id);
    if (!f) return undefined;
    return {
      ...sinContratos(f.id, f.nombre, null, null),
      ciudad: f.lugar,
      provincia: f.provincia,
      ccaa: f.ccaa,
      web: f.directorios.find((d) => d.web)?.web ?? null,
      contratos: f.fuentes.filter((x) => x.tipo === 'contrato').length,
      estilos: Object.fromEntries(f.estilos.map((e) => [e, 1])),
      codigoIne: null,
      conContacto: f.directorios.some((d) => d.email || d.telefono),
      subvenciones: null,
    };
  };
  // Prospección y seguimiento (CRM) de cada cuenta, con los datos públicos de la app.
  const crm = opciones.crm ?? null;
  const vigente = (c: Convocatoria) => {
    const p = plazo(c);
    return p === 'abierta' || p === 'proxima';
  };
  const ctxCrm: ContextoCrm = {
        programador: (id) => dir().programadores.find((p) => p.id === id) ?? festivalComoCliente(id),
        contactoFestival: (id) => {
          const f = dir().festivales.find((x) => x.id === id);
          if (!f) return undefined;
          const d = f.directorios;
          return { email: d.find((x) => x.email)?.email ?? null, telefono: d.find((x) => x.telefono)?.telefono ?? null };
        },
        contacto: contactoBreve,
        convocatoria: (id) => repo.obtenerConvocatoria(id),
        contrato: (id) => contratos.find((c) => c.id === id),
        ayudasPara: (t) =>
          repo
            .listarConvocatorias()
            .filter(
              (c) =>
                utilParaManager(c) &&
                c.clasificacion.destino === 'programadores' &&
                vigente(c) &&
                cubreTerritorio(c, t),
            )
            .sort((a, b) => (a.fechaFinSolicitud ?? '9999').localeCompare(b.fechaFinSolicitud ?? '9999')),
        licitacionesAbiertas: () => contratos.filter((c) => abierta(c)).sort((a, b) => (a.finPlazo ?? '9999').localeCompare(b.finPlazo ?? '9999')),
        licitacionesDe: (id) => contratos.filter((c) => abierta(c) && idProgramador(c) === id),
        ayudasNuevas: (desde) =>
          repo
            .listarConvocatorias()
            .filter((c) => utilParaManager(c) && (c.fechaPublicacion ?? '') >= desde)
            .sort((a, b) => (b.fechaPublicacion ?? '').localeCompare(a.fechaPublicacion ?? '')),
        resumida,
        contratoResumido,
        programadores: () => dir().programadores,
        ayudasProgramadores: () => repo.listarConvocatorias().filter((c) => utilParaManager(c) && c.clasificacion.destino === 'programadores' && vigente(c)),
        gestionDe: (id) => oportunidadesDeGestion().find((o) => o.programador === id),
  };
  app.use('/api/crm', rutasCrm(opciones.cuentas ?? null, crm, ctxCrm, opciones.enviar ?? null));

  const clienteResumido = ({ recientes: _r, recientesEstilo: _e, proveedores: _p, ...p }: ProgramadorConContacto) => ({ ...p, contactoBreve: contactoBreve(p.codigoIne) });
  /** Filtros de clientes: comunidad, provincia, estilo, mes en que suelen contratar, con contacto, guardados (ids). */
  /** Tipo de entidad por el nombre del órgano que contrata (lo que dicen los contratos públicos). */
  const tipoEntidad = (nombre: string) => {
    const n = normalizar(nombre);
    if (/\b(festival|festivales|jaialdi)\b/.test(n)) return 'festival';
    if (/\b(auditori|auditorio|palau de la musica|palacio de (la musica|congresos|festivales))/.test(n)) return 'auditorio';
    if (/\b(teatro|teatre|teatros|teatres|antzoki)/.test(n)) return 'teatro';
    if (PEDANIA.test(n)) return 'pedania';
    if (/\b(ayuntamiento|ajuntament|concello|udala|alcaldia|alcalde|junta de gobierno|pleno|municipal)/.test(n)) return 'ayuntamiento';
    return 'otro';
  };
  const filtrarClientes = (q: Request['query'], zona: string[] = []) => {
    const ccaa = lista(q.ccaa).length ? lista(q.ccaa) : zona;
    const provincia = lista(q.provincia);
    const estilos = lista(q.estilo);
    const meses = lista(q.mes).map(Number).filter(Boolean);
    const ids = new Set(lista(q.ids));
    return dir().programadores.filter(
      (p) =>
        (ids.size ? ids.has(p.id) : true) &&
        (!ccaa.length || (p.ccaa && ccaa.includes(p.ccaa))) &&
        (!provincia.length || (p.provincia && provincia.includes(p.provincia))) &&
        (!estilos.length || estilos.some((e) => (p.estilos[e as keyof typeof p.estilos] ?? 0) > 0)) &&
        (!meses.length || meses.some((m) => p.meses.includes(m))) &&
        (q.contacto !== 'si' || p.conContacto) &&
        (q.subvenciones !== 'si' || !!p.subvenciones) &&
        (!q.tipo || tipoEntidad(p.nombre) === q.tipo) &&
        coincideTexto(q.q, p.nombre, p.ciudad, p.provincia),
    );
  };

  // Emails de los clientes del filtro (para un envío en copia oculta): uno por sitio, sin repetir.
  app.get('/api/programadores/emails', (req, res) => {
    const vistos = new Set<string>();
    let deCultura = 0;
    const xs = filtrarClientes(req.query);
    for (const p of xs) {
      const c = contactoBreve(p.codigoIne);
      const email = c?.email?.split(/[;,\s]+/).find((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))?.toLowerCase();
      if (!email || vistos.has(email)) continue;
      vistos.add(email);
      if (c?.deCultura) deCultura++;
    }
    res.json({ clientes: xs.length, emails: [...vistos], deCultura });
  });

  app.get('/api/programadores', (req, res) => {
    const xs = filtrarClientes(req.query)
      .sort((a, b) =>
        req.query.orden === 'adjudicado'
          ? b.adjudicado - a.adjudicado
          : req.query.orden === 'reciente'
            ? (b.ultimo ?? '').localeCompare(a.ultimo ?? '')
            : req.query.orden === 'subvenciones'
              ? (b.subvenciones?.importe ?? 0) - (a.subvenciones?.importe ?? 0)
              : b.contratos - a.contratos || (b.subvenciones?.importe ?? 0) - (a.subvenciones?.importe ?? 0),
      );
    res.json(paginar(req, xs, clienteResumido));
  });

  app.get('/api/programadores/:id', (req, res) => {
    const p = dir().programadores.find((x) => x.id === req.params.id);
    if (!p) {
      res.status(404).json({ error: 'Programador no encontrado' });
      return;
    }
    // Ayudas que convoca su ayuntamiento (las útiles primero), para saber de qué dinero dispone.
    const ayudas = p.codigoIne
      ? repo
          .listarConvocatorias()
          .filter((c) => c.ubicacion?.codigoMunicipio === p.codigoIne && utilParaManager(c))
          .sort((a, b) => (b.fechaPublicacion ?? '').localeCompare(a.fechaPublicacion ?? ''))
          .slice(0, 8)
          .map(resumida)
      : [];
    // Sus licitaciones de conciertos con plazo abierto: se puede presentar oferta ya.
    const abiertos = contratos.filter((c) => abierta(c) && idProgramador(c) === p.id).map(contratoResumido);
    // Ayudas de cultura y música que recibe: el ayuntamiento y las entidades del pueblo (o la propia pedanía).
    const s = dir().subvenciones;
    const pedania = p.id.startsWith('p-ped-') ? s.pedanias.find((x) => `p-ped-${normalizar(`${x.nombre} ${x.codigoProvincia ?? ''}`).replace(/[^a-z0-9]+/g, '-')}` === p.id) : undefined;
    const subvencionesRecibidas = pedania
      ? { ayuntamiento: { importe: pedania.importe, numero: pedania.numero, ultima: pedania.ultima, concesiones: pedania.concesiones }, entidades: [] }
      : ((p.codigoIne && s.porMunicipio.get(p.codigoIne)) || null);
    res.json({ ...p, contacto: opciones.contactos?.porCodigo(p.codigoIne) ?? null, ayudas, abiertos, subvencionesRecibidas });
  });

  // Oportunidades de gestión integral de festivales y ciclos (se recalculan cuando cambian los datos).
  let gestion: { version: number; items: OportunidadGestion[] } | null = null;
  const oportunidadesDeGestion = () => {
    if (gestion?.version !== repo.version) {
      const ayudas = repo
        .listarConvocatorias()
        .filter((c) => utilParaManager(c) && c.clasificacion.destino === 'programadores' && c.clasificacion.lineas.includes('festivales') && vigente(c));
      gestion = { version: repo.version, items: oportunidadesGestion(dir().programadores, contratos, dir().festivales, ayudas) };
    }
    return gestion.items;
  };

  app.get('/api/gestion-festivales', (req, res) => {
    const ccaa = lista(req.query.ccaa);
    const provincia = lista(req.query.provincia);
    const xs = oportunidadesDeGestion().filter(
      (o) =>
        (!ccaa.length || (o.ccaa && ccaa.includes(o.ccaa))) &&
        (!provincia.length || (o.provincia && provincia.includes(o.provincia))) &&
        (req.query.abiertas !== 'si' || o.abierta) &&
        (!req.query.senal || o.senales.some((s) => s.tipo === req.query.senal)) &&
        coincideTexto(req.query.q, o.nombre, o.ciudad, o.provincia),
    );
    res.json(paginar(req, xs));
  });

  app.get('/api/festivales', (req, res) => {
    const ccaa = lista(req.query.ccaa);
    const estilos = lista(req.query.estilo);
    const todos = req.query.todos === 'true';
    const xs = dir()
      .festivales.filter(
        (f) =>
          (todos || f.musical) &&
          (!ccaa.length || (f.ccaa && ccaa.includes(f.ccaa))) &&
          (!estilos.length || estilos.some((e) => f.estilos.includes(e as never))) &&
          coincideTexto(req.query.q, f.nombre, f.lugar, f.provincia, ...f.organizadores),
      )
      .sort((a, b) =>
        req.query.orden === 'dinero'
          ? b.dinero - a.dinero
          : req.query.orden === 'reciente'
            ? (b.anios.at(-1) ?? 0) - (a.anios.at(-1) ?? 0) || b.fuentes.length - a.fuentes.length
            : b.anios.length - a.anios.length || b.fuentes.length - a.fuentes.length,
      );
    res.json(paginar(req, xs, ({ fuentes, ...f }) => ({ ...f, numFuentes: fuentes.length })));
  });

  app.get('/api/festivales/:id', (req, res) => {
    const f = dir().festivales.find((x) => x.id === req.params.id);
    if (!f) {
      res.status(404).json({ error: 'Festival no encontrado' });
      return;
    }
    res.json(f);
  });

  app.get('/api/circuitos', (_req, res) => {
    res.json({ items: dir().circuitos });
  });

  app.get('/api/contratos', (req, res) => {
    const hoy = new Date();
    const todos = filtrarContratos(contratos, filtroContratos(req.query), hoy);
    // Por defecto fuera lo que no es para un catálogo de conciertos (pirotecnia, animación infantil, verbenas...).
    const resultado = req.query.todos === 'si' ? todos : todos.filter((c) => !noEncaja(c.titulo));
    const orden = req.query.orden;
    const clave = (c: ContratoVista) => c.fechaAdjudicacion ?? c.actualizado.slice(0, 10);
    const ordenados = [...resultado].sort((a, b) =>
      orden === 'cierre'
        ? (a.finPlazo ?? '9999').localeCompare(b.finPlazo ?? '9999')
        : orden === 'importe'
          ? (b.adjudicado ?? b.importe ?? 0) - (a.adjudicado ?? a.importe ?? 0)
          : clave(b).localeCompare(clave(a)),
    );
    const porPagina = Math.min(Math.max(Number(req.query.porPagina) || 50, 1), 200);
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    res.json({
      total: resultado.length,
      ocultos: todos.length - resultado.length,
      pagina,
      porPagina,
      items: ordenados.slice((pagina - 1) * porPagina, pagina * porPagina).map(contratoResumido),
    });
  });

  app.get('/api/contratos/mercado', (req, res) => {
    res.json(mercadoContratos(filtrarContratos(contratos, filtroContratos(req.query))));
  });

  app.get('/api/contratos/:id', (req, res) => {
    const c = contratos.find((x) => x.id === req.params.id);
    if (!c) {
      res.status(404).json({ error: 'Contrato no encontrado' });
      return;
    }
    res.json({ ...c, abierta: abierta(c), contacto: opciones.contactos?.deOrgano(c.organo.nombre, c.organo.ciudad, c.codigoProvincia) ?? null });
  });

  app.get('/api/organismos', (req, res) => {
    const texto = typeof req.query.q === 'string' ? normalizar(req.query.q.trim()) : '';
    const ccaa = lista(req.query.ccaa);
    const administraciones = lista(req.query.administracion);
    let resultado = organismos().lista.filter(
      (o) =>
        (!texto || normalizar(o.niveles.join(' ')).includes(texto)) &&
        (!ccaa.length || (o.ubicacion && ccaa.includes(o.ubicacion.ccaa))) &&
        (!administraciones.length || administraciones.includes(o.administracion)),
    );
    const orden = req.query.orden;
    resultado = [...resultado].sort((a, b) =>
      orden === 'convocatorias'
        ? b.convocatorias - a.convocatorias
        : orden === 'recientes'
          ? (b.ultimoAnio ?? 0) - (a.ultimoAnio ?? 0) || b.concedidoTotal - a.concedidoTotal
          : b.concedidoTotal - a.concedidoTotal || b.convocatorias - a.convocatorias,
    );
    const porPagina = Math.min(Math.max(Number(req.query.porPagina) || 50, 1), 500);
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    const items = resultado
      .slice((pagina - 1) * porPagina, pagina * porPagina)
      .map(({ idsConvocatorias: _ids, ...o }) => o);
    res.json({ total: resultado.length, pagina, porPagina, items });
  });

  app.get('/api/organismos/:id', (req, res) => {
    const o = organismos().porId.get(req.params.id);
    if (!o) {
      res.status(404).json({ error: 'Organismo no encontrado' });
      return;
    }
    const { idsConvocatorias, ...resto } = o;
    const convocatorias = idsConvocatorias
      .map((id) => repo.obtenerConvocatoria(id))
      .filter((c): c is Convocatoria => c !== null)
      .map(resumida);
    // Contratos de música del mismo municipio (los órganos de contratación no coinciden uno a uno con los de la BDNS).
    const u = resto.ubicacion;
    const delMunicipio = u?.municipio
      ? contratos
          .filter((c) => c.codigoProvincia === u.codigoProvincia && mismoMunicipio(c.organo.ciudad, u.municipio))
          .sort((a, b) => (b.fechaAdjudicacion ?? b.actualizado).localeCompare(a.fechaAdjudicacion ?? a.actualizado))
      : [];
    res.json({
      ...resto,
      convocatorias,
      contratos: { total: delMunicipio.length, items: delMunicipio.slice(0, 50).map(contratoResumido) },
      // Solo si el organismo es el propio municipio (la ubicación de una diputación no lleva municipio).
      contacto: opciones.contactos?.porCodigo(u?.codigoMunicipio) ?? null,
    });
  });

  // Directorio de contactos: los municipios con su responsable de cultura, ordenados por cuánta música contratan.
  const musicaPorMunicipio = () => {
    const porIne = new Map<string, { contratos: number; adjudicado: number; ultimo: string | null; programadorId: string }>();
    for (const p of dir().programadores) {
      if (!p.codigoIne) continue;
      const previo = porIne.get(p.codigoIne);
      if (!previo || p.contratos > previo.contratos) porIne.set(p.codigoIne, { contratos: p.contratos, adjudicado: p.adjudicado, ultimo: p.ultimo, programadorId: p.id });
    }
    return porIne;
  };
  const filtrarContactos = (req: Request) => {
    const ccaa = lista(req.query.ccaa);
    const provincia = lista(req.query.provincia);
    // Por defecto, todos los municipios con algún contacto (aunque sea el general del ayuntamiento).
    const soloCultura = req.query.cultura === 'si';
    const musica = musicaPorMunicipio();
    const xs = (opciones.contactos?.listar() ?? [])
      .filter(
        (m) =>
          (!ccaa.length || ccaa.includes(m.ccaa)) &&
          (!provincia.length || provincia.includes(m.provincia)) &&
          (soloCultura ? m.personas.length > 0 || !!m.cultura.email || !!m.cultura.telefono : !!(m.personas.length || m.cultura.email || m.cultura.telefono || m.ayuntamiento.email || m.ayuntamiento.telefono)) &&
          (req.query.musica !== 'si' || musica.has(m.codigoIne)) &&
          coincideTexto(req.query.q, m.municipio, m.provincia, ...m.personas.map((p) => p.nombre)),
      )
      .map((m) => ({ ...m, musica: musica.get(m.codigoIne) ?? null }))
      .sort((a, b) => (b.musica?.contratos ?? 0) - (a.musica?.contratos ?? 0) || (b.poblacion ?? 0) - (a.poblacion ?? 0));
    return xs;
  };
  // Emails del directorio filtrado (copia oculta): el de cultura si lo hay; si no, el general del ayuntamiento.
  app.get('/api/contactos/emails', (req, res) => {
    const vistos = new Set<string>();
    let deCultura = 0;
    for (const m of filtrarContactos(req)) {
      const p = m.personas.find((x) => x.email);
      const cultura = p?.email ?? m.cultura.email;
      const email = (cultura ?? m.ayuntamiento.email)?.split(/[;,\s]+/).find((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))?.toLowerCase();
      if (!email || vistos.has(email)) continue;
      vistos.add(email);
      if (cultura) deCultura++;
    }
    res.json({ emails: [...vistos], deCultura });
  });

  app.get('/api/contactos', (req, res) => {
    res.json(paginar(req, filtrarContactos(req)));
  });
  // El mismo listado para abrir en Excel: una fila por persona (o por municipio si no se conoce a nadie).
  app.get('/api/contactos.csv', (req, res) => {
    const celda = (x: unknown) => {
      const t = x == null ? '' : String(x);
      return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const filas = [
      ['Comunidad', 'Provincia', 'Municipio', 'Nombre', 'Cargo', 'Área', 'Partido', 'Email cultura', 'Teléfono cultura', 'Email ayuntamiento', 'Teléfono ayuntamiento', 'Web', 'Contratos de música', 'Fuente', 'Año fuente'],
    ];
    for (const m of filtrarContactos(req)) {
      const personas = m.personas.length ? m.personas : [null];
      for (const p of personas) {
        filas.push([
          m.ccaa, m.provincia, m.municipio, p?.nombre ?? '', p?.cargo ?? '', p?.area ?? '', p?.partido ?? '',
          p?.email ?? m.cultura.email ?? '', p?.telefono ?? m.cultura.telefono ?? '', m.ayuntamiento.email ?? '', m.ayuntamiento.telefono ?? '',
          m.ayuntamiento.web ?? '', String(m.musica?.contratos ?? ''), p?.fuente ?? m.fuentes ?? '', String(p?.anio ?? ''),
        ]);
      }
    }
    res.type('text/csv; charset=utf-8').attachment('contactos-cultura.csv');
    // Punto y coma y BOM: Excel en español lo abre bien con doble clic.
    res.send('\uFEFF' + filas.map((f) => f.map(celda).join(';')).join('\r\n'));
  });

  app.get('/api/contactos/:ine', (req, res) => {
    const m = opciones.contactos?.porCodigo(req.params.ine);
    if (!m) {
      res.status(404).json({ error: 'Municipio no encontrado en el directorio' });
      return;
    }
    res.json(m);
  });

  // Las que el usuario ha marcado «no me interesa» (cabecera X-Ocultas, ids separados por comas) no vuelven a salir.
  const visibles = (req: Request) => {
    const ocultas = new Set(lista(req.get('x-ocultas')));
    const todas = repo.listarConvocatorias();
    return ocultas.size && req.query.ids === undefined ? todas.filter((c) => !ocultas.has(c.id)) : todas;
  };

  // El perfil lo guarda cada navegador y lo manda en la cabecera X-Perfil (JSON en base64): así la web publicada
  // no necesita guardar nada en el servidor. Sin cabecera, el guardado en la base de datos local.
  const perfilDe = (req: Request): Perfil | null => {
    const cabecera = req.get('x-perfil');
    if (cabecera) {
      try {
        const r = validarPerfil(JSON.parse(Buffer.from(cabecera, 'base64').toString('utf8')));
        if (!('errores' in r)) return r.perfil;
      } catch {
        // Cabecera ilegible: se usa el perfil local.
      }
    }
    return repo.obtenerPerfil();
  };

  app.get('/api/perfil', (req, res) => {
    res.json(perfilDe(req) ?? PERFIL_POR_DEFECTO);
  });

  app.put('/api/perfil', (req, res) => {
    const resultado = validarPerfil(req.body);
    if ('errores' in resultado) {
      res.status(400).json({ errores: resultado.errores });
      return;
    }
    repo.guardarPerfil(resultado.perfil);
    res.json(resultado.perfil);
  });

  const salidaCoincidencia = (m: Coincidencia) => ({ ...m, convocatoria: resumida(m.convocatoria) });
  const primeras = (ms: Coincidencia[], n: number) => ({ total: ms.length, items: ms.slice(0, n).map(salidaCoincidencia) });

  // Calendario personal para suscribirse desde Google Calendar, Outlook o el móvil: los plazos de sus ayudas guardadas
  // (se actualizan solos si cambian) y las llamadas pendientes a sus clientes. Con cuenta va por token
  // (?token=...: la lista se lee de la base de datos y se actualiza sola); sin cuenta, la lista va en la dirección
  // (guardadas=...&clientes=id:aaaa-mm-dd,...). Sin notas: solo nombres de organismos públicos y fechas.
  const miCalendario = (guardadasIds: string[], llamadasPedidas: { id: string; fecha: string }[], base: string) => {
    const hoy = new Date();
    const eventos: EventoCalendario[] = guardadasIds
      .map((id) => repo.obtenerConvocatoria(id))
      .filter((c): c is Convocatoria => c !== null)
      .flatMap((c) => eventosDe(c, hoy));
    const llamadas = llamadasPedidas
      .filter(({ fecha }) => /^\d{4}-\d{2}-\d{2}$/.test(fecha))
      .map(({ id, fecha }) => ({ p: dir().programadores.find((p) => p.id === id), fecha }))
      .filter((x): x is { p: ProgramadorConContacto; fecha: string } => x.p !== undefined);
    return aICal(eventos, base, hoy, {
      nombre: 'Mi lista · Subvencionados',
      extra: llamadas.map(({ p, fecha }) => {
        const c = contactoBreve(p.codigoIne);
        return {
          uid: `llamar-${p.id}`,
          fecha,
          titulo: `Llamar: ${c?.municipio && /ayuntamiento|ajuntament|concello|alcald|junta de gobierno/i.test(p.nombre) ? `Ayuntamiento de ${c.municipio}` : p.nombre}`,
          descripcion: [c?.nombre, c?.telefono && `Tel. ${c.telefono}`, c?.email].filter(Boolean).join(' · '),
          url: `${base}/#/programador/${encodeURIComponent(p.id)}`,
        };
      }),
    });
  };
  /** Llamadas pendientes de la lista guardada en la cuenta (sin cerrados ni descartados). */
  const llamadasDe = (d: DatosLista) =>
    Object.entries(d.marcas.clientes)
      .filter(([, s]) => s.proxima && s.estado !== 'cerrado' && s.estado !== 'descartado')
      .map(([id, s]) => ({ id, fecha: s.proxima! }));

  app.get('/api/mi-calendario.ics', async (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    let ics: string;
    if (typeof req.query.token === 'string') {
      const datos = opciones.cuentas ? await opciones.cuentas.deCalendario(req.query.token) : null;
      if (!datos) {
        res.status(404).json({ error: 'Calendario no encontrado: copia de nuevo el enlace desde tu cuenta' });
        return;
      }
      ics = miCalendario(datos.marcas.guardadas, llamadasDe(datos), base);
    } else {
      ics = miCalendario(
        lista(req.query.guardadas),
        lista(req.query.clientes).map((x) => {
          const [id = '', fecha = ''] = x.split(':');
          return { id, fecha };
        }),
        base,
      );
    }
    res.type('text/calendar; charset=utf-8').set('Content-Disposition', 'inline; filename="mi-lista.ics"').send(ics);
  });

  // Novedades desde una fecha: ayudas nuevas que le sirven, licitaciones de conciertos abiertas en su zona,
  // conciertos que acaban de adjudicar sus clientes y plazos de sus guardadas. Lo usan la portada y los avisos por email.
  const novedades = (q: { desde: string; perfil: Perfil | null; ocultas: string[]; clientes: string[]; guardadas: string[] }, hoy = new Date()) => {
    const dia = hoy.toISOString().slice(0, 10);
    const { desde } = q;
    const conGrupos = q.perfil && q.perfil.grupos.length > 0 ? q.perfil : null;
    const ocultas = new Set(q.ocultas);
    const disponibles = repo.listarConvocatorias().filter((c) => !ocultas.has(c.id));
    const todas = conGrupos ? emparejar(disponibles, conGrupos, hoy) : coincidenciasGenericas(disponibles, hoy);
    const ayudas = todas
      .filter((m) => m.encaje !== 'precedente' && (m.convocatoria.fechaPublicacion ?? '') >= desde)
      .sort((a, b) => (b.convocatoria.fechaPublicacion ?? '').localeCompare(a.convocatoria.fechaPublicacion ?? ''));
    const zona = conGrupos ? [conGrupos.ccaaSede, ...conGrupos.ccaaActuacion].filter((x): x is string => !!x) : [];
    const estilos = conGrupos ? [...new Set(conGrupos.grupos.map((g) => g.estilo))] : [...ESTILOS];
    const licitaciones = filtrarContratos(contratos, { ccaa: zona, estilo: estilos, estado: 'abiertas', desde }, hoy).sort((a, b) =>
      (a.finPlazo ?? '9999').localeCompare(b.finPlazo ?? '9999'),
    );
    // Lo que han contratado sus clientes desde entonces: a quién y por cuánto.
    const deClientes = new Set(q.clientes);
    const adjudicados = deClientes.size
      ? contratos
          .filter((c) => deClientes.has(idProgramador(c)) && c.adjudicaciones.length > 0 && (c.fechaAdjudicacion ?? c.actualizado) >= desde)
          .sort((a, b) => (b.fechaAdjudicacion ?? b.actualizado).localeCompare(a.fechaAdjudicacion ?? a.actualizado))
      : [];
    // Guardadas: las que han abierto desde entonces y las que cierran en los próximos 7 días.
    const enSiete = new Date(hoy.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    const guardadas = q.guardadas
      .map((id) => repo.obtenerConvocatoria(id))
      .filter((c): c is Convocatoria => c !== null)
      .map((c) => {
        const p = plazo(c, hoy);
        const cierre = c.fechaFinSolicitud ?? (p === 'abierta' ? (estimarCierre(c)?.fecha ?? null) : null);
        const motivo =
          p === 'abierta' && cierre && cierre >= dia && cierre <= enSiete
            ? ('cierra' as const)
            : p === 'abierta' && c.fechaInicioSolicitud && c.fechaInicioSolicitud >= desde
              ? ('abre' as const)
              : null;
        return motivo ? { motivo, cierre, convocatoria: resumida(c) } : null;
      })
      .filter((x) => x !== null)
      .sort((a, b) => (a.cierre ?? '9999').localeCompare(b.cierre ?? '9999'));
    return {
      desde,
      ayudas: primeras(ayudas, 8),
      licitaciones: { total: licitaciones.length, items: licitaciones.slice(0, 5).map(contratoResumido) },
      adjudicados: { total: adjudicados.length, items: adjudicados.slice(0, 8).map(contratoResumido) },
      guardadas,
    };
  };

  app.get('/api/novedades', (req, res) => {
    const hoy = new Date();
    const desde = typeof req.query.desde === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.desde) ? req.query.desde : new Date(hoy.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    res.json(
      novedades({ desde, perfil: perfilDe(req), ocultas: lista(req.get('x-ocultas')), clientes: lista(req.query.clientes), guardadas: lista(req.query.guardadas) }, hoy),
    );
  });

  /** Lee el buzón configurado (IMAP) y anota las respuestas de los sitios en seguimiento. */
  async function leerRespuestas(): Promise<{ anotadas: number } | { error: string } | null> {
    const imap = configImapDesdeEntorno();
    if (!crm || !imap) return null;
    try {
      const usuarios = await crm.usuariosConRemitente(imap.usuario);
      if (!usuarios.length) return { error: `Ninguna cuenta tiene ${imap.usuario} como email del remitente` };
      const recibidos = await leerBuzon(imap, new Date(Date.now() - 3 * 86_400_000));
      let anotadas = 0;
      for (const u of usuarios) {
        for (const r of detectarRespuestas(recibidos, await crm.seguimientosActivos(u))) {
          await crm.anotar(u, r.entidad, { tipo: r.tipo, texto: r.texto });
          anotadas++;
        }
      }
      return { anotadas };
    } catch (e) {
      return { error: `No se ha podido leer el buzón: ${(e as Error).message}` };
    }
  }

  // Envío de los correos programados del CRM (tarea programada cada hora). Solo salen los que tienen el visto bueno
  // y siguen programados (si se cancelan antes, ya no están). Cada envío cuenta como efectivo al salir.
  app.get('/api/crm-envios', async (req, res) => {
    const secreto = process.env.CRON_SECRET;
    if (secreto && req.get('authorization') !== `Bearer ${secreto}`) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    const { enviar } = opciones;
    // Antes de enviar: las respuestas que hayan llegado al buzón paran sus seguimientos (también sin envío conectado).
    const respuestas = await leerRespuestas();
    if (!crm || !enviar) {
      res.json({ enviados: 0, respuestas, motivo: !crm ? 'Sin base de datos' : 'Sin servicio de email' });
      return;
    }
    let enviados = 0;
    const fallidos: string[] = [];
    const mandar = async (usuario: string, m: { id: string; asunto: string; cuerpo: string; destinatario: string; estado: string }, a: AjustesCrm, automatico: boolean) => {
      if (!a.email) return fallidos.push(m.id);
      // En el envío automático: una forma clara de pedir no recibir más, y copia oculta para el buzón del remitente.
      const cuerpo = automatico ? `${m.cuerpo}\n\n${PIE_BAJA}` : m.cuerpo;
      const ok = await enviar({
        para: m.destinatario,
        asunto: m.asunto,
        texto: cuerpo,
        html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escaparHtml(cuerpo)}</div>`,
        de: { email: a.email, nombre: a.remitente || a.organizacion || a.email },
        responderA: a.email,
        ...(automatico && { copiaOculta: a.email }),
      });
      if (!ok) return fallidos.push(m.id);
      if (m.estado === 'borrador') await crm.aprobar(usuario, m.id);
      await crm.registrarEnvio(usuario, m.id);
      enviados++;
    };
    for (const m of await crm.programadosPendientes()) await mandar(m.usuario, m, await crm.ajustes(m.usuario), false);
    // Envío automático: de lunes a viernes de 9 a 18 h (hora de Madrid), repartido por horas y sin pasar del tope del día.
    const ahora = new Date();
    const h = horaMadrid(ahora);
    if (h.laborable && h.hora >= 9 && h.hora < 18) {
      const inicioDia = new Date(ahora.getTime() - (h.hora * 3600 + h.minuto * 60) * 1000);
      for (const u of await crm.usuariosConEnvioAutomatico()) {
        const a = await crm.ajustes(u);
        const cupo = cupoDiario(a, ahora);
        const quedan = Math.min(cupo - (await crm.enviadosDesde(u, inicioDia)), Math.ceil(cupo / 9));
        if (quedan <= 0) continue;
        for (const m of await crm.colaAutomatica(u, quedan, ahora)) await mandar(u, m, a, true);
      }
    }
    res.json({ enviados, fallidos: fallidos.length, respuestas });
  });

  // Avisos por email (lo llama la tarea programada de Vercel cada mañana). A cada usuario se le envía como mucho uno
  // al día (o a la semana), así que una llamada repetida no manda emails de más. Si Vercel tiene CRON_SECRET, se exige.
  app.get('/api/avisos', async (req, res) => {
    const secreto = process.env.CRON_SECRET;
    if (secreto && req.get('authorization') !== `Bearer ${secreto}`) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    // Vigencia del catálogo: las cuentas que importaron de arsvia.org se comparan cada día con la web.
    let catalogos = 0;
    if (crm) {
      try {
        const web = await descargarCatalogoArsvia();
        for (const u of await crm.usuariosConOrigen('arsvia.org#')) {
          await crm.importarCatalogo(u, web, 'arsvia.org#');
          catalogos++;
        }
      } catch {
        // Si la web no responde hoy, se vuelve a intentar mañana.
      }
    }
    // Propuestas preparadas: cada mañana, hasta 20 sitios nuevos por cuenta con catálogo (sin pasar de 60 pendientes).
    let propuestas = 0;
    if (crm) {
      for (const u of await crm.usuariosConCatalogo()) {
        const pendientes = await crm.contarPropuestas(u);
        if (pendientes < 60) propuestas += await prepararParaCuenta(crm, ctxCrm, u, { limite: Math.min(20, 60 - pendientes) });
      }
    }
    const { cuentas, enviar } = opciones;
    if (!cuentas || !enviar) {
      res.json({ enviados: 0, catalogos, propuestas, motivo: !cuentas ? 'Sin base de datos' : 'Sin servicio de email' });
      return;
    }
    const hoy = new Date();
    const dia = hoy.toISOString().slice(0, 10);
    const base = `https://${req.get('host')}`;
    let enviados = 0;
    let sinNovedades = 0;
    for (const u of await cuentas.paraAvisar(dia)) {
      const desde = u.ultimoAviso ?? new Date(hoy.getTime() - (u.avisos === 'diario' ? 1 : 7) * 86_400_000).toISOString().slice(0, 10);
      const d = u.datos;
      const perfil = d?.perfil ? validarPerfil(d.perfil) : null;
      const n = novedades(
        {
          desde,
          perfil: perfil && !('errores' in perfil) ? perfil.perfil : null,
          ocultas: d?.marcas.ocultas ?? [],
          clientes: Object.keys(d?.marcas.clientes ?? {}),
          guardadas: d?.marcas.guardadas ?? [],
        },
        hoy,
      );
      const llamadas = d ? llamadasDe(d).filter((l) => l.fecha <= dia).length : 0;
      // Convocatorias nuevas desde el último aviso para entidades con oportunidades abiertas.
      const alertas = crm
        ? (await alertasCrm(crm, ctxCrm, u.id, hoy))
            .filter((a) => a.tipo === 'convocatoria' && (a.fecha ?? '') >= desde)
            .map((a) => ({ titulo: a.titulo, entidad: a.entidad.nombre, url: `${base}/#/convocatoria/${encodeURIComponent(a.ref)}` }))
        : [];
      const email = emailAviso(n, llamadas, base, alertas);
      if (email) {
        if (await enviar({ para: u.email, ...email })) enviados++;
        else continue; // Si falla el envío, se reintenta en la próxima ejecución.
      } else sinNovedades++;
      await cuentas.marcarAvisado(u.id, dia);
    }
    res.json({ enviados, sinNovedades, catalogos, propuestas });
  });

  // Portada: lo urgente. Sin perfil, con uno genérico de jazz, clásica y ópera en toda España.
  app.get('/api/inicio', (req, res) => {
    const perfil = perfilDe(req);
    const conGrupos = perfil && perfil.grupos.length > 0 ? perfil : null;
    const hoy = new Date();
    const todas = conGrupos ? emparejar(visibles(req), conGrupos, hoy) : coincidenciasGenericas(visibles(req), hoy);
    const s = seleccionar(todas, hoy);
    res.json({
      perfilCompleto: conGrupos !== null,
      abiertas: s.abiertas.length,
      cierranPronto: primeras(s.cierranPronto, 8),
      abrenPronto: primeras(s.abrenPronto, 8),
      previstas: {
        total: s.previstas.length,
        items: s.previstas.slice(0, 8).map((p) => ({ prevista: p.prevista, ...salidaCoincidencia(p.coincidencia) })),
      },
      artistas: primeras(s.artistas, 5),
      nuevas: primeras(nuevas(todas, hoy), 8),
      // A quién llamar: clientes que suelen contratar en los próximos dos meses, en su zona y de sus estilos.
      llamar: (() => {
        const mes = hoy.getMonth() + 1;
        const meses = [mes % 12 + 1, (mes + 1) % 12 + 1];
        const zona = conGrupos ? [conGrupos.ccaaSede, ...conGrupos.ccaaActuacion].filter((x): x is string => !!x) : [];
        const estilos = conGrupos ? [...new Set(conGrupos.grupos.map((g) => g.estilo))] : [];
        const xs = filtrarClientes({ mes: meses.join(','), estilo: estilos.join(',') }, zona)
          .filter((p) => (p.ultimo ?? '') >= `${hoy.getFullYear() - 1}`)
          .sort((a, b) => Number(b.conContacto) - Number(a.conContacto) || b.contratos - a.contratos);
        return { meses, total: xs.length, items: xs.slice(0, 10).map(clienteResumido) };
      })(),
      // Lo que ve el mánager: lo que pueden pedir sus grupos y el dinero de quien les contrata, por separado.
      para: Object.fromEntries(
        (['grupos', 'programadores'] as const).map((destino) => {
          const delDestino = (m: Coincidencia) => m.convocatoria.clasificacion.destino === destino;
          const ahora = [
            ...[...s.abiertas, ...s.artistas].filter((m) => delDestino(m) && m.plazo === 'abierta').sort((a, b) => (a.convocatoria.fechaFinSolicitud ?? '9999').localeCompare(b.convocatoria.fechaFinSolicitud ?? '9999')),
            ...[...s.abiertas, ...s.artistas].filter((m) => delDestino(m) && m.plazo === 'proxima').sort((a, b) => (a.convocatoria.fechaInicioSolicitud ?? '9999').localeCompare(b.convocatoria.fechaInicioSolicitud ?? '9999')),
          ];
          const previstas = s.previstas.filter((p) => delDestino(p.coincidencia));
          return [
            destino,
            {
              ahora: primeras(ahora, 12),
              previstas: { total: previstas.length, items: previstas.slice(0, 8).map((p) => ({ prevista: p.prevista, ...salidaCoincidencia(p.coincidencia) })) },
            },
          ];
        }),
      ),
      licitaciones: (() => {
        // Con perfil, solo las de sus comunidades.
        const zona = conGrupos ? [conGrupos.ccaaSede, ...conGrupos.ccaaActuacion].filter((x): x is string => !!x) : [];
        const abiertas = filtrarContratos(contratos, { estado: 'abiertas', ccaa: zona }, hoy).sort((a, b) =>
          (a.finPlazo ?? '').localeCompare(b.finPlazo ?? ''),
        );
        return { total: abiertas.length, items: abiertas.slice(0, 8).map(contratoResumido) };
      })(),
      grupos: conGrupos
        ? porGrupo(visibles(req), conGrupos, hoy).map((g) => {
            // Solo las que mencionan su estilo: las generales valen para todos los grupos.
            const propia = (m: Coincidencia) => m.convocatoria.clasificacion.estilosExplicitos.includes(g.grupo.estilo);
            return {
              grupo: g.grupo,
              abiertas: g.abiertas.filter(propia).length,
              previstas: g.previstas.filter((p) => propia(p.coincidencia)).length,
            };
          })
        : [],
    });
  });

  /** Festivales activos y programadores de las comunidades del promotor que encajan con un estilo. */
  const dondeTocar = (estilo: string, zona: string[]) => {
    const enZona = (ccaa: string | null) => !zona.length || (!!ccaa && zona.includes(ccaa));
    const reciente = new Date().getFullYear() - 2;
    const fests = dir()
      .festivales.filter((f) => f.musical && enZona(f.ccaa) && (f.anios.at(-1) ?? 0) >= reciente && f.estilos.includes(estilo as never))
      .sort((a, b) => b.anios.length - a.anios.length || b.dinero - a.dinero);
    const progs = dir()
      .programadores.filter((p) => enZona(p.ccaa) && (p.estilos[estilo as keyof typeof p.estilos] ?? 0) > 0)
      .sort((a, b) => (b.estilos[estilo as keyof typeof b.estilos] ?? 0) - (a.estilos[estilo as keyof typeof a.estilos] ?? 0));
    return {
      festivales: { total: fests.length, items: fests.slice(0, 15).map(({ fuentes, ...f }) => ({ ...f, numFuentes: fuentes.length })) },
      programadores: { total: progs.length, items: progs.slice(0, 15).map(({ recientes: _r, ...p }) => p) },
    };
  };

  // Mis grupos: las recomendaciones de cada grupo por separado, con el porqué.
  app.get('/api/grupos', (req, res) => {
    const perfil = perfilDe(req);
    if (!perfil || perfil.grupos.length === 0) {
      res.json({ perfilCompleto: false, grupos: [] });
      return;
    }
    res.json({
      perfilCompleto: true,
      grupos: porGrupo(visibles(req), perfil).map((g) => ({
        grupo: g.grupo,
        abiertas: primeras(g.abiertas, 100),
        previstas: {
          total: g.previstas.length,
          items: g.previstas.slice(0, 100).map((p) => ({ prevista: p.prevista, ...salidaCoincidencia(p.coincidencia) })),
        },
        artistas: primeras(g.artistas, 15),
        ...dondeTocar(g.grupo.estilo, [perfil.ccaaSede, ...perfil.ccaaActuacion].filter((x): x is string => !!x)),
      })),
    });
  });

  app.get('/api/para-ti', (req, res) => {
    const perfil = perfilDe(req);
    if (!perfil) {
      res.json({ perfilCompleto: false, abiertas: [], recurrentes: [], artistas: [], indirectas: [], precedentes: [] });
      return;
    }
    const hoy = new Date();
    const haceMeses = (meses: number) =>
      new Date(hoy.getFullYear(), hoy.getMonth() - meses, hoy.getDate()).toISOString().slice(0, 10);
    const recientes = (m: Coincidencia, meses: number) => (m.convocatoria.fechaPublicacion ?? '') >= haceMeses(meses);
    const vigente = (m: Coincidencia) => m.plazo === 'abierta' || m.plazo === 'proxima';
    const salida = (ms: Coincidencia[]) =>
      ms.slice(0, 50).map((m) => ({ ...m, convocatoria: resumida(m.convocatoria) }));

    const todas = emparejar(visibles(req), perfil, hoy);
    // Las ayudas generales de cultura solo interesan mientras se pueden pedir.
    const musicales = todas.filter((m) => m.convocatoria.clasificacion.musical);
    const directas = musicales.filter((m) => m.encaje === 'directo');
    const culturaVigente = todas.filter(
      (m) => !m.convocatoria.clasificacion.musical && m.encaje === 'directo' && vigente(m),
    );
    res.json({
      perfilCompleto: perfil.grupos.length > 0,
      abiertas: salida([...directas.filter(vigente), ...culturaVigente]),
      // Cerradas en los últimos 18 meses: la mayoría se convocan cada año.
      recurrentes: salida(directas.filter((m) => m.plazo === 'cerrada' && recientes(m, 18))),
      artistas: salida(musicales.filter((m) => m.encaje === 'artistas' && (vigente(m) || recientes(m, 12)))),
      indirectas: salida(musicales.filter((m) => m.encaje === 'indirecto' && (vigente(m) || recientes(m, 12)))),
      precedentes: salida(musicales.filter((m) => m.encaje === 'precedente' && recientes(m, 36))),
    });
  });

  return app;
}
