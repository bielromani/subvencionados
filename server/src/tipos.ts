// Modelo de dominio compartido por la API, la ingesta y el emparejamiento.

export type Estilo = 'jazz' | 'clasica' | 'opera';
export const ESTILOS: Estilo[] = ['jazz', 'clasica', 'opera'];

/** Tipo de actividad que financia una convocatoria. */
export type Linea =
  | 'giras'
  | 'festivales'
  | 'produccion'
  | 'grabacion'
  | 'internacional'
  | 'composicion'
  | 'formacion'
  | 'equipamiento';

export type Administracion = 'estatal' | 'autonomica' | 'local' | 'otra';

/**
 * Si un promotor privado puede pedir la ayuda:
 * - si: el promotor es beneficiario directo.
 * - indirecto: la cobran otros (p. ej. ayuntamientos) para contratar programación,
 *   así que es una oportunidad comercial para vender conciertos.
 * - no: excluye a promotores privados.
 * - desconocido: no hay datos suficientes.
 */
export type EncajePromotor = 'si' | 'indirecto' | 'no' | 'desconocido';

/** Quién puede pedir la ayuda. null = no consta. */
export interface Beneficiarios {
  /** Autónomos y sociedades (empresas con actividad económica). */
  empresas: boolean | null;
  /** Asociaciones y fundaciones (personas jurídicas sin actividad económica). */
  sinAnimoLucro: boolean | null;
  /** Va dirigida a ayuntamientos, diputaciones u otras entidades locales. */
  entidadesLocales: boolean;
}

export interface Clasificacion {
  musical: boolean;
  /** Estilos mencionados de forma explícita en el texto. */
  estilosExplicitos: Estilo[];
  /** Estilos que pueden optar: los explícitos o, si es una ayuda genérica de música, los tres. */
  estilosCompatibles: Estilo[];
  /** Ayuda de música genérica, sin restricción de estilo. */
  generica: boolean;
  /** Otros géneros que la convocatoria cita como destinatarios (flamenco, rock...). */
  otrosGeneros: string[];
  lineas: Linea[];
  beneficiarios: Beneficiarios;
  encajePromotor: EncajePromotor;
  /** Palabras clave que han disparado la clasificación, para poder auditarla. */
  evidencias: string[];
}

export interface Convocatoria {
  id: string;
  origen: 'bdns' | 'demo';
  tipo: 'convocatoria' | 'nominativa' | 'convenio';
  codigoBdns: string | null;
  titulo: string;
  organo: string;
  /** Jerarquía del órgano convocante tal como la da la BDNS (nivel1 > nivel2 > nivel3). */
  organoNiveles: string[];
  administracion: Administracion;
  /** Comunidades autónomas del ámbito; vacío = todo el territorio nacional. */
  ccaa: string[];
  provincias: string[];
  finalidad: string | null;
  tiposBeneficiario: string[];
  presupuesto: number | null;
  fechaPublicacion: string | null;
  fechaInicioSolicitud: string | null;
  fechaFinSolicitud: string | null;
  /** true/false según la BDNS; null si no se sabe. */
  abierta: boolean | null;
  urlBases: string | null;
  urlDetalle: string | null;
  /** Texto libre usado para clasificar (título, objeto, finalidad...). */
  texto: string;
  clasificacion: Clasificacion;
  /** Primera vez que la vimos: base para las alertas de "nuevas convocatorias". */
  vistaPorPrimeraVez: string;
  actualizada: string;
}

export type FormaJuridica = 'autonomo' | 'sociedad' | 'asociacion' | 'fundacion';

export interface Grupo {
  nombre: string;
  estilo: Estilo;
  componentes?: number;
}

export interface Perfil {
  nombre: string;
  formaJuridica: FormaJuridica;
  /** Comunidad autónoma del domicilio fiscal (muchas ayudas exigen domicilio en la región). */
  ccaaSede: string | null;
  /** Comunidades donde mueve conciertos. */
  ccaaActuacion: string[];
  grupos: Grupo[];
  actividades: Linea[];
  /** Si quiere ver también convocatorias para ayuntamientos (para venderles programación). */
  incluirIndirectas: boolean;
}
