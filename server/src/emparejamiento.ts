// Cruza el perfil del promotor con las convocatorias y explica por qué encaja cada una.

import type { Convocatoria, Estilo, Linea, Perfil } from './tipos.js';

export type Plazo = 'abierta' | 'proxima' | 'cerrada' | 'desconocido';

/**
 * Estado del plazo de solicitud. Las fechas mandan sobre el indicador "abierto" de la
 * BDNS, que a veces vale false en convocatorias recién registradas cuyo plazo aún no
 * ha empezado ("a partir del día siguiente de la publicación en el boletín").
 */
export function plazo(c: Convocatoria, hoy = new Date()): Plazo {
  const dia = hoy.toISOString().slice(0, 10);
  if (c.tipo === 'directa') return 'desconocido';
  if (c.fechaInicioSolicitud && c.fechaInicioSolicitud > dia) return 'proxima';
  if (c.fechaFinSolicitud) {
    if (c.fechaFinSolicitud < dia) return 'cerrada';
    // Hay fecha de fin pero el plazo depende de una publicación pendiente.
    if (!c.fechaInicioSolicitud && c.abierta === false && c.textoInicio) return 'proxima';
    return 'abierta';
  }
  if (c.abierta === true) return 'abierta';
  return 'desconocido';
}

export interface Coincidencia {
  convocatoria: Convocatoria;
  puntuacion: number;
  /** directo: puede pedirla; indirecto: la cobran ayuntamientos (clientes potenciales);
   *  precedente: concesión directa o nominativa, sirve de referencia para negociar una propia. */
  /** artistas: premios, concursos o becas para personas físicas, a los que se presentan sus músicos. */
  encaje: 'directo' | 'indirecto' | 'precedente' | 'artistas';
  plazo: Plazo;
  motivos: string[];
  avisos: string[];
}

export function estilosDelPerfil(perfil: Perfil): Estilo[] {
  return [...new Set(perfil.grupos.map((g) => g.estilo))];
}

const NOMBRE_ESTILO: Record<Estilo, string> = { jazz: 'jazz', clasica: 'clásica', opera: 'ópera/lírica' };
const NOMBRE_LINEA: Record<Linea, string> = {
  giras: 'giras',
  festivales: 'festivales y ciclos',
  produccion: 'producción',
  grabacion: 'grabación',
  internacional: 'internacional',
  composicion: 'composición',
  formacion: 'formación',
  equipamiento: 'equipamiento',
};

/** Devuelve null si la convocatoria no le sirve al promotor. */
export function evaluar(c: Convocatoria, perfil: Perfil, hoy = new Date()): Coincidencia | null {
  const cl = c.clasificacion;
  if (!cl.musical) return null;

  const motivos: string[] = [];
  const avisos: string[] = [];
  let puntuacion = 0;

  // Estilos
  const estilos = estilosDelPerfil(perfil);
  const explicitos = cl.estilosExplicitos.filter((e) => estilos.includes(e));
  if (explicitos.length > 0) {
    puntuacion += 40;
    motivos.push(`Menciona expresamente ${explicitos.map((e) => NOMBRE_ESTILO[e]).join(', ')}`);
  } else if (cl.generica) {
    puntuacion += 20;
    motivos.push('Ayuda de música sin restricción de estilo');
  } else if (estilos.length > 0) {
    return null;
  }

  // Territorio: ámbito nacional, o alguna comunidad donde el promotor tiene sede o actúa.
  if (c.ambitoNacional) {
    puntuacion += 15;
    motivos.push('Sin restricción territorial');
  } else if (c.ccaa.length === 0) {
    avisos.push('La BDNS no indica el ámbito territorial: revisa las bases');
  } else {
    const comunidades = new Set([perfil.ccaaSede, ...perfil.ccaaActuacion].filter(Boolean));
    const enZona = c.ccaa.filter((x) => comunidades.has(x));
    if (enZona.length === 0) return null;
    puntuacion += 15;
    motivos.push(`Ámbito: ${(c.provincias.length > 0 ? c.provincias : enZona).join(', ')}`);
    if (perfil.ccaaSede && !c.ccaa.includes(perfil.ccaaSede)) {
      avisos.push('Tu sede está fuera del ámbito: revisa si exige domicilio en la región');
    }
  }

  // Quién puede pedirla
  const b = cl.beneficiarios;
  const esEmpresa = perfil.formaJuridica === 'autonomo' || perfil.formaJuridica === 'sociedad';
  const admitido = esEmpresa ? b.empresas : b.sinAnimoLucro;
  let encaje: Coincidencia['encaje'] = 'directo';
  if (admitido === true) {
    puntuacion += 30;
    motivos.push(esEmpresa ? 'Admite autónomos y empresas' : 'Admite entidades sin ánimo de lucro');
  } else if (b.entidadesLocales) {
    if (!perfil.incluirIndirectas) return null;
    encaje = 'indirecto';
    motivos.push('La cobran ayuntamientos: oportunidad para venderles programación');
  } else if (b.personasFisicas) {
    encaje = 'artistas';
    motivos.push('Para personas físicas: pueden presentarse tus músicos');
  } else if (admitido === false) {
    return null;
  } else {
    avisos.push('No consta qué tipo de beneficiario admite: revisa las bases');
  }

  // Las becas y ayudas de formación solo si las busca.
  if (cl.lineas.includes('formacion') && !perfil.actividades.includes('formacion')) return null;

  // Actividades que le interesan
  const lineas = cl.lineas.filter((l) => perfil.actividades.includes(l));
  if (lineas.length > 0) {
    puntuacion += Math.min(20, lineas.length * 10);
    motivos.push(`Financia ${lineas.map((l) => NOMBRE_LINEA[l]).join(', ')}`);
  }

  const estado = plazo(c, hoy);
  if (c.tipo === 'directa') {
    // Concesiones directas, nominativas y convenios: no hay plazo de solicitud, son precedentes.
    encaje = 'precedente';
    avisos.push('Concesión directa: se pacta con la administración, sin concurso');
  } else if (estado === 'abierta') {
    puntuacion += 10;
    motivos.push('Plazo abierto');
  } else if (estado === 'proxima') {
    puntuacion += 10;
    motivos.push('Plazo a punto de abrir');
  } else if (estado === 'cerrada') {
    avisos.push('Plazo cerrado: suele repetirse cada año, prepárala para la próxima');
  }

  return { convocatoria: c, puntuacion, encaje, plazo: estado, motivos, avisos };
}

export function emparejar(convocatorias: Convocatoria[], perfil: Perfil, hoy = new Date()): Coincidencia[] {
  return convocatorias
    .map((c) => evaluar(c, perfil, hoy))
    .filter((x): x is Coincidencia => x !== null)
    .sort((a, b) => b.puntuacion - a.puntuacion);
}
