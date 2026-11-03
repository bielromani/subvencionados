// Oportunidades de diseño, producción y gestión integral de festivales y ciclos: municipios y equipamientos donde
// ofrecer el modelo de trabajo completo (no un concierto suelto). Todo sale de datos públicos, con su fuente:
// - licitaciones de organización/gestión/producción de un festival o ciclo (abiertas, o adjudicadas: se repiten);
// - ciclos montados concierto a concierto (varios contratos de música en pocas semanas, sin gestión integral);
// - festivales que organiza (directorio);
// - ayudas vigentes para festivales en su territorio.

import { normalizar } from './clasificacion/musica.js';
import { abierta, type ContratoVista } from './contratos/vista.js';
import { type Festival, idProgramador, type Programador } from './directorio.js';
import type { Convocatoria } from './tipos.js';

export type TipoSenal = 'licitacion_abierta' | 'gestion_externalizada' | 'ciclo_por_piezas' | 'festival_propio' | 'ayuda_festivales';

export interface Senal {
  tipo: TipoSenal;
  texto: string;
  fecha: string | null;
  /** Contrato (id), convocatoria (bdns-...) o festival del directorio que lo respalda. */
  ref: string | null;
  importe: number | null;
}

export interface OportunidadGestion {
  programador: string;
  nombre: string;
  ciudad: string | null;
  provincia: string | null;
  ccaa: string | null;
  puntos: number;
  /** Hay una licitación abierta ahora mismo. */
  abierta: boolean;
  senales: Senal[];
}

const SERVICIO = /\b(organizacion|organitzacio|gestion|gestio|produccion|produccio|coordinacion|coordinacio|direccion (artistica|tecnica)|disseny|diseno|programacion artistica|programacio artistica)\b/;
const EVENTO = /\b(festival|festivals|festivales|ciclo|ciclos|cicle|cicles|temporada|programa)\b/;
/** Un concierto suelto «dentro de la programación del festival» no es gestión integral. */
const SUELTO = /\b(dentro del?|en el marco del?|dins (de|del)|actuacion (musical|artistica) de|concierto de|concert de)\b|^(\w+ )?(concierto|concert|actuacion|contratacion de la actuacion)\b/;
/** Servicios parciales (imagen, sonido, montaje, seguridad...) o contratar a un grupo concreto: tampoco. */
const PARCIAL = /\b(imagen|identidad visual|cartel|grafic|sonido|so i llum|iluminacion|seguridad|limpieza|escenario|carpa|montaje|catering|transporte|publicidad|comunicacion|difusion|intermediacion|representacion|alquiler|suministro|grabacion|retransmision|merchandising|entradas|ticketing|taquilla)\b/;

/** Contrato cuyo objeto es organizar, gestionar o producir un festival o ciclo entero. */
export function esGestionIntegral(titulo: string): boolean {
  const t = normalizar(titulo);
  if (SUELTO.test(t) || PARCIAL.test(t)) return false;
  const servicio = t.search(SERVICIO);
  const evento = t.search(EVENTO);
  return servicio >= 0 && evento >= 0 && servicio < evento && evento - servicio < 90;
}

const PESOS: Record<TipoSenal, number> = { licitacion_abierta: 10, gestion_externalizada: 6, ciclo_por_piezas: 4, festival_propio: 3, ayuda_festivales: 2 };
const DIAS_CICLO = 45;
const MIN_CICLO = 4;

const fechaDe = (c: ContratoVista) => c.fechaAdjudicacion ?? c.actualizado?.slice(0, 10) ?? null;
const mes = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** El tramo de 45 días con más conciertos contratados (el último año con datos). */
function cicloPorPiezas(cs: ContratoVista[]): { n: number; desde: string; hasta: string; importe: number } | null {
  const fechas = cs
    .map((c) => ({ f: fechaDe(c), imp: c.adjudicado ?? 0 }))
    .filter((x): x is { f: string; imp: number } => !!x.f)
    .sort((a, b) => a.f.localeCompare(b.f));
  const ultimoAnio = fechas.at(-1)?.f.slice(0, 4);
  const delAnio = fechas.filter((x) => x.f.slice(0, 4) === ultimoAnio);
  let mejor: { n: number; desde: string; hasta: string; importe: number } | null = null;
  for (let i = 0, j = 0; j < delAnio.length; j++) {
    while (Date.parse(delAnio[j]!.f) - Date.parse(delAnio[i]!.f) > DIAS_CICLO * 86_400_000) i++;
    const n = j - i + 1;
    if (n >= MIN_CICLO && (!mejor || n > mejor.n)) {
      mejor = { n, desde: delAnio[i]!.f, hasta: delAnio[j]!.f, importe: delAnio.slice(i, j + 1).reduce((t, x) => t + x.imp, 0) };
    }
  }
  return mejor;
}

/**
 * Si una ayuda cubre el territorio de una entidad: las de ámbito nacional siempre; las provinciales (o de comarca),
 * solo en su provincia; las autonómicas, en toda la comunidad.
 */
export function cubreTerritorio(c: Convocatoria, t: { provincia: string | null; ccaa: string | null; codigoIne?: string | null }): boolean {
  if (t.codigoIne && c.ubicacion?.codigoMunicipio === t.codigoIne) return true;
  if (c.ambitoNacional) return true;
  if (c.provincias.length) return !!t.provincia && c.provincias.includes(t.provincia);
  return !!t.ccaa && c.ccaa.includes(t.ccaa);
}

export function oportunidadesGestion(
  programadores: Programador[],
  contratos: ContratoVista[],
  festivales: Festival[],
  ayudasFestivales: Convocatoria[],
  hoy = new Date(),
): OportunidadGestion[] {
  const porProgramador = new Map<string, ContratoVista[]>();
  for (const c of contratos) {
    const id = idProgramador(c);
    porProgramador.set(id, [...(porProgramador.get(id) ?? []), c]);
  }
  const salida: OportunidadGestion[] = [];
  for (const p of programadores) {
    const cs = porProgramador.get(p.id) ?? [];
    const senales: Senal[] = [];
    const integrales = cs.filter((c) => esGestionIntegral(c.titulo));
    for (const c of integrales) {
      if (abierta(c, hoy)) {
        senales.push({ tipo: 'licitacion_abierta', texto: `Licitación abierta: «${c.titulo}»${c.finPlazo ? `, ofertas hasta el ${c.finPlazo.slice(0, 10)}` : ''}`, fecha: c.finPlazo, ref: c.id, importe: c.importe });
      } else if (c.adjudicaciones.length) {
        const f = fechaDe(c);
        senales.push({
          tipo: 'gestion_externalizada',
          texto: `Ya contrata la gestión: «${c.titulo}»${f ? ` (adjudicado en ${mes(f)})` : ''}. Suele volver a licitarse.`,
          fecha: f,
          ref: c.id,
          importe: c.adjudicado,
        });
      }
    }
    // Ciclo montado por piezas: solo si no externaliza ya la gestión.
    if (!integrales.length) {
      const ciclo = cicloPorPiezas(cs.filter((c) => c.adjudicaciones.length > 0));
      if (ciclo) {
        senales.push({
          tipo: 'ciclo_por_piezas',
          texto: `Contrató ${ciclo.n} conciertos por separado entre el ${ciclo.desde} y el ${ciclo.hasta} (${Math.round(ciclo.importe).toLocaleString('es-ES')} € en total): un ciclo que podría gestionarse entero.`,
          fecha: ciclo.hasta,
          ref: null,
          importe: ciclo.importe,
        });
      }
    }
    for (const f of festivales) {
      // Nombres mal recortados del texto del contrato («Festival y la contratación de los artistas...») no sirven.
      if (/contratacion|artistas|seleccionad|servicio/.test(normalizar(f.nombre))) continue;
      if (f.organizadores.some((o) => normalizar(o) === normalizar(p.nombre))) {
        senales.push({ tipo: 'festival_propio', texto: `Organiza «${f.nombre}» (${f.anios.join(', ')})`, fecha: f.anios.length ? `${Math.max(...f.anios)}` : null, ref: f.id, importe: f.dinero || null });
      }
    }
    if (!senales.length) continue;
    // Ayudas para festivales que cubren su territorio: refuerzan, no bastan por sí solas.
    for (const a of ayudasFestivales.filter((x) => cubreTerritorio(x, p)).slice(0, 3)) {
      senales.push({ tipo: 'ayuda_festivales', texto: `Ayuda vigente para festivales: «${a.titulo}»`, fecha: a.fechaFinSolicitud, ref: a.id, importe: a.presupuesto });
    }
    const tipos = new Set(senales.map((s) => s.tipo));
    salida.push({
      programador: p.id,
      nombre: p.nombre,
      ciudad: p.ciudad,
      provincia: p.provincia,
      ccaa: p.ccaa,
      puntos: [...tipos].reduce((t, x) => t + PESOS[x], 0),
      abierta: tipos.has('licitacion_abierta'),
      senales: senales.sort((a, b) => PESOS[b.tipo] - PESOS[a.tipo] || (b.fecha ?? '').localeCompare(a.fecha ?? '')),
    });
  }
  return salida.sort((a, b) => b.puntos - a.puntos);
}
