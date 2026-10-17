import express, { type Request } from 'express';
import { aICal, calendario, utilParaManager } from './calendario.js';
import { normalizar } from './clasificacion/musica.js';
import { mercado } from './mercado.js';
import type { ContactoMunicipio, Contactos } from './contactos.js';
import { type Circuito, circuitos, type Festival, festivales, type Programador, programadores } from './directorio.js';
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

const lista = (valor: unknown): string[] =>
  typeof valor === 'string' && valor ? valor.split(',').map((x) => x.trim()).filter(Boolean) : [];

/** Lo que devolvemos al cliente: la convocatoria sin el texto bruto y con el plazo calculado hoy. */
function vista(c: Convocatoria) {
  const { texto: _texto, ...resto } = c;
  return { ...resto, tituloCorto: tituloCorto(c.titulo), plazo: plazo(c), organismoId: idOrganismo(c.organoNiveles) };
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
  /** Contratos de música de la Plataforma de Contratación (datos/contratos/). */
  contratos?: ContratoVista[];
  /** Directorio de ayuntamientos y responsables de cultura (datos/directorio/). */
  contactos?: Contactos | null;
}

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
    res.json({ ...vista(c), clasificacion: c.clasificacion, ficha, basica, contacto: opciones.contactos?.porCodigo(c.ubicacion?.codigoMunicipio) ?? null });
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
  type ProgramadorConContacto = Programador & { codigoIne: string | null; conContacto: boolean };
  let directorio: { version: number; programadores: ProgramadorConContacto[]; festivales: Festival[]; circuitos: Circuito[] } | null = null;
  const tieneContactoCultura = (m: ContactoMunicipio | null) => !!m && (m.personas.length > 0 || !!m.cultura.email || !!m.cultura.telefono);
  const dir = () => {
    if (directorio?.version !== repo.version) {
      const conv = repo.listarConvocatorias();
      const progs = programadores(contratos).map((p) => {
        const m = opciones.contactos?.deOrgano(p.nombre, p.ciudad, p.codigoProvincia) ?? null;
        return { ...p, codigoIne: m?.codigoIne ?? null, conContacto: tieneContactoCultura(m) };
      });
      directorio = { version: repo.version, programadores: progs, festivales: festivales(contratos, conv), circuitos: circuitos(contratos, conv) };
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
    };
  };
  const clienteResumido = ({ recientes: _r, ...p }: ProgramadorConContacto) => ({ ...p, contactoBreve: contactoBreve(p.codigoIne) });
  /** Filtros de clientes: comunidad, provincia, estilo, mes en que suelen contratar, con contacto, guardados (ids). */
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
        coincideTexto(q.q, p.nombre, p.ciudad, p.provincia),
    );
  };

  app.get('/api/programadores', (req, res) => {
    const xs = filtrarClientes(req.query)
      .sort((a, b) =>
        req.query.orden === 'adjudicado'
          ? b.adjudicado - a.adjudicado
          : req.query.orden === 'reciente'
            ? (b.ultimo ?? '').localeCompare(a.ultimo ?? '')
            : b.contratos - a.contratos,
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
    res.json({ ...p, contacto: opciones.contactos?.porCodigo(p.codigoIne) ?? null, ayudas });
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
    const resultado = filtrarContratos(contratos, filtroContratos(req.query), hoy);
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
    const soloCultura = req.query.cultura !== 'no';
    const musica = musicaPorMunicipio();
    const xs = (opciones.contactos?.listar() ?? [])
      .filter(
        (m) =>
          (!ccaa.length || ccaa.includes(m.ccaa)) &&
          (!provincia.length || provincia.includes(m.provincia)) &&
          (!soloCultura || m.personas.length > 0 || !!m.cultura.email || !!m.cultura.telefono) &&
          (req.query.musica !== 'si' || musica.has(m.codigoIne)) &&
          coincideTexto(req.query.q, m.municipio, m.provincia, ...m.personas.map((p) => p.nombre)),
      )
      .map((m) => ({ ...m, musica: musica.get(m.codigoIne) ?? null }))
      .sort((a, b) => (b.musica?.contratos ?? 0) - (a.musica?.contratos ?? 0) || (b.poblacion ?? 0) - (a.poblacion ?? 0));
    return xs;
  };
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
