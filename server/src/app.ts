import express, { type Request } from 'express';
import { normalizar } from './clasificacion/musica.js';
import type { Repositorio } from './db.js';
import { type Coincidencia, emparejar, plazo } from './emparejamiento.js';
import { LINEAS, PERFIL_POR_DEFECTO, validarPerfil } from './perfil.js';
import { CCAA } from './regiones.js';
import { ESTILOS, type Convocatoria } from './tipos.js';

const lista = (valor: unknown): string[] =>
  typeof valor === 'string' && valor ? valor.split(',').map((x) => x.trim()).filter(Boolean) : [];

/** Lo que devolvemos al cliente: la convocatoria sin el texto bruto y con el plazo calculado hoy. */
function vista(c: Convocatoria) {
  const { texto: _texto, ...resto } = c;
  return { ...resto, plazo: plazo(c) };
}

function filtrar(convocatorias: Convocatoria[], q: Request['query']): Convocatoria[] {
  const estilos = lista(q.estilo);
  const ccaa = lista(q.ccaa);
  const administraciones = lista(q.administracion);
  const lineas = lista(q.linea);
  const texto = typeof q.q === 'string' ? normalizar(q.q.trim()) : '';
  const plazoBuscado = typeof q.plazo === 'string' ? q.plazo : '';
  const incluirNoMusicales = q.todas === 'true';
  const tipo = typeof q.tipo === 'string' ? q.tipo : '';
  const desde = typeof q.desde === 'string' ? q.desde : '';

  return convocatorias.filter((c) => {
    const cl = c.clasificacion;
    if (!incluirNoMusicales && !cl.musical) return false;
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

export function crearApp(repo: Repositorio) {
  const app = express();
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
      ultimaActualizacion: todas.map((c) => c.actualizada).sort().at(-1) ?? null,
      fuente: 'Base de Datos Nacional de Subvenciones (BDNS) · IGAE, Ministerio de Hacienda',
    });
  });

  app.get('/api/convocatorias', (req, res) => {
    const resultado = ordenar(filtrar(repo.listarConvocatorias(), req.query), req.query.orden);
    const porPagina = Math.min(Math.max(Number(req.query.porPagina) || 50, 1), 500);
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    const items = resultado.slice((pagina - 1) * porPagina, pagina * porPagina);
    res.json({ total: resultado.length, pagina, porPagina, items: items.map(vista) });
  });

  app.get('/api/convocatorias/:id', (req, res) => {
    const c = repo.obtenerConvocatoria(req.params.id);
    if (!c) {
      res.status(404).json({ error: 'Convocatoria no encontrada' });
      return;
    }
    res.json({ ...vista(c), clasificacion: c.clasificacion });
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
    const salida = (ms: Coincidencia[]) => ms.slice(0, 50).map((m) => ({ ...m, convocatoria: vista(m.convocatoria) }));

    const todas = emparejar(repo.listarConvocatorias(), perfil, hoy);
    const directas = todas.filter((m) => m.encaje === 'directo');
    res.json({
      perfilCompleto: perfil.grupos.length > 0,
      abiertas: salida(directas.filter(vigente)),
      // Cerradas en los últimos 18 meses: la mayoría se convocan cada año.
      recurrentes: salida(directas.filter((m) => m.plazo === 'cerrada' && recientes(m, 18))),
      artistas: salida(todas.filter((m) => m.encaje === 'artistas' && (vigente(m) || recientes(m, 12)))),
      indirectas: salida(todas.filter((m) => m.encaje === 'indirecto' && (vigente(m) || recientes(m, 12)))),
      precedentes: salida(todas.filter((m) => m.encaje === 'precedente' && recientes(m, 36))),
    });
  });

  return app;
}
