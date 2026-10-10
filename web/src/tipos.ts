// Espejo de los tipos que devuelve la API (server/src/tipos.ts).

export type Estilo = 'jazz' | 'clasica' | 'opera';
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
export type Plazo = 'abierta' | 'proxima' | 'cerrada' | 'desconocido';
export type FormaJuridica = 'autonomo' | 'sociedad' | 'asociacion' | 'fundacion';

export interface Clasificacion {
  musical: boolean;
  culturaGeneral: boolean;
  estilosExplicitos: Estilo[];
  estilosCompatibles: Estilo[];
  generica: boolean;
  otrosGeneros: string[];
  lineas: Linea[];
  encajePromotor: 'si' | 'indirecto' | 'artistas' | 'no' | 'desconocido';
  evidencias: string[];
}

export interface ResumenConcesiones {
  numero: number;
  importeTotal: number;
  ultimaFecha: string | null;
  entidades: { nombre: string; importe: number; fecha: string | null }[];
}

export interface Convocatoria {
  id: string;
  origen: 'bdns';
  tipo: 'concurrencia' | 'directa';
  tipoConvocatoria: string | null;
  codigoBdns: string;
  titulo: string;
  organo: string;
  organoNiveles: string[];
  administracion: Administracion;
  ambitoNacional: boolean;
  ccaa: string[];
  provincias: string[];
  presupuesto: number | null;
  fechaPublicacion: string | null;
  fechaInicioSolicitud: string | null;
  fechaFinSolicitud: string | null;
  urlBases: string | null;
  urlDetalle: string;
  textoInicio: string | null;
  textoFin: string | null;
  finalidad: string | null;
  concesiones: ResumenConcesiones | null;
  clasificacion: Clasificacion;
  plazo: Plazo;
  /** Id del organismo convocante (página #/organismo/:id). */
  organismoId: string;
  /** Municipio o provincia del organismo, si se ha podido situar. */
  ubicacion: Ubicacion | null;
  /** La misma convocatoria en otros años, si se repite. */
  serie?: Serie | null;
  /** Documentos registrados en la BDNS, con su descarga oficial. */
  documentos: { id: number; nombre: string; descripcion: string | null; url: string }[];
  /** Hay ficha extraída de las bases (solo en los listados). */
  tieneFicha?: boolean;
  /** Solo en el detalle (GET /api/convocatorias/:id). */
  ficha?: Ficha | null;
  /** Solo en el detalle y si no hay ficha leída: extracto por apartados y frases de las bases, sin IA. */
  basica?: FichaBasica | null;
}

export type ApartadoExtracto = 'beneficiarios' | 'objeto' | 'bases' | 'cuantia' | 'plazo' | 'presentacion' | 'otros';
export type CampoBasico = 'importeMaximo' | 'porcentajeMaximo' | 'plazo' | 'minimis' | 'compatibilidad' | 'caches';

export interface FichaBasica {
  extracto: {
    titulo: string;
    diario: string | null;
    fecha: string | null;
    url: string | null;
    apartados: { tipo: ApartadoExtracto; texto: string }[];
  } | null;
  datos: { campo: CampoBasico; valor: number | null; documento: number; pagina: number; texto: string }[];
}

/** Cita literal de las bases, comprobada contra el texto del documento. */
export interface Cita {
  documento: number;
  pagina: number;
  texto: string;
  estado: 'verificada' | 'revisar';
  motivo?: string;
}

export interface Dato<T = string> {
  valor: T | null;
  cita: Cita | null;
  /** El modelo dio un valor sin cita: no se da por bueno. */
  sinCita?: boolean;
}

export interface ElementoFicha {
  texto: string;
  cita: Cita | null;
  sinCita?: boolean;
}

export interface Ficha {
  codigoBdns: string;
  generada: string;
  modelo: string;
  documentos: { id: number; nombre: string; paginas: number }[];
  citas: { verificadas: number; revisar: number; noConsta: number };
  datos: {
    documentoEsBases: boolean;
    resumen: string[];
    objeto: Dato;
    beneficiarios: Dato;
    plazos: {
      presentacion: Dato;
      inicioPresentacion: Dato;
      finPresentacion: Dato;
      resolucion: Dato;
      ejecucion: Dato;
      justificacion: Dato;
    };
    dinero: {
      presupuestoTotal: Dato<number>;
      importeMaximo: Dato<number>;
      porcentajeMaximo: Dato<number>;
      pago: Dato;
      compatibilidad: Dato;
      minimis: Dato;
    };
    requisitos: ElementoFicha[];
    gastosSubvencionables: ElementoFicha[];
    gastosNoSubvencionables: ElementoFicha[];
    criterios: { criterio: string; puntosMaximos: number | null; cita: Cita | null; sinCita?: boolean }[];
    documentacion: ElementoFicha[];
    presentacion: { lugar: Dato; url: Dato; certificadoDigital: Dato };
    avisos: string[];
  };
}

export interface Coincidencia {
  convocatoria: Convocatoria;
  puntuacion: number;
  encaje: 'directo' | 'indirecto' | 'precedente' | 'artistas';
  plazo: Plazo;
  motivos: string[];
  avisos: string[];
}

export interface Grupo {
  nombre: string;
  estilo: Estilo;
  componentes?: number;
}

export interface Perfil {
  nombre: string;
  formaJuridica: FormaJuridica;
  ccaaSede: string | null;
  ccaaActuacion: string[];
  grupos: Grupo[];
  actividades: Linea[];
  incluirIndirectas: boolean;
}

export interface Meta {
  ccaa: string[];
  estilos: Estilo[];
  lineas: Linea[];
  total: number;
  musicales: number;
  culturaGeneral: number;
  ultimaActualizacion: string | null;
  fuente: string;
}

export const NOMBRE_ESTILO: Record<Estilo, string> = { jazz: 'Jazz', clasica: 'Clásica', opera: 'Ópera y lírica' };
export const NOMBRE_LINEA: Record<Linea, string> = {
  giras: 'Giras',
  festivales: 'Festivales y ciclos',
  produccion: 'Producción',
  grabacion: 'Grabación',
  internacional: 'Internacional',
  composicion: 'Composición',
  formacion: 'Formación',
  equipamiento: 'Equipamiento',
};
export const NOMBRE_ADMINISTRACION: Record<Administracion, string> = {
  estatal: 'Estatal',
  autonomica: 'Autonómica',
  local: 'Local',
  otra: 'Otra',
};
export const NOMBRE_FORMA: Record<FormaJuridica, string> = {
  autonomo: 'Autónomo',
  sociedad: 'Sociedad (SL, SA…)',
  asociacion: 'Asociación',
  fundacion: 'Fundación',
};

export interface Serie {
  id: string;
  anios: number[];
  mesHabitual: number | null;
  /** Estimación aaaa-mm de la próxima, a partir del historial. No es un dato oficial. */
  proximaPrevista: string | null;
  retrasada: boolean;
  convocatorias: {
    id: string;
    anio: number | null;
    titulo: string;
    presupuesto: number | null;
    concedido: number | null;
    fechaInicioSolicitud: string | null;
    fechaFinSolicitud: string | null;
  }[];
}

export interface Ubicacion {
  provincia: string | null;
  codigoProvincia: string | null;
  ccaa: string;
  municipio: string | null;
  codigoMunicipio: string | null;
}

export interface Organismo {
  id: string;
  nombre: string;
  entidad: string | null;
  niveles: string[];
  administracion: Administracion;
  ubicacion: Ubicacion | null;
  convocatorias: number;
  concursos: number;
  directas: number;
  series: number;
  presupuestoTotal: number;
  concedidoTotal: number;
  primerAnio: number | null;
  ultimoAnio: number | null;
  porAnio: { anio: number; convocatorias: number; presupuesto: number; concedido: number }[];
  beneficiarios: { nombre: string; importe: number; veces: number }[];
}

export interface EventoCalendario {
  tipo: 'abre' | 'cierra' | 'prevista';
  /** aaaa-mm-dd; en las previstas, aaaa-mm. */
  fecha: string;
  convocatoria: {
    id: string;
    codigoBdns: string;
    titulo: string;
    organo: string;
    organismoId: string;
    ambito: string;
    presupuesto: number | null;
    culturaGeneral: boolean;
    anio: number | null;
  };
}

export interface Mercado {
  totales: { convocatorias: number; concursos: number; directas: number; presupuesto: number; concedido: number; organismos: number };
  primerAnioConcesiones: number | null;
  porAnio: { anio: number; convocatorias: number; concursos: number; presupuesto: number; concedido: number }[];
  porComunidad: { nombre: string; convocatorias: number; concedido: number }[];
  porLinea: { linea: Linea | 'sin'; convocatorias: number; concedido: number }[];
}
