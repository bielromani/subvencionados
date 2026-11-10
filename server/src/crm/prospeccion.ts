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
import { avisosFicha, encajeAyuda, encajeEntidad, encajeLicitacion, type Encaje } from './encaje.js';
import { idProgramador } from '../directorio.js';
import { normalizar } from '../clasificacion/musica.js';
import { componerCarta } from './cartas.js';
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
  /** Estilos que ha programado (para volver a redactar el correo si cambian las plantillas). */
  historial: Estilo[];
  asunto: string;
  cuerpo: string;
  puntos: number;
}

/** Lo que la prospección necesita de los datos públicos. */
export interface FuentesProspeccion {
  programadores: () => (Programador & { codigoIne: string | null })[];
  contacto: (codigoIne: string | null) => { municipio: string; nombre: string | null; cargo: string | null; email: string | null; telefono: string | null; deCultura?: boolean; poblacion?: number | null } | null;
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

/**
 * Las mejores propuestas: por orden de encaje (pesa más el estilo que más programa el sitio), como mucho dos del mismo
 * tipo para que haya variedad. Con el mismo encaje, antes las fichas vigentes y con más información; y si siguen
 * empatadas, se reparten entre los sitios (sorteo fijo por sitio) para que no salga siempre la misma. Sin historial
 * (abanico amplio), una de cada tipo.
 */
export function variadas(xs: Encaje[], n: number, semilla: string, porTipo_ = 2): Encaje[] {
  const calidad = (x: Encaje) => (x.espectaculo.estadoInfo === 'vigente' ? 2 : 0) + (x.espectaculo.textoCarta ? 2 : 0) + (x.espectaculo.formato ? 1 : 0);
  const sorteo = (x: Encaje) => huella(`${semilla}|${x.espectaculo.id}`);
  const orden = [...xs].sort((a, b) => b.puntos - a.puntos || calidad(b) - calidad(a) || sorteo(a) - sorteo(b));
  const conMotivo = orden.filter((x) => x.puntos > 0);
  const porTipo = new Map<string, number>();
  const elegidas: Encaje[] = [];
  const maximo = conMotivo.length ? porTipo_ : 1;
  for (const x of conMotivo.length ? conMotivo : orden) {
    if (elegidas.length >= n) break;
    const k = porTipo.get(x.espectaculo.tipo) ?? 0;
    if (k >= maximo) continue;
    porTipo.set(x.espectaculo.tipo, k + 1);
    elegidas.push(x);
  }
  return elegidas;
}

/** Las producciones que se ofrecen a un sitio (hasta seis, variadas). */
export function elegirEspectaculos(disponibles: Espectaculo[], p: Programador, ajustes: AjustesCrm, hoy = new Date()): PropuestaPreparada['espectaculos'] {
  const n = Math.min(8, Math.max(1, ajustes.obrasPorCorreo ?? 6));
  const porTipo = Math.min(4, Math.max(1, ajustes.obrasPorTipo ?? 2));
  return variadas(encajeEntidad(disponibles, p, hoy, { afines: ajustes.afines ?? true }).propuestas, n, p.id, porTipo).map((x) => ({ id: x.espectaculo.id, nombre: x.espectaculo.nombre, tipo: x.espectaculo.tipo, motivos: x.motivos, avisos: avisosFicha(x.espectaculo, hoy) }));
}

/** Número estable a partir de un texto (FNV-1a): el mismo sitio recibe siempre el mismo sorteo. */
function huella(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** El correo de la propuesta, por bloques con las plantillas de la cuenta (ver cartas.ts). */
export function redactarPropuesta(
  p: Pick<PropuestaPreparada, 'idioma' | 'municipio' | 'nombre' | 'persona' | 'espectaculos' | 'licitaciones' | 'ayudas' | 'gestion' | 'historial'>,
  ajustes: AjustesCrm,
  catalogo: Espectaculo[],
): { asunto: string; cuerpo: string } {
  const porId = new Map(catalogo.map((e) => [e.id, e]));
  return componerCarta({
    idioma: p.idioma,
    lugar: p.municipio ?? p.nombre,
    persona: p.persona,
    historial: p.historial,
    espectaculos: p.espectaculos.map((e) => porId.get(e.id) ?? { id: e.id, nombre: e.nombre, tipo: e.tipo, enlace: '' }),
    licitaciones: p.licitaciones,
    ayudas: p.ayudas,
    gestion: p.gestion.length > 0,
    ajustes,
  });
}

/**
 * Prepara propuestas para los sitios que mejor encajan con el catálogo y que no estén ya en seguimiento, descartados o
 * con «no contactar». Solo sitios con email de contacto (los demás se pueden llamar desde Clientes).
 */
/** Licitaciones que no son para un catálogo de conciertos: pirotecnia, animación infantil, verbenas, charangas... */
const NO_ENCAJA = /pirotecn|\bpiro|animacion infantil|infantil|verbena|orquesta de baile|discomovil|\bdj\b|charanga|batucada|pasacalles/;
export const noEncaja = (titulo: string) => NO_ENCAJA.test(normalizar(titulo));

/** Una ayuda que se puede proponer a un ayuntamiento para pagar el concierto. */
export function ayudaParaEntidadLocal(a: Convocatoria, catalogo: Espectaculo[], hoy = new Date()): boolean {
  if (!a.clasificacion.beneficiarios.entidadesLocales) return false;
  const encaje = encajeAyuda(catalogo, a, hoy);
  if (!encaje.length) return false;
  const deEstilo = encaje.some((x) => x.motivos.some((m) => m !== 'Programación cultural general: cabe cualquier propuesta'));
  // Cultura popular, tradicional o fiestas: solo si el estilo encaja de verdad.
  return deEstilo || !/\b(cultura popular|tradicional|tradicionals|folklore|folclore|fiestas? populares?|festes populars)\b/.test(normalizar(a.titulo));
}

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
  // Solo ayudas que puede pedir el propio ayuntamiento (no las de asociaciones) y que encajan con el catálogo: una
  // ayuda de cultura popular no financia una Pasión de Bach aunque cubra el territorio.
  const ayudas = f.ayudasProgramadores().filter((a) => ayudaParaEntidadLocal(a, disponibles, hoy));
  const anioPasado = `${hoy.getUTCFullYear() - 1}`;
  const proximosMeses = [1, 2, 3].map((n) => ((hoy.getUTCMonth() + n) % 12) + 1);
  // Licitaciones abiertas que encajan con el catálogo (no pirotecnia, animación infantil, verbenas...), por programador.
  const licitacionesPorProgramador = new Map<string, ContratoVista[]>();
  for (const l of f.licitacionesAbiertas()) {
    if (noEncaja(l.titulo) || !encajeLicitacion(disponibles, l, hoy).length) continue;
    const id = idProgramador(l);
    licitacionesPorProgramador.set(id, [...(licitacionesPorProgramador.get(id) ?? []), l]);
  }
  const candidatos: PropuestaPreparada[] = [];
  for (const p of f.programadores()) {
    if (excluir.has(p.id)) continue;
    if (opciones.ccaa?.length && !(p.ccaa && opciones.ccaa.includes(p.ccaa))) continue;
    const c = f.contacto(p.codigoIne);
    const destinatario = c?.email?.split(/[;,\s]+/).find((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
    if (!destinatario || excluir.has(`@${destinatario.toLowerCase()}`)) continue;
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
    // Capacidad de pago: tamaño del municipio y lo que ya paga por concierto.
    const poblacion = c?.poblacion ?? null;
    if (poblacion != null && poblacion < 1000 && !licitaciones.length) continue;
    if (poblacion != null) puntos += poblacion >= 50_000 ? 3 : poblacion >= 20_000 ? 2 : poblacion >= 5_000 ? 1 : 0;
    const paga = Math.max(p.rango?.max ?? 0, ...Object.values(p.rangos ?? {}).map((r) => r.max));
    const aSuAlcance = puedeFormatoGrande(poblacion, paga) ? disponibles : disponibles.filter((e) => !FORMATO_GRANDE.has(e.tipo) || (e.precioMin != null && e.precioMin <= paga));
    if (!aSuAlcance.length) continue;
    const espectaculos = elegirEspectaculos(aSuAlcance, p, ajustes, hoy);
    if (!espectaculos.length) continue;
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
      historial,
    };
    candidatos.push({ ...base, motivos, puntos, ...redactarPropuesta(base, ajustes, aSuAlcance) });
  }
  // Un correo, una propuesta: la de más puntos.
  const porEmail = new Map<string, PropuestaPreparada>();
  for (const x of candidatos) {
    const k = x.destinatario.toLowerCase();
    if ((porEmail.get(k)?.puntos ?? -Infinity) < x.puntos) porEmail.set(k, x);
  }
  return repartirPorComunidad([...porEmail.values()], opciones.limite);
}

/** Ópera, sinfónico y grandes obras corales (la Pasión, el Réquiem): no para un pueblo pequeño que paga poco. */
const FORMATO_GRANDE = new Set<TipoEspectaculo>(['opera', 'sinfonico_coral', 'sinfonica', 'religiosa']);
const puedeFormatoGrande = (poblacion: number | null, paga: number) => (poblacion ?? 0) >= 20_000 || paga >= 8_000;

/** Las mejores, pero repartidas por comunidades: ninguna se lleva la tanda si hay buenas de otras. */
export function repartirPorComunidad<T extends { puntos: number; ccaa: string | null }>(xs: T[], limite: number): T[] {
  const orden = [...xs].sort((a, b) => b.puntos - a.puntos);
  const tope = Math.max(2, Math.ceil(limite / 5));
  const porCcaa = new Map<string, number>();
  const elegidas = new Set<T>();
  // Por rondas: en cada una, cada comunidad puede sumar hasta `tope` más.
  for (let ronda = 1; elegidas.size < Math.min(limite, orden.length); ronda++)
    for (const x of orden) {
      const k = x.ccaa ?? '';
      if (elegidas.size >= limite || elegidas.has(x) || (porCcaa.get(k) ?? 0) >= ronda * tope) continue;
      elegidas.add(x);
      porCcaa.set(k, (porCcaa.get(k) ?? 0) + 1);
    }
  return [...elegidas].sort((a, b) => b.puntos - a.puntos);
}
