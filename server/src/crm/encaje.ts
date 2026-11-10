// Encaje del catálogo con entidades, ayudas y licitaciones. Reglas:
// - Toda España, sin priorizar por tamaño del municipio.
// - Sin historial conocido de la entidad, se ofrece un abanico amplio del catálogo en vez de descartarla.
// - Lo que no está confirmado (fichas pendientes, precios desconocidos) se marca y nunca se da por cerrado.
// - Grado de certeza de cada ayuda: «potencial» por defecto; «confirmada» solo si la BDNS publica la concesión a esa
//   entidad (o el usuario enlaza la resolución); «revisada» la marca el usuario.

import { normalizar } from '../clasificacion/musica.js';
import { type Formacion, FORMACIONES_DE_TIPO, NOMBRE_FORMACION } from '../contratos/formacion.js';
import type { ContratoVista } from '../contratos/vista.js';
import type { Programador } from '../directorio.js';
import type { Convocatoria, Estilo } from '../tipos.js';
import { type Certeza, type Espectaculo, PESO_PRIORIDAD, type TipoEspectaculo } from './tipos.js';

/** Qué tipos del catálogo corresponden a cada estilo de los datos públicos. */
const TIPOS_DE_ESTILO: Record<Estilo, TipoEspectaculo[]> = {
  opera: ['opera'],
  clasica: ['sinfonico_coral', 'sinfonica', 'religiosa', 'camara'],
  jazz: ['jazz'],
};

/** Tipos afines: a quien programa uno, se le puede ofrecer el otro (por detrás de lo que programa). */
const AFINES: Partial<Record<TipoEspectaculo, TipoEspectaculo[]>> = {
  opera: ['sinfonico_coral', 'religiosa'],
  sinfonico_coral: ['opera', 'religiosa', 'sinfonica'],
  religiosa: ['sinfonico_coral', 'camara'],
  sinfonica: ['sinfonico_coral', 'camara'],
  camara: ['sinfonica', 'religiosa', 'fusion'],
  jazz: ['fusion', 'rock'],
  rock: ['jazz', 'fusion'],
  fusion: ['jazz', 'camara'],
};

const NOMBRE_TIPO_CORTO: Record<TipoEspectaculo, string> = {
  opera: 'ópera',
  sinfonico_coral: 'sinfónico-coral',
  sinfonica: 'sinfónico',
  religiosa: 'música religiosa',
  camara: 'cámara',
  jazz: 'jazz',
  rock: 'rock',
  navidad: 'Navidad',
  fusion: 'fusión',
  festivales: 'festivales',
  otro: 'otros',
};

/** Meses de diciembre y enero: programación de Navidad. */
const MESES_NAVIDAD = [11, 12, 1];
/** Una ficha sin revisar en este tiempo pasa a «pendiente de actualización». */
const DIAS_VIGENCIA = 180;

export interface Encaje {
  espectaculo: Espectaculo;
  puntos: number;
  motivos: string[];
  avisos: string[];
}

/** Avisos de vigencia de una ficha: lo que no se puede ofrecer como cerrado. */
export function avisosFicha(e: Espectaculo, hoy = new Date()): string[] {
  const avisos: string[] = [];
  if (e.enWeb === false) avisos.push('Ya no aparece en la web: comprobar si sigue disponible');
  if (e.estadoInfo === 'pendiente') avisos.push('Ficha pendiente de actualización: no ofrecer precio ni fechas como cerrados');
  else if (!e.revisado) avisos.push('Ficha sin revisar');
  else if (Date.parse(e.revisado) < hoy.getTime() - DIAS_VIGENCIA * 86_400_000) avisos.push(`Ficha sin revisar desde hace más de ${DIAS_VIGENCIA / 30} meses`);
  if (e.precioMin == null && e.precioMax == null) avisos.push('Sin precio orientativo');
  if (!e.requisitos.trim()) avisos.push('Requisitos técnicos sin confirmar');
  return avisos;
}

const euros = (n: number) => `${Math.round(n).toLocaleString('es-ES')} €`;

/** Propuestas del catálogo que podrían encajar con una entidad (ordenadas; nunca vacío si hay catálogo). */
export function encajeEntidad(catalogo: Espectaculo[], p: Programador | null, hoy = new Date(), opciones: { afines?: boolean } = {}): { amplio: boolean; propuestas: Encaje[] } {
  const historial = p ? (Object.entries(p.estilos) as [Estilo, number][]).filter(([, n]) => n > 0) : [];
  const tiposConocidos = new Map<TipoEspectaculo, number>();
  // «Clásica» es demasiado amplio: si se sabe la formación (cuarteto, coro, sinfónica…), cuenta esa.
  const formaciones = p?.formaciones ?? {};
  const detalleClasica = (['camara', 'sinfonica', 'coral', 'religiosa'] as Formacion[]).some((f) => (formaciones[f] ?? 0) > 0);
  const deFormacion = new Map<TipoEspectaculo, Formacion>();
  for (const [estilo, n] of historial) {
    if (estilo === 'clasica' && detalleClasica) continue;
    for (const t of TIPOS_DE_ESTILO[estilo]) tiposConocidos.set(t, (tiposConocidos.get(t) ?? 0) + n);
  }
  if (detalleClasica)
    for (const t of TIPOS_DE_ESTILO.clasica) {
      const fs = (FORMACIONES_DE_TIPO[t] ?? []).filter((f) => (formaciones[f] ?? 0) > 0).sort((a, b) => formaciones[b]! - formaciones[a]!);
      const n = fs.reduce((s, f) => s + formaciones[f]!, 0);
      if (n) {
        tiposConocidos.set(t, n);
        deFormacion.set(t, fs[0]!);
      }
    }
  // Afines: el tipo del que viene (para explicarlo), solo si no lo programa ya.
  const afinDe = new Map<TipoEspectaculo, TipoEspectaculo>();
  if (opciones.afines) for (const t of tiposConocidos.keys()) for (const a of AFINES[t] ?? []) if (!tiposConocidos.has(a) && !afinDe.has(a)) afinDe.set(a, t);
  const navidad = p?.meses.some((m) => MESES_NAVIDAD.includes(m)) ?? false;
  const propuestas = catalogo.map((e): Encaje => {
    const motivos: string[] = [];
    const avisos = avisosFicha(e, hoy);
    let puntos = 0;
    const n = tiposConocidos.get(e.tipo);
    if (n) {
      // Pesa cuánto lo programa: a quien hace mucha ópera, primero las óperas.
      puntos += 3 + Math.min(n, 40) / 10;
      const f = deFormacion.get(e.tipo);
      motivos.push(`Ha contratado ${n} ${n === 1 ? 'concierto' : 'conciertos'} ${f ? `de ${NOMBRE_FORMACION[f]}` : 'de este estilo'}`);
    } else if (afinDe.has(e.tipo)) {
      // Por detrás de lo que programa: solo completa el correo si faltan propuestas.
      puntos += 1.5;
      motivos.push(`Afín a lo que programa (${NOMBRE_TIPO_CORTO[afinDe.get(e.tipo)!]})`);
    }
    if (e.tipo === 'navidad' && navidad) {
      puntos += 2;
      motivos.push('Suele contratar en Navidad');
    }
    if (e.tipo === 'festivales' && p && p.contratos >= 5) {
      puntos += 1;
      motivos.push(`Programa con regularidad (${p.contratos} contratos de música)`);
    }
    // El precio se compara con lo que paga por la misma formación; si no hay datos, con lo que paga en general.
    const rangos = p?.rangos ?? {};
    const fPrecio = (FORMACIONES_DE_TIPO[e.tipo] ?? []).filter((f) => rangos[f]).sort((a, b) => rangos[b]!.contratos - rangos[a]!.contratos)[0];
    const rango = fPrecio ? rangos[fPrecio]! : p?.rango;
    const que = fPrecio ? `por ${NOMBRE_FORMACION[fPrecio]}` : 'en general';
    if (rango && e.precioMin != null) {
      if (e.precioMin <= rango.max) {
        puntos += 1;
        motivos.push(`Precio dentro de lo que suele pagar ${que} (${euros(rango.min)}–${euros(rango.max)})`);
      } else avisos.push(`Por encima de lo que suele pagar ${que} (${euros(rango.min)}–${euros(rango.max)}): valorar con ayudas o coproducción`);
    }
    if (e.estadoInfo === 'pendiente') puntos -= 0.5;
    // La prioridad que le da el usuario reordena entre las que ya encajan; no hace encajar a las demás.
    if (motivos.length && e.prioridad && e.prioridad !== 'normal') puntos = Math.max(0.5, puntos + PESO_PRIORIDAD[e.prioridad]);
    return { espectaculo: e, puntos, motivos, avisos };
  });
  const conMotivo = propuestas.filter((x) => x.motivos.length > 0);
  // Sin certeza sobre sus gustos: abanico amplio y ordenado (un espectáculo por tipo primero).
  if (conMotivo.length === 0) {
    const porTipo = new Map<TipoEspectaculo, Encaje[]>();
    for (const x of propuestas) porTipo.set(x.espectaculo.tipo, [...(porTipo.get(x.espectaculo.tipo) ?? []), x]);
    const ordenados = [...porTipo.values()].flatMap((xs, i) => xs.map((x, j) => ({ ...x, puntos: -(j * 100 + i) })));
    return { amplio: true, propuestas: ordenados.sort((a, b) => b.puntos - a.puntos).map((x) => ({ ...x, motivos: ['Sin historial conocido: propuesta del abanico general'] })) };
  }
  return { amplio: false, propuestas: propuestas.sort((a, b) => b.puntos - a.puntos) };
}

/** Espectáculos del catálogo que una ayuda podría financiar (por estilos y líneas de la convocatoria). */
export function encajeAyuda(catalogo: Espectaculo[], c: Convocatoria, hoy = new Date()): Encaje[] {
  const cl = c.clasificacion;
  const tipos = new Set<TipoEspectaculo>(cl.estilosCompatibles.flatMap((e) => TIPOS_DE_ESTILO[e]));
  const festivales = cl.lineas.includes('festivales');
  return catalogo
    .map((e): Encaje => {
      const motivos: string[] = [];
      let puntos = 0;
      if (!cl.musical && cl.destino === 'programadores') {
        puntos += 1;
        motivos.push('Programación cultural general: cabe cualquier propuesta');
      }
      if (tipos.has(e.tipo)) {
        puntos += 3;
        motivos.push('Estilo compatible con la convocatoria');
      }
      if (e.tipo === 'festivales' && festivales) {
        puntos += 3;
        motivos.push('Financia festivales');
      }
      return { espectaculo: e, puntos, motivos, avisos: avisosFicha(e, hoy) };
    })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);
}

export type Viabilidad = 'viable' | 'ajustada' | 'pendiente';

/** Licitación ↔ catálogo: espectáculos que encajan y viabilidad preliminar (o «Pendiente de valorar»). */
export function encajeLicitacion(catalogo: Espectaculo[], c: ContratoVista, hoy = new Date()): (Encaje & { viabilidad: Viabilidad; motivoViabilidad: string })[] {
  const tipos = new Set<TipoEspectaculo>(c.estilos.flatMap((e) => TIPOS_DE_ESTILO[e]));
  const titulo = normalizar(c.titulo);
  return catalogo
    .map((e) => {
      const motivos: string[] = [];
      let puntos = 0;
      if (tipos.has(e.tipo)) {
        puntos += 3;
        motivos.push('Estilo que pide la licitación');
      }
      if (e.tipo === 'navidad' && /\b(navidad|nadal|reyes)\b/.test(titulo)) {
        puntos += 3;
        motivos.push('Programación de Navidad');
      }
      if (e.tipo === 'festivales' && /\b(festival|ciclo|cicle|organizacion|gestion|produccion)\b/.test(titulo)) {
        puntos += 3;
        motivos.push('Organización o gestión de festival o ciclo');
      }
      const avisos = avisosFicha(e, hoy);
      let viabilidad: Viabilidad = 'pendiente';
      let motivoViabilidad = 'Pendiente de valorar: falta el presupuesto de la licitación o el precio de la propuesta';
      if (c.importe != null && e.precioMin != null && e.estadoInfo === 'vigente') {
        if (e.precioMin <= c.importe) {
          viabilidad = 'viable';
          motivoViabilidad = `Presupuesto base (${euros(c.importe)}) por encima del precio orientativo (desde ${euros(e.precioMin)})`;
        } else {
          viabilidad = 'ajustada';
          motivoViabilidad = `Presupuesto base (${euros(c.importe)}) por debajo del precio orientativo (desde ${euros(e.precioMin)})`;
        }
      } else if (e.estadoInfo === 'pendiente') motivoViabilidad = 'Pendiente de valorar: la ficha del espectáculo no está actualizada';
      return { espectaculo: e, puntos, motivos, avisos, viabilidad, motivoViabilidad };
    })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);
}

/** Si la BDNS ya publica la concesión de esta convocatoria a la entidad: financiación confirmada. */
export function certezaAyuda(c: Convocatoria, entidad: { nombre: string; municipio: string | null }): { certeza: Certeza; motivo: string } {
  const municipio = entidad.municipio ? normalizar(entidad.municipio) : null;
  const nombre = normalizar(entidad.nombre);
  const concedida = c.concesiones?.entidades.find((x) => {
    const n = normalizar(x.nombre);
    // «AJUNTAMENT D'OLOT» es el Ayuntamiento de Olot: municipio y palabra de ayuntamiento, o el nombre completo.
    return (municipio && n.includes(municipio) && /ayuntamiento|ajuntament|concello|udala|ayto|municipal/.test(n)) || (nombre.length > 8 && n.includes(nombre));
  });
  if (concedida) return { certeza: 'confirmada', motivo: `Concesión publicada en la BDNS a ${concedida.nombre}` };
  return { certeza: 'potencial', motivo: 'Parece pertinente; requisitos pendientes de verificar' };
}
