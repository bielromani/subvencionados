// Propuestas preparadas: el sistema cruza el catálogo de la cuenta con todos los sitios que contratan música en España
// (lo que han programado, las ayudas vigentes que cubren su territorio, sus licitaciones abiertas, las señales de gestión
// integral de festivales) y deja UN correo por sitio, a la persona adecuada, con todas las propuestas que encajan.
// Nada se envía: el usuario lo revisa, lo retoca y lo aprueba. Todo lo que dice el correo sale de datos públicos.

import type { ContratoVista } from '../contratos/vista.js';
import type { Programador } from '../directorio.js';
import type { OportunidadGestion } from '../gestionFestivales.js';
import { cubreTerritorio } from '../gestionFestivales.js';
import { tituloCorto as tituloCortoDe } from '../titulo.js';
import type { Convocatoria, Estilo } from '../tipos.js';
import { avisosFicha, encajeEntidad, encajeLicitacion, type Encaje } from './encaje.js';
import { idProgramador } from '../directorio.js';
import { normalizar } from '../clasificacion/musica.js';
import { firmaDe, NOMBRE_TIPO, saludoA } from './plantillas.js';
import type { AjustesCrm, Espectaculo, TipoEspectaculo } from './tipos.js';

export interface PropuestaPreparada {
  /** Programador del directorio (p-...). */
  ref: string;
  nombre: string;
  municipio: string | null;
  provincia: string | null;
  ccaa: string | null;
  persona: string | null;
  cargo: string | null;
  destinatario: string;
  telefono: string | null;
  /** El email es el general del ayuntamiento (no el de cultura) o no parece del municipio: revisarlo. */
  revisarEmail: string | null;
  idioma: 'es' | 'ca';
  /** Por qué se propone este sitio (datos públicos, con su cifra). */
  motivos: string[];
  espectaculos: { id: string; nombre: string; tipo: TipoEspectaculo; motivos: string[]; avisos: string[] }[];
  ayudas: { id: string; titulo: string; fin: string | null }[];
  licitaciones: { id: string; titulo: string; fin: string | null }[];
  gestion: string[];
  asunto: string;
  cuerpo: string;
  puntos: number;
}

/** Lo que la prospección necesita de los datos públicos. */
export interface FuentesProspeccion {
  programadores: () => (Programador & { codigoIne: string | null })[];
  contacto: (codigoIne: string | null) => { municipio: string; nombre: string | null; cargo: string | null; email: string | null; telefono: string | null; deCultura?: boolean } | null;
  /** Ayudas útiles para quien contrata, vigentes (se filtran por territorio aquí). */
  ayudasProgramadores: () => Convocatoria[];
  /** Todas las licitaciones de música con plazo abierto (se reparten por programador aquí, una sola vez). */
  licitacionesAbiertas: () => ContratoVista[];
  gestionDe: (programadorId: string) => OportunidadGestion | undefined;
}

const ESTILO_DE_TIPO: Partial<Record<TipoEspectaculo, Estilo>> = { opera: 'opera', sinfonico_coral: 'clasica', sinfonica: 'clasica', religiosa: 'clasica', camara: 'clasica', jazz: 'jazz' };
const NOMBRE_ESTILO: Record<'es' | 'ca', Record<Estilo, string>> = {
  es: { jazz: 'jazz', clasica: 'música clásica', opera: 'ópera' },
  ca: { jazz: 'jazz', clasica: 'música clàssica', opera: 'òpera' },
};
const ES_AYUNTAMIENTO = /ayuntamiento|ajuntament|concello|alcald|junta de gobierno|udala/i;
const CATALAN = /catalu/i;

const lista = (xs: string[], y: string) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} ${y} ${xs.at(-1)}`);
const fecha = (iso: string | null, idioma: 'es' | 'ca') =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(idioma === 'ca' ? 'ca-ES' : 'es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : null;

/**
 * Las mejores propuestas, variadas: primero la mejor de cada tipo (por orden de encaje), luego el resto. Dentro de un
 * mismo encaje, antes las fichas vigentes y con más información.
 */
function variadas(xs: Encaje[], n: number): Encaje[] {
  const calidad = (x: Encaje) => (x.espectaculo.estadoInfo === 'vigente' ? 2 : 0) + (x.espectaculo.formato ? 1 : 0);
  const orden = [...xs].sort((a, b) => b.puntos - a.puntos || calidad(b) - calidad(a));
  const elegidas: Encaje[] = [];
  const tipos = new Set<string>();
  for (const x of orden) if (x.puntos > 0 && !tipos.has(x.espectaculo.tipo) && elegidas.length < n) (tipos.add(x.espectaculo.tipo), elegidas.push(x));
  for (const x of orden) if (elegidas.length < n && !elegidas.includes(x) && x.puntos > 0) elegidas.push(x);
  // Sin historial (abanico amplio): uno de cada tipo.
  if (!elegidas.length) for (const x of orden) if (!tipos.has(x.espectaculo.tipo) && elegidas.length < n) (tipos.add(x.espectaculo.tipo), elegidas.push(x));
  return elegidas;
}

/** El correo de la propuesta, en castellano o catalán. Sin precios ni fechas cerrados; la ayuda, como apoyo opcional. */
export function redactarPropuesta(
  p: Omit<PropuestaPreparada, 'asunto' | 'cuerpo' | 'puntos' | 'motivos'>,
  historial: Estilo[],
  ajustes: AjustesCrm,
  catalogo: Espectaculo[],
): { asunto: string; cuerpo: string } {
  const ca = p.idioma === 'ca';
  const lugar = p.municipio ?? p.nombre;
  const org = ajustes.organizacion || (ca ? 'la nostra companyia' : 'nuestra compañía');
  const tipos = [...new Set(p.espectaculos.map((e) => NOMBRE_TIPO[p.idioma][e.tipo]))];
  const queOfrece = tipos.length ? lista(tipos.slice(0, 3), ca ? 'i' : 'y') : ca ? 'la nostra programació' : 'nuestra programación';
  // Enlace propio de cada propuesta (su dosier); la web general, una sola vez al final.
  const web = ajustes.web.replace(/\/$/, '');
  const enlace = (id: string) => {
    const u = catalogo.find((c) => c.id === id)?.enlace?.replace(/\/$/, '');
    return u && u !== web ? u : null;
  };
  const lineas = p.espectaculos.map((e) => `- ${e.nombre} (${NOMBRE_TIPO[p.idioma][e.tipo]})${enlace(e.id) ? `: ${enlace(e.id)}` : ''}`).join('\n');
  const estilos = lista(historial.map((e) => NOMBRE_ESTILO[p.idioma][e]), ca ? 'i' : 'y');
  const pendiente = p.espectaculos.some((e) => e.avisos.length > 0);
  const parrafos: string[] = [];
  parrafos.push(saludoA(p.persona, p.idioma));
  parrafos.push(
    ca
      ? `Em dic ${ajustes.remitente || '[nom]'}, de ${org}. ${historial.length ? `Us escric perquè he vist que a ${lugar} heu programat ${estilos} en els darrers anys, i crec que algunes de les nostres propostes hi podrien encaixar.` : `Us escric perquè crec que la programació cultural de ${lugar} podria tenir interès en ${queOfrece}.`}`
      : `Me llamo ${ajustes.remitente || '[nombre]'}, de ${org}. ${historial.length ? `Os escribo porque he visto que en ${lugar} habéis programado ${estilos} en los últimos años, y creo que algunas de nuestras propuestas podrían encajar.` : `Os escribo porque creo que la programación cultural de ${lugar} podría tener interés en ${queOfrece}.`}`,
  );
  if (lineas) parrafos.push(`${ca ? 'Us en comparteixo algunes:' : 'Os comparto algunas:'}\n\n${lineas}`);
  for (const l of p.licitaciones.slice(0, 1)) {
    const f = fecha(l.fin, p.idioma);
    parrafos.push(
      ca
        ? `També he vist que teniu oberta la licitació «${l.titulo}»${f ? ` (ofertes fins al ${f})` : ''}; si us encaixa, hi podem presentar oferta.`
        : `También he visto que tenéis abierta la licitación «${l.titulo}»${f ? ` (ofertas hasta el ${f})` : ''}; si os encaja, podemos presentar oferta.`,
    );
  }
  if (p.ayudas.length) {
    const t = lista(
      p.ayudas.slice(0, 2).map((a) => `«${a.titulo}»`),
      ca ? 'i' : 'y',
    );
    parrafos.push(
      ca
        ? `D'altra banda, hem detectat ${p.ayudas.length > 1 ? 'algunes convocatòries' : 'una convocatòria'} (${t}) que potser podri${p.ayudas.length > 1 ? 'en' : 'a'} facilitar la programació d'aquestes propostes. Si ho considereu interessant, en podem estudiar conjuntament les possibilitats, sense cap compromís.`
        : `Por otra parte, hemos detectado ${p.ayudas.length > 1 ? 'algunas convocatorias' : 'una convocatoria'} (${t}) que quizá podría${p.ayudas.length > 1 ? 'n' : ''} facilitar la programación de estas propuestas. Si lo consideráis interesante, podemos estudiar conjuntamente las posibilidades, sin ningún compromiso.`,
    );
  }
  if (p.gestion.length) {
    parrafos.push(
      ca
        ? `A més de concerts, dissenyem, produïm i gestionem festivals i cicles complets; si en algun moment us interessa, us ho explico.`
        : `Además de conciertos, diseñamos, producimos y gestionamos festivales y ciclos completos; si en algún momento os interesa, os lo explico.`,
    );
  }
  parrafos.push(
    ca
      ? `Les condicions, el format i les dates les podem concretar segons les vostres necessitats${pendiente ? ' (algunes dades encara les estem actualitzant)' : ''}. Si us ve de gust, us envio el dossier complet o en parlem per telèfon quan us vagi bé.${web ? ` Teniu totes les propostes a ${web}.` : ''}`
      : `Las condiciones, el formato y las fechas las podemos concretar según vuestras necesidades${pendiente ? ' (algunos datos los estamos actualizando todavía)' : ''}. Si os apetece, os envío el dosier completo o lo hablamos por teléfono cuando os vaya bien.${web ? ` Tenéis todas las propuestas en ${web}.` : ''}`,
  );
  parrafos.push(`${ca ? 'Una salutació cordial,' : 'Un saludo cordial,'}\n${firmaDe(ajustes, p.idioma)}`);
  const asunto = ca ? `Propostes de ${queOfrece} per a ${lugar}` : `Propuestas de ${queOfrece} para ${lugar}`;
  return { asunto, cuerpo: parrafos.join('\n\n') };
}

/**
 * Prepara propuestas para los sitios que mejor encajan con el catálogo y que no estén ya en seguimiento, descartados o
 * con «no contactar». Solo sitios con email de contacto (los demás se pueden llamar desde Clientes).
 */
export function prepararPropuestas(
  f: FuentesProspeccion,
  catalogo: Espectaculo[],
  ajustes: AjustesCrm,
  excluir: Set<string>,
  opciones: { limite: number; ccaa?: string[]; hoy?: Date } = { limite: 20 },
): PropuestaPreparada[] {
  const hoy = opciones.hoy ?? new Date();
  const disponibles = catalogo.filter((e) => e.enWeb !== false);
  if (!disponibles.length) return [];
  const estilosCatalogo = new Set(disponibles.map((e) => ESTILO_DE_TIPO[e.tipo]).filter((x): x is Estilo => !!x));
  const ayudas = f.ayudasProgramadores();
  const anioPasado = `${hoy.getUTCFullYear() - 1}`;
  const proximosMeses = [1, 2, 3].map((n) => ((hoy.getUTCMonth() + n) % 12) + 1);
  // Licitaciones abiertas que encajan con el catálogo (no pirotecnia, animación infantil, verbenas...), por programador.
  const NO_ENCAJA = /pirotecn|\bpiro|animacion infantil|infantil|verbena|orquesta de baile|discomovil|\bdj\b|charanga|batucada|pasacalles/;
  const licitacionesPorProgramador = new Map<string, ContratoVista[]>();
  for (const l of f.licitacionesAbiertas()) {
    if (NO_ENCAJA.test(normalizar(l.titulo)) || !encajeLicitacion(disponibles, l, hoy).length) continue;
    const id = idProgramador(l);
    licitacionesPorProgramador.set(id, [...(licitacionesPorProgramador.get(id) ?? []), l]);
  }
  const candidatos: PropuestaPreparada[] = [];
  for (const p of f.programadores()) {
    if (excluir.has(p.id)) continue;
    if (opciones.ccaa?.length && !(p.ccaa && opciones.ccaa.includes(p.ccaa))) continue;
    const c = f.contacto(p.codigoIne);
    const destinatario = c?.email?.split(/[;,\s]+/).find((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
    if (!destinatario) continue;
    const motivos: string[] = [];
    let puntos = 0;
    // Lo que ha programado de los estilos del catálogo.
    const historial = ([...estilosCatalogo] as Estilo[]).filter((e) => (p.estilos[e] ?? 0) > 0).sort((a, b) => (p.estilos[b] ?? 0) - (p.estilos[a] ?? 0));
    const conciertos = historial.reduce((t, e) => t + (p.estilos[e] ?? 0), 0);
    if (conciertos) {
      puntos += Math.min(conciertos, 12);
      motivos.push(`Ha contratado ${historial.map((e) => `${p.estilos[e]} de ${NOMBRE_ESTILO.es[e]}`).join(', ')} (contratos públicos)`);
    }
    if ((p.ultimo ?? '') >= anioPasado) puntos += 2;
    if (p.meses.some((m) => proximosMeses.includes(m))) {
      puntos += 2;
      motivos.push('Suele contratar en los próximos meses');
    }
    const suyas = ayudas.filter((a) => cubreTerritorio(a, { provincia: p.provincia, ccaa: p.ccaa, codigoIne: p.codigoIne })).slice(0, 3);
    if (suyas.length) puntos += 4 + suyas.length;
    const licitaciones = licitacionesPorProgramador.get(p.id) ?? [];
    // La licitación se enseña aparte (con su enlace), no entre los motivos.
    if (licitaciones.length) puntos += 8;
    const gestion = f.gestionDe(p.id);
    const senalesGestion = gestion?.senales.filter((s) => s.tipo !== 'ayuda_festivales').map((s) => s.texto) ?? [];
    if (senalesGestion.length) puntos += 2;
    // Hace falta una razón concreta: historial del estilo, una ayuda o una licitación.
    if (!conciertos && !suyas.length && !licitaciones.length) continue;
    const encaje = encajeEntidad(disponibles, p, hoy);
    const espectaculos = variadas(encaje.propuestas, 5).map((x) => ({ id: x.espectaculo.id, nombre: x.espectaculo.nombre, tipo: x.espectaculo.tipo, motivos: x.motivos, avisos: avisosFicha(x.espectaculo, hoy) }));
    const idioma: 'es' | 'ca' = p.ccaa && CATALAN.test(p.ccaa) ? 'ca' : 'es';
    const municipio = c?.municipio ?? p.ciudad ?? '';
    const dominio = normalizar(destinatario.split('@')[1] ?? '').replace(/[^a-z0-9]/g, '');
    const palabras = normalizar(municipio).split(/[^a-z0-9]+/).filter((x) => x.length > 3);
    const revisarEmail = !c?.deCultura
      ? 'Es el email general del ayuntamiento: mejor pedir por cultura'
      : palabras.length && !palabras.some((w) => dominio.includes(w)) && !/gmail|hotmail|yahoo|outlook/.test(dominio)
        ? `El dominio del email no menciona ${municipio}: comprueba que es el correcto`
        : null;
    const nombre = c?.municipio && ES_AYUNTAMIENTO.test(p.nombre) ? `Ayuntamiento de ${c.municipio}` : p.nombre;
    const base = {
      ref: p.id,
      nombre,
      municipio: c?.municipio ?? p.ciudad,
      provincia: p.provincia,
      ccaa: p.ccaa,
      persona: c?.nombre ?? null,
      cargo: c?.cargo ?? null,
      destinatario,
      telefono: c?.telefono ?? null,
      revisarEmail,
      idioma,
      espectaculos,
      ayudas: suyas.map((a) => ({ id: a.id, titulo: tituloCortoDe(a.titulo), fin: a.fechaFinSolicitud })),
      licitaciones: licitaciones.slice(0, 2).map((l) => ({ id: l.id, titulo: l.titulo, fin: l.finPlazo })),
      gestion: senalesGestion.slice(0, 2),
    };
    candidatos.push({ ...base, motivos, puntos, ...redactarPropuesta(base, historial, ajustes, disponibles) });
  }
  return candidatos.sort((a, b) => b.puntos - a.puntos).slice(0, opciones.limite);
}
