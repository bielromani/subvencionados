// Prospección y seguimiento (CRM) de cada cuenta: su catálogo, las entidades a las que ofrece programación, las
// oportunidades concretas con cada una y las secuencias de cinco envíos escritos con aprobación humana.

import type { PlantillasCarta } from './cartas.js';

export type TipoEspectaculo = 'opera' | 'sinfonico_coral' | 'sinfonica' | 'religiosa' | 'camara' | 'jazz' | 'rock' | 'navidad' | 'fusion' | 'festivales' | 'otro';
export const TIPOS_ESPECTACULO: TipoEspectaculo[] = ['opera', 'sinfonico_coral', 'sinfonica', 'religiosa', 'camara', 'jazz', 'rock', 'navidad', 'fusion', 'festivales', 'otro'];

/** Ficha del catálogo. Lo que no está confirmado se enseña como provisional y no se ofrece como cerrado. */
export interface Espectaculo {
  id: string;
  nombre: string;
  tipo: TipoEspectaculo;
  formato: string;
  requisitos: string;
  precioMin: number | null;
  precioMax: number | null;
  disponibilidad: string;
  fechasCerradas: string;
  ambito: string;
  enlace: string;
  estadoInfo: 'vigente' | 'pendiente';
  /** Última vez que se revisó la ficha (aaaa-mm-dd). */
  revisado: string | null;
  /** De dónde se importó («arsvia.org#3»), para actualizarla sin duplicar. */
  origen?: string;
  /** Sigue publicada en la web de origen. */
  enWeb?: boolean;
  /** Resumen de lo que decía la web en la última importación (para saber si ha cambiado). */
  huellaWeb?: string;
  /** Párrafo con que se presenta en las cartas (castellano y catalán). */
  textoCarta?: string;
  textoCartaCa?: string;
}

export type TipoEntidad = 'ayuntamiento' | 'auditorio' | 'teatro' | 'festival' | 'otro';
export type EstadoRelacion = 'nueva' | 'en_secuencia' | 'respondio' | 'llamada' | 'reunion' | 'interesado' | 'no_interesado' | 'recontactar' | 'sin_respuesta';

export interface Entidad {
  id: string;
  /** Programador del directorio público (p-...) al que corresponde, si lo hay. */
  ref: string | null;
  nombre: string;
  tipo: TipoEntidad;
  municipio: string | null;
  provincia: string | null;
  ccaa: string | null;
  persona: string | null;
  email: string | null;
  telefono: string | null;
  idioma: 'es' | 'ca';
  estadoRelacion: EstadoRelacion;
  /** Ha pedido no recibir más comunicaciones: se respeta en el futuro. */
  noContactar: boolean;
  motivoNoContactar: string | null;
  notas: string;
}

export type TipoOportunidad = 'subvencion' | 'licitacion' | 'ciclo' | 'gestion_festival' | 'propuesta';
/** Grado de certeza: nunca se presenta un encaje potencial o revisado como financiación garantizada. */
export type Certeza = 'potencial' | 'revisada' | 'confirmada';

export interface Oportunidad {
  id: string;
  entidad: string;
  tipo: TipoOportunidad;
  /** Convocatoria (bdns-...) o contrato del que sale, si lo hay. */
  ref: string | null;
  titulo: string;
  espectaculos: string[];
  certeza: Certeza;
  /** Enlace a la resolución o confirmación oficial, para «confirmada». */
  enlaceConfirmacion: string | null;
  estado: 'abierta' | 'cerrada';
  notas: string;
  creado: string;
}

export type EstadoSecuencia = 'activa' | 'pausada' | 'respondida' | 'anulada' | 'sustituida' | 'sin_respuesta';

export interface Secuencia {
  id: string;
  oportunidad: string;
  entidad: string;
  destinatario: string;
  estado: EstadoSecuencia;
  motivoCierre: string | null;
  creado: string;
  cerrada: string | null;
}

/**
 * borrador: preparado por el sistema, pendiente de revisar. aprobado: con el visto bueno, listo para enviarlo desde el
 * correo propio. programado: saldrá solo a la hora indicada (cancelable). enviado: envío efectivo (cuenta para los
 * plazos y las alertas). cancelado / descartado: no se envía.
 */
export type EstadoMensaje = 'borrador' | 'aprobado' | 'programado' | 'enviado' | 'cancelado' | 'descartado';

export interface Mensaje {
  id: string;
  secuencia: string;
  paso: number;
  asunto: string;
  cuerpo: string;
  estado: EstadoMensaje;
  /** El borrador aparece en la bandeja a partir de este día (los seguimientos, ~10 días después del anterior). */
  disponibleDesde: string;
  programadoPara: string | null;
  enviadoEn: string | null;
}

export type TipoHistorial =
  | 'carta_enviada'
  | 'respuesta'
  | 'llamada'
  | 'reunion'
  | 'interesado'
  | 'no_interesado'
  | 'recontactar'
  | 'optout'
  | 'nota'
  | 'alerta_llamada'
  | 'secuencia';

export interface EntradaHistorial {
  id: string;
  entidad: string;
  oportunidad: string | null;
  secuencia: string | null;
  tipo: TipoHistorial;
  texto: string;
  fecha: string;
  /** Para alertas y «volver a contactar»: cuándo toca. */
  vence: string | null;
  hecho: boolean;
}

export interface AjustesCrm {
  remitente: string;
  organizacion: string;
  email: string;
  telefono: string;
  web: string;
  firma: string;
  /** Cargo que figura en la firma («Coordinación de proyectos y giras»). */
  cargo?: string;
  /** Días entre envíos de la secuencia (orientativo, desde el envío efectivo del anterior). */
  diasEntreEnvios: number;
  /** Textos de las cartas por bloques (si no hay, los genéricos). */
  plantillas?: PlantillasCarta;
  /** Envío automático (con el correo conectado): los primeros correos aceptados y los seguimientos salen solos. */
  envioAutomatico?: boolean;
  /** Tope de correos al día (primeros y seguimientos juntos). */
  limiteDiario?: number;
  /** Día en que se activó el envío automático: el tope sube poco a poco desde aquí para no caer en spam. */
  automaticoDesde?: string | null;
}

/** El tope del día: empieza en 20 y sube 10 por semana hasta el límite elegido. */
export function cupoDiario(a: AjustesCrm, hoy = new Date()): number {
  const max = a.limiteDiario ?? 30;
  if (!a.automaticoDesde) return Math.min(max, 20);
  const semanas = Math.floor((hoy.getTime() - new Date(`${a.automaticoDesde}T00:00:00Z`).getTime()) / (7 * 86_400_000));
  return Math.min(max, 20 + 10 * Math.max(0, semanas));
}

export const AJUSTES_POR_DEFECTO: AjustesCrm = { remitente: '', organizacion: '', email: '', telefono: '', web: '', firma: '', diasEntreEnvios: 10 };

/** Pasos de la secuencia con alerta de llamada después de su envío efectivo. */
export const PASOS_CON_LLAMADA: Record<number, string> = { 2: '1.ª llamada de seguimiento', 4: '2.ª llamada de seguimiento' };
export const PASOS = 5;
