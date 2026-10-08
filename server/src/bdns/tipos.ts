// Forma de las respuestas de la API pública de la BDNS (SNPSAP).
// Documentación oficial: https://www.infosubvenciones.es/bdnstrans/doc/swagger
// Los campos se han escrito según la documentación y clientes públicos conocidos;
// todos son opcionales porque hay que validarlos contra la API real (ver docs/fuentes-de-datos.md).

export interface BdnsPagina<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  last?: boolean;
}

/** Elemento del listado GET /convocatorias/busqueda */
export interface BdnsResultadoBusqueda {
  id?: number;
  numeroConvocatoria?: string;
  descripcion?: string;
  descripcionLeng?: string | null;
  fechaRecepcion?: string;
  nivel1?: string;
  nivel2?: string;
  nivel3?: string;
  mrr?: boolean;
}

interface ConDescripcion {
  descripcion?: string;
}

/** Detalle GET /convocatorias?numConv=... */
export interface BdnsConvocatoria {
  id?: number;
  codigoBDNS?: string;
  organo?: { nivel1?: string; nivel2?: string; nivel3?: string };
  sedeElectronica?: string | null;
  fechaRecepcion?: string;
  instrumentos?: ConDescripcion[];
  tipoConvocatoria?: string;
  presupuestoTotal?: number | null;
  descripcion?: string;
  descripcionLeng?: string | null;
  tiposBeneficiarios?: ConDescripcion[];
  sectores?: (ConDescripcion & { codigo?: string })[];
  regiones?: ConDescripcion[];
  descripcionFinalidad?: string | null;
  descripcionBasesReguladoras?: string | null;
  urlBasesReguladoras?: string | null;
  abierto?: boolean | null;
  fechaInicioSolicitud?: string | null;
  fechaFinSolicitud?: string | null;
  textInicio?: string | null;
  textFin?: string | null;
  anuncios?: { titulo?: string; texto?: string; url?: string; datPublicacion?: string }[];
  documentos?: { id?: number; descripcion?: string; nombreFic?: string }[];
}
