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
 * - artistas: solo personas físicas (premios, concursos, becas): sirve a los músicos del promotor.
 * - no: excluye a promotores privados.
 * - desconocido: no hay datos suficientes.
 */
export type EncajePromotor = 'si' | 'indirecto' | 'artistas' | 'no' | 'desconocido';

/** Quién puede pedir la ayuda. null = no consta. */
export interface Beneficiarios {
  /** Autónomos y sociedades (empresas con actividad económica). */
  empresas: boolean | null;
  /** Asociaciones y fundaciones (personas jurídicas sin actividad económica). */
  sinAnimoLucro: boolean | null;
  /** Va dirigida a ayuntamientos, diputaciones u otras entidades locales. */
  entidadesLocales: boolean;
  /** Personas físicas sin actividad económica: músicos que se presentan a premios, concursos o becas. */
  personasFisicas: boolean | null;
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

/** Resumen de lo concedido en una convocatoria (concesiones registradas en la BDNS). */
export interface ResumenConcesiones {
  numero: number;
  importeTotal: number;
  /** Fecha de la concesión más reciente. */
  ultimaFecha: string | null;
  /** Personas jurídicas beneficiarias (las personas físicas no se guardan por privacidad). */
  entidades: { nombre: string; importe: number; fecha: string | null }[];
}

export interface Anuncio {
  titulo: string;
  diario: string | null;
  fecha: string | null;
  url: string | null;
  /** Extracto completo en texto plano (objeto, beneficiarios, cuantía, plazo...). */
  texto: string;
}

export interface Documento {
  id: number;
  nombre: string;
  descripcion: string | null;
  fecha: string | null;
  bytes: number | null;
}

export interface Convocatoria {
  id: string;
  origen: 'bdns';
  /** concurrencia: hay que presentarse y competir; directa: concesión directa o nominativa, sin concurso. */
  tipo: 'concurrencia' | 'directa';
  /** Texto original de la BDNS ("Concurrencia competitiva - canónica", "Concesión directa - instrumental"...). */
  tipoConvocatoria: string | null;
  codigoBdns: string;
  titulo: string;
  organo: string;
  /** Jerarquía del órgano convocante tal como la da la BDNS (nivel1 > nivel2 > nivel3). */
  organoNiveles: string[];
  administracion: Administracion;
  /** Sin restricción territorial (España entera o "todo el mundo"). */
  ambitoNacional: boolean;
  /** Comunidades autónomas del ámbito. Vacío y sin ámbito nacional = la BDNS no lo indica. */
  ccaa: string[];
  provincias: string[];
  finalidad: string | null;
  sectores: string[];
  instrumentos: string[];
  tiposBeneficiario: string[];
  presupuesto: number | null;
  fechaPublicacion: string | null;
  fechaInicioSolicitud: string | null;
  fechaFinSolicitud: string | null;
  /** Indicador "abierto" de la BDNS; manda menos que las fechas de solicitud. */
  abierta: boolean | null;
  urlBases: string | null;
  urlDetalle: string;
  /** Texto del inicio del plazo cuando no hay fecha ("A partir del día siguiente de la publicación..."). */
  textoInicio: string | null;
  textoFin: string | null;
  concesiones: ResumenConcesiones | null;
  /** Extractos publicados en boletines oficiales, en texto plano. */
  anuncios: Anuncio[];
  /** Documentos registrados en la BDNS (texto de la convocatoria, bases...). */
  documentos: Documento[];
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
