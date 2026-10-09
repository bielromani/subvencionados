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
