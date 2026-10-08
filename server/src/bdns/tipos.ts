// Forma de las respuestas de la API pública de la BDNS (SNPSAP), comprobada contra
// la API real en octubre de 2026. Base: https://www.pap.hacienda.gob.es/bdnstrans/api

export interface BdnsPagina<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  last?: boolean;
}

/** Elemento del listado GET /convocatorias/busqueda */
export interface BdnsResultadoBusqueda {
  id?: number;
  mrr?: boolean;
  numeroConvocatoria?: string;
  descripcion?: string;
  descripcionLeng?: string | null;
  fechaRecepcion?: string;
  /** "ESTADO", "AUTONOMICA", "LOCAL" u "OTROS". */
  nivel1?: string;
  nivel2?: string;
  nivel3?: string;
  codigoInvente?: string | null;
}

interface ConDescripcion {
  descripcion?: string;
}

/** Detalle GET /convocatorias?vpd=GE&numConv=... */
export interface BdnsConvocatoria {
  id?: number;
  organo?: { nivel1?: string; nivel2?: string; nivel3?: string };
  sedeElectronica?: string | null;
  codigoBDNS?: string;
  fechaRecepcion?: string;
  instrumentos?: ConDescripcion[];
  /** "Concurrencia competitiva - canónica", "Concesión directa - instrumental"... */
  tipoConvocatoria?: string | null;
  presupuestoTotal?: number | null;
  mrr?: boolean;
  descripcion?: string;
  descripcionLeng?: string | null;
  tiposBeneficiarios?: ConDescripcion[];
  sectores?: (ConDescripcion & { codigo?: string })[];
  /** "ES511 - Barcelona", "ES - ESPAÑA", "XXXX - TODO EL MUNDO"... */
  regiones?: ConDescripcion[];
  descripcionFinalidad?: string | null;
  descripcionBasesReguladoras?: string | null;
  urlBasesReguladoras?: string | null;
  sePublicaDiarioOficial?: boolean | null;
  abierto?: boolean | null;
  fechaInicioSolicitud?: string | null;
  fechaFinSolicitud?: string | null;
  textInicio?: string | null;
  textFin?: string | null;
  ayudaEstado?: string | null;
  urlAyudaEstado?: string | null;
  fondos?: unknown[];
  reglamento?: unknown;
  objetivos?: unknown[];
  sectoresProductos?: unknown[];
  documentos?: { id?: number; descripcion?: string; nombreFic?: string; long?: number; datMod?: string; datPublicacion?: string }[];
  anuncios?: { numAnuncio?: number; titulo?: string; texto?: string; url?: string; des_diario_oficial?: string; datPublicacion?: string }[];
}

/** Elemento de GET /concesiones/busqueda */
export interface BdnsConcesion {
  id?: number;
  codConcesion?: string;
  fechaConcesion?: string;
  /** "G46152195 NOMBRE" para personas jurídicas; "***1234** NOMBRE" para personas físicas. */
  beneficiario?: string;
  instrumento?: string;
  importe?: number;
  ayudaEquivalente?: number;
  urlBR?: string | null;
  tieneProyecto?: boolean;
  numeroConvocatoria?: string;
  idConvocatoria?: number;
  convocatoria?: string;
  nivel1?: string;
  nivel2?: string;
  nivel3?: string;
  idPersona?: number;
  fechaAlta?: string;
}
