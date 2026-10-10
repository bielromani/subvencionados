import express, { type Request } from 'express';
import { aICal, calendario } from './calendario.js';
import { normalizar } from './clasificacion/musica.js';
import { mercado } from './mercado.js';
import type { Repositorio } from './db.js';
import { type Coincidencia, emparejar, plazo } from './emparejamiento.js';
import { agruparOrganismos, idOrganismo, type Organismo } from './organismos.js';
import { LINEAS, PERFIL_POR_DEFECTO, validarPerfil } from './perfil.js';
import { CCAA } from './regiones.js';
import { fichaBasica } from './ficha/basica.js';
import type { Ficha } from './ficha/esquema.js';
import { documentosConTexto } from './ficha/fichas.js';
import { ESTILOS, type Convocatoria } from './tipos.js';

const lista = (valor: unknown): string[] =>
  typeof valor === 'string' && valor ? valor.split(',').map((x) => x.trim()).filter(Boolean) : [];

/** Lo que devolvemos al cliente: la convocatoria sin el texto bruto y con el plazo calculado hoy. */
function vista(c: Convocatoria) {
  const { texto: _texto, ...resto } = c;
  return { ...resto, plazo: plazo(c), organismoId: idOrganismo(c.organoNiveles) };
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
  const incluirNoMusicales = q.todas === 'true';
  const incluirCultura = q.cultura === 'true';
  const tipo = typeof q.tipo === 'string' ? q.tipo : '';
  const desde = typeof q.desde === 'string' ? q.desde : '';

  return convocatorias.filter((c) => {
    const cl = c.clasificacion;
    if (!incluirNoMusicales && !cl.musical && !(incluirCultura && cl.culturaGeneral)) return false;
    if (estilos.length && !estilos.some((e) => cl.estilosCompatibles.includes(e as never))) return false;
    // Una convocatoria sin restricción territorial aplica a cualquier comunidad.
    if (ccaa.length && !c.ambitoNacional && !ccaa.some((x) => c.ccaa.includes(x))) return false;
    if (tipo && c.tipo !== tipo) return false;
    if (desde && (c.fechaPublicacion ?? '') < desde) return false;
    if (administraciones.length && !administraciones.includes(c.administracion)) return false;
    if (lineas.length && !lineas.some((l) => cl.lineas.includes(l as never))) return false;
    if (plazoBuscado && plazo(c) !== plazoBuscado) return false;
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
}

export function crearApp(repo: Repositorio, opciones: OpcionesApp = {}) {
  const app = express();
  const resumida = (c: Convocatoria) => ({ ...vistaResumida(c), tieneFicha: opciones.fichas?.tiene(c.codigoBdns) ?? false });

  // Los organismos se recalculan solo cuando cambian las convocatorias.
  let organismosCache: { version: number; lista: Organismo[]; porId: Map<string, Organismo> } | null = null;
  const organismos = () => {
    if (organismosCache?.version !== repo.version) {
      const lista = agruparOrganismos(repo.listarConvocatorias());
      organismosCache = { version: repo.version, lista, porId: new Map(lista.map((o) => [o.id, o])) };
    }
    return organismosCache;
  };
  app.use(express.json({ limit: '100kb' }));

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
      culturaGeneral: todas.filter((c) => c.clasificacion.culturaGeneral).length,
      ultimaActualizacion: todas.map((c) => c.actualizada).sort().at(-1) ?? null,
      fuente: 'Base de Datos Nacional de Subvenciones (BDNS) · IGAE, Ministerio de Hacienda',
    });
  });

  app.get('/api/convocatorias', (req, res) => {
    const resultado = ordenar(filtrar(repo.listarConvocatorias(), req.query), req.query.orden);
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
    res.json({ ...vista(c), clasificacion: c.clasificacion, ficha, basica });
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
  const eventos = (q: Request['query']) =>
    calendario(filtrar(repo.listarConvocatorias(), { ...q, cultura: q.cultura ?? 'true', tipo: undefined, plazo: undefined }));

  app.get('/api/calendario', (req, res) => {
    res.json({ eventos: eventos(req.query) });
  });

  app.get('/api/calendario.ics', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    res.type('text/calendar; charset=utf-8').set('Content-Disposition', 'attachment; filename="subvenciones-musica.ics"');
    res.send(aICal(eventos(req.query), base));
  });

  // Música compatible con jazz, clásica u ópera (o el estilo pedido), sin formación salvo que se pida.
  app.get('/api/mercado', (req, res) => {
    const conFormacion = req.query.formacion === 'true';
    const base = filtrar(repo.listarConvocatorias(), { ...req.query, todas: undefined, cultura: undefined, plazo: undefined }).filter(
      (c) => c.clasificacion.estilosCompatibles.length > 0 && (conFormacion || !c.clasificacion.lineas.includes('formacion')),
    );
    res.json(mercado(base));
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
    res.json({ ...resto, convocatorias });
  });

  app.get('/api/perfil', (_req, res) => {
    res.json(repo.obtenerPerfil() ?? PERFIL_POR_DEFECTO);
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

  app.get('/api/para-ti', (_req, res) => {
    const perfil = repo.obtenerPerfil();
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

    const todas = emparejar(repo.listarConvocatorias(), perfil, hoy);
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
