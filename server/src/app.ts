import express, { type Request } from 'express';
import { normalizar } from './clasificacion/musica.js';
import type { Repositorio } from './db.js';
import { emparejar, plazo } from './emparejamiento.js';
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

  return convocatorias.filter((c) => {
    const cl = c.clasificacion;
    if (!incluirNoMusicales && !cl.musical) return false;
    if (estilos.length && !estilos.some((e) => cl.estilosCompatibles.includes(e as never))) return false;
    // Una convocatoria estatal (sin CCAA) aplica a cualquier comunidad.
    if (ccaa.length && c.ccaa.length && !ccaa.some((x) => c.ccaa.includes(x))) return false;
    if (administraciones.length && !administraciones.includes(c.administracion)) return false;
    if (lineas.length && !lineas.some((l) => cl.lineas.includes(l as never))) return false;
    if (plazoBuscado && plazo(c) !== plazoBuscado) return false;
    if (texto && !normalizar(`${c.titulo} ${c.organoNiveles.join(' ')} ${c.texto}`).includes(texto)) {
      return false;
    }
    return true;
  });
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
      demo: todas.some((c) => c.origen === 'demo'),
      ultimaActualizacion: todas.map((c) => c.actualizada).sort().at(-1) ?? null,
    });
  });

  app.get('/api/convocatorias', (req, res) => {
    const resultado = filtrar(repo.listarConvocatorias(), req.query);
    res.json({ total: resultado.length, items: resultado.map(vista) });
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
      res.json({ perfilCompleto: false, items: [] });
      return;
    }
    const items = emparejar(repo.listarConvocatorias(), perfil).map((m) => ({
      ...m,
      convocatoria: vista(m.convocatoria),
    }));
    res.json({ perfilCompleto: perfil.grupos.length > 0, items });
  });

  return app;
}
