// API de cuentas: registro, entrar y salir (cookie de sesión), la lista de cada usuario, avisos, calendario y borrar.

import express, { type Request, type Response } from 'express';
import { type AlmacenCuentas, type DatosLista, FRECUENCIAS, type FrecuenciaAvisos, type Usuario } from './cuentas.js';
import { puedeEntrar, puedeRegistrarse } from './acceso.js';
import { type Enviar, escaparHtml } from './email.js';

const COOKIE = 'subv_sesion';
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const CLAVE_MINIMA = 8;

export function leerCookie(req: Request, nombre = COOKIE): string | null {
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

function ponerCookie(req: Request, res: Response, token: string | null) {
  // En local (http) la cookie no puede ser Secure.
  const segura = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const valor = token ? encodeURIComponent(token) : '';
  const caduca = token ? 'Max-Age=31536000' : 'Max-Age=0';
  res.append('Set-Cookie', `${COOKIE}=${valor}; Path=/api; HttpOnly; SameSite=Lax; ${caduca}${segura ? '; Secure' : ''}`);
}

const normalizarEmail = (e: unknown) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

/** Intentos fallidos por email (en memoria de la función: frena ataques simples, no sustituye a un límite global). */
const fallos = new Map<string, { n: number; hasta: number }>();
function bloqueado(email: string): boolean {
  const f = fallos.get(email);
  return !!f && f.n >= 5 && f.hasta > Date.now();
}
function anotarFallo(email: string) {
  const f = fallos.get(email);
  const n = f && f.hasta > Date.now() ? f.n + 1 : 1;
  fallos.set(email, { n, hasta: Date.now() + 15 * 60_000 });
}

/** Comprueba la forma de la lista antes de guardarla (lo que manda el navegador no es de fiar). */
export function validarLista(x: unknown): DatosLista | null {
  const d = x as Partial<DatosLista> | null;
  const m = d?.marcas;
  if (!m || !Array.isArray(m.guardadas) || !Array.isArray(m.ocultas) || typeof m.clientes !== 'object' || m.clientes === null) return null;
  const ids = (xs: unknown[]) => xs.filter((i): i is string => typeof i === 'string' && i.length < 100).slice(0, 2000);
  const clientes: DatosLista['marcas']['clientes'] = {};
  for (const [id, s] of Object.entries(m.clientes).slice(0, 2000)) {
    if (!s || typeof s !== 'object' || typeof s.nombre !== 'string') continue;
    clientes[id.slice(0, 100)] = {
      nombre: s.nombre.slice(0, 300),
      estado: typeof s.estado === 'string' ? s.estado.slice(0, 20) : 'pendiente',
      nota: typeof s.nota === 'string' ? s.nota.slice(0, 2000) : '',
      actualizado: typeof s.actualizado === 'string' ? s.actualizado.slice(0, 30) : '',
      proxima: typeof s.proxima === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.proxima) ? s.proxima : null,
    };
  }
  return { marcas: { guardadas: ids(m.guardadas), ocultas: ids(m.ocultas), clientes }, perfil: d?.perfil ?? null };
}

const publico = (u: Usuario) => ({ email: u.email, avisos: u.avisos, tokenCalendario: u.tokenCalendario });

/** Usuario de la cookie de sesión (o null). Lo usan también las rutas del CRM. */
export async function usuarioDeSesion(almacen: AlmacenCuentas | null, req: Request): Promise<Usuario | null> {
  const token = leerCookie(req);
  return token && almacen ? almacen.deSesion(token) : null;
}

export function rutasCuenta(almacen: AlmacenCuentas | null, enviar: Enviar | null, privado = false) {
  const r = express.Router();
  const base = (req: Request) => `${req.protocol}://${req.get('host')}`;

  const usuarioDe = async (req: Request): Promise<Usuario | null> => {
    const token = leerCookie(req);
    const u = token && almacen ? await almacen.deSesion(token) : null;
    return u && privado && !puedeEntrar(u.email) ? null : u;
  };
  /** Las rutas que necesitan sesión: sin ella, 401. */
  const conUsuario =
    (fn: (req: Request, res: Response, u: Usuario, a: AlmacenCuentas) => Promise<void>) => async (req: Request, res: Response) => {
      const u = almacen ? await usuarioDe(req) : null;
      if (!u || !almacen) {
        res.status(401).json({ error: 'Inicia sesión' });
        return;
      }
      await fn(req, res, u, almacen);
    };

  r.get('/', async (req, res) => {
    const u = almacen ? await usuarioDe(req) : null;
    res.set('Cache-Control', 'no-store').json({ activo: almacen !== null, emails: enviar !== null, privado, usuario: u ? publico(u) : null });
  });

  r.post('/registro', async (req, res) => {
    if (!almacen) {
      res.status(503).json({ error: 'Las cuentas aún no están activadas' });
      return;
    }
    const email = normalizarEmail(req.body?.email);
    const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';
    if (!EMAIL.test(email)) {
      res.status(400).json({ error: 'Email no válido' });
      return;
    }
    if (clave.length < CLAVE_MINIMA || clave.length > 200) {
      res.status(400).json({ error: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres` });
      return;
    }
    if (privado && !puedeRegistrarse(email)) {
      res.status(403).json({ error: 'Esta web es privada: para crear una cuenta, pide acceso a quien la administra.' });
      return;
    }
    const u = await almacen.crear(email, clave);
    if (!u) {
      res.status(409).json({ error: 'Ya hay una cuenta con ese email: entra con tu contraseña' });
      return;
    }
    ponerCookie(req, res, await almacen.abrirSesion(u.id));
    res.status(201).json({ usuario: publico(u) });
  });

  r.post('/entrar', async (req, res) => {
    if (!almacen) {
      res.status(503).json({ error: 'Las cuentas aún no están activadas' });
      return;
    }
    const email = normalizarEmail(req.body?.email);
    if (bloqueado(email)) {
      res.status(429).json({ error: 'Demasiados intentos: espera 15 minutos' });
      return;
    }
    const u = await almacen.entrar(email, typeof req.body?.clave === 'string' ? req.body.clave : '');
    if (u && privado && !puedeEntrar(u.email)) {
      res.status(403).json({ error: 'Esta cuenta ya no tiene acceso a la web. Pídelo a quien la administra.' });
      return;
    }
    if (!u) {
      anotarFallo(email);
      res.status(401).json({ error: 'Email o contraseña incorrectos' });
      return;
    }
    fallos.delete(email);
    ponerCookie(req, res, await almacen.abrirSesion(u.id));
    res.json({ usuario: publico(u) });
  });

  r.post('/salir', async (req, res) => {
    const token = leerCookie(req);
    if (token && almacen) await almacen.cerrarSesion(token);
    ponerCookie(req, res, null);
    res.json({ ok: true });
  });

  r.get(
    '/lista',
    conUsuario(async (_req, res, u, a) => {
      res.set('Cache-Control', 'no-store').json((await a.leerLista(u.id)) ?? { datos: null, actualizado: null });
    }),
  );

  r.put(
    '/lista',
    conUsuario(async (req, res, u, a) => {
      const datos = validarLista(req.body);
      if (!datos) {
        res.status(400).json({ error: 'Lista no válida' });
        return;
      }
      res.json({ actualizado: await a.guardarLista(u.id, datos) });
    }),
  );

  r.put(
    '/ajustes',
    conUsuario(async (req, res, u, a) => {
      const avisos = req.body?.avisos as FrecuenciaAvisos;
      if (!FRECUENCIAS.includes(avisos)) {
        res.status(400).json({ error: 'Frecuencia no válida' });
        return;
      }
      await a.ajustar(u.id, avisos);
      res.json({ usuario: { ...publico(u), avisos } });
    }),
  );

  // Nueva dirección del calendario: la anterior deja de funcionar (por si se ha compartido sin querer).
  r.post(
    '/calendario',
    conUsuario(async (_req, res, u, a) => {
      res.json({ usuario: { ...publico(u), tokenCalendario: await a.nuevoCalendario(u.id) } });
    }),
  );

  r.post(
    '/clave',
    conUsuario(async (req, res, u, a) => {
      const actual = typeof req.body?.actual === 'string' ? req.body.actual : '';
      const nueva = typeof req.body?.nueva === 'string' ? req.body.nueva : '';
      if (!(await a.entrar(u.email, actual))) {
        res.status(401).json({ error: 'La contraseña actual no es correcta' });
        return;
      }
      if (nueva.length < CLAVE_MINIMA || nueva.length > 200) {
        res.status(400).json({ error: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres` });
        return;
      }
      await a.cambiarClave(u.id, nueva);
      ponerCookie(req, res, await a.abrirSesion(u.id));
      res.json({ ok: true });
    }),
  );

  r.delete(
    '/',
    conUsuario(async (req, res, u, a) => {
      if (!(await a.entrar(u.email, typeof req.body?.clave === 'string' ? req.body.clave : ''))) {
        res.status(401).json({ error: 'La contraseña no es correcta' });
        return;
      }
      await a.borrar(u.id);
      ponerCookie(req, res, null);
      res.json({ ok: true });
    }),
  );

  // Siempre responde lo mismo, exista o no la cuenta (para no revelar qué emails están registrados).
  r.post('/olvido', async (req, res) => {
    if (!almacen || !enviar) {
      res.status(503).json({ error: 'Los emails aún no están activados' });
      return;
    }
    const email = normalizarEmail(req.body?.email);
    const token = EMAIL.test(email) ? await almacen.pedirRestablecer(email) : null;
    if (token) {
      const enlace = `${base(req)}/#/cuenta?restablecer=${token}`;
      await enviar({
        para: email,
        asunto: 'Cambia tu contraseña de Subvencionados',
        texto: `Para poner una contraseña nueva, abre este enlace (caduca en una hora): ${enlace}\n\nSi no lo has pedido tú, ignora este email.`,
        html: `<p>Para poner una contraseña nueva, abre este enlace (caduca en una hora):</p><p><a href="${escaparHtml(enlace)}">Cambiar mi contraseña</a></p><p>Si no lo has pedido tú, ignora este email.</p>`,
      });
    }
    res.json({ ok: true });
  });

  r.post('/restablecer', async (req, res) => {
    const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';
    if (!almacen || clave.length < CLAVE_MINIMA || clave.length > 200) {
      res.status(400).json({ error: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres` });
      return;
    }
    const usuario = typeof req.body?.token === 'string' ? await almacen.usarRestablecer(req.body.token) : null;
    if (!usuario) {
      res.status(400).json({ error: 'El enlace ha caducado o ya se ha usado: pide otro' });
      return;
    }
    await almacen.cambiarClave(usuario, clave);
    ponerCookie(req, res, await almacen.abrirSesion(usuario));
    res.json({ ok: true });
  });

  return r;
}
