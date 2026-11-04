// Cliente de la API del CRM (prospección y seguimiento de cada cuenta).
import type { Contrato, Convocatoria } from './tipos';

export type TipoEspectaculo = 'opera' | 'sinfonico_coral' | 'sinfonica' | 'religiosa' | 'camara' | 'jazz' | 'rock' | 'navidad' | 'fusion' | 'festivales' | 'otro';
export const NOMBRE_TIPO: Record<TipoEspectaculo, string> = {
  opera: 'Ópera',
  sinfonico_coral: 'Sinfónico-coral',
  sinfonica: 'Sinfónica',
  religiosa: 'Música religiosa',
  camara: 'Cámara',
  jazz: 'Jazz',
  rock: 'Rock clásico',
  navidad: 'Navidad',
  fusion: 'Mediterránea y fusión lírica',
  festivales: 'Gestión de festivales',
  otro: 'Otros',
};

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
  revisado: string | null;
  origen?: string;
  enWeb?: boolean;
  huellaWeb?: string;
  textoCarta?: string;
  textoCartaCa?: string;
}

export type TipoEntidad = 'ayuntamiento' | 'auditorio' | 'teatro' | 'festival' | 'otro';
export type EstadoRelacion = 'nueva' | 'en_secuencia' | 'respondio' | 'llamada' | 'reunion' | 'interesado' | 'no_interesado' | 'recontactar' | 'sin_respuesta';
export const NOMBRE_RELACION: Record<EstadoRelacion, string> = {
  nueva: 'Sin contactar',
  en_secuencia: 'En secuencia',
  respondio: 'Ha respondido',
  llamada: 'Llamada hecha',
  reunion: 'Reunión prevista',
  interesado: 'Interesado',
  no_interesado: 'No interesado',
  recontactar: 'Volver a contactar',
  sin_respuesta: 'Sin respuesta (archivada)',
};

export interface Entidad {
  id: string;
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
  noContactar: boolean;
  motivoNoContactar: string | null;
  notas: string;
}

export type Certeza = 'potencial' | 'revisada' | 'confirmada';
export const NOMBRE_CERTEZA: Record<Certeza, string> = { potencial: 'Encaje potencial', revisada: 'Elegibilidad revisada', confirmada: 'Financiación confirmada' };
export type TipoOportunidad = 'subvencion' | 'licitacion' | 'ciclo' | 'gestion_festival' | 'propuesta';
export const NOMBRE_OPORTUNIDAD: Record<TipoOportunidad, string> = {
  subvencion: 'Subvención',
  licitacion: 'Licitación',
  ciclo: 'Ciclo o temporada',
  gestion_festival: 'Gestión integral de festival o ciclo',
  propuesta: 'Propuesta de programación',
};

export interface Oportunidad {
  id: string;
  entidad: string;
  tipo: TipoOportunidad;
  ref: string | null;
  titulo: string;
  espectaculos: string[];
  certeza: Certeza;
  enlaceConfirmacion: string | null;
  estado: 'abierta' | 'cerrada';
  notas: string;
  creado: string;
}

export type EstadoSecuencia = 'activa' | 'pausada' | 'respondida' | 'anulada' | 'sustituida' | 'sin_respuesta';
export const NOMBRE_SECUENCIA: Record<EstadoSecuencia, string> = {
  activa: 'Activa',
  pausada: 'En pausa',
  respondida: 'Detenida: hay respuesta',
  anulada: 'Anulada',
  sustituida: 'Sustituida',
  sin_respuesta: 'Archivada sin respuesta',
};
export type EstadoMensaje = 'borrador' | 'aprobado' | 'programado' | 'enviado' | 'cancelado' | 'descartado';
export const NOMBRE_MENSAJE: Record<EstadoMensaje, string> = {
  borrador: 'Borrador',
  aprobado: 'Aprobado, falta enviarlo',
  programado: 'Programado',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
  descartado: 'Descartado',
};

export interface Mensaje {
  id: string;
  secuencia: string;
  paso: number;
  asunto: string;
  cuerpo: string;
  estado: EstadoMensaje;
  disponibleDesde: string;
  programadoPara: string | null;
  enviadoEn: string | null;
}

export interface Secuencia {
  id: string;
  oportunidad: string;
  entidad: string;
  destinatario: string;
  estado: EstadoSecuencia;
  motivoCierre: string | null;
  creado: string;
  cerrada: string | null;
  mensajes: Mensaje[];
}

export type TipoHistorial = 'carta_enviada' | 'respuesta' | 'llamada' | 'reunion' | 'interesado' | 'no_interesado' | 'recontactar' | 'optout' | 'nota' | 'alerta_llamada' | 'secuencia';
export const NOMBRE_HISTORIAL: Record<TipoHistorial, string> = {
  carta_enviada: 'Envío',
  respuesta: 'Respuesta recibida',
  llamada: 'Llamada hecha',
  reunion: 'Reunión prevista',
  interesado: 'Interesado',
  no_interesado: 'No interesado',
  recontactar: 'Volver a contactar',
  optout: 'Pidió no recibir más comunicaciones',
  nota: 'Nota',
  alerta_llamada: 'Alerta de llamada',
  secuencia: 'Secuencia',
};

export interface EntradaHistorial {
  id: string;
  entidad: string;
  oportunidad: string | null;
  secuencia: string | null;
  tipo: TipoHistorial;
  texto: string;
  fecha: string;
  vence: string | null;
  hecho: boolean;
}

export interface Encaje {
  espectaculo: Espectaculo;
  puntos: number;
  motivos: string[];
  avisos: string[];
}

export interface EspectaculoBreve {
  id: string;
  nombre: string;
  viabilidad?: 'viable' | 'ajustada' | 'pendiente';
  motivo?: string;
}

export interface FichaEntidad {
  entidad: Entidad | null;
  oportunidades: Oportunidad[];
  secuencias: Secuencia[];
  historial: EntradaHistorial[];
  encaje: { amplio: boolean; propuestas: Encaje[] };
  ayudas: { convocatoria: Convocatoria; certeza: Certeza; motivo: string; espectaculos: EspectaculoBreve[] }[];
  licitaciones: { contrato: Contrato; espectaculos: EspectaculoBreve[] }[];
}

export interface TextoLinea {
  titulo: string;
  intro: string;
  texto: string;
}
export type LineaCarta = 'lirica' | 'camara' | 'popular' | 'navidad';
export interface TextosIdioma {
  saludo: string;
  saludoPersona: string;
  introVarias: string;
  historial: string;
  lineas: Record<LineaCarta, TextoLinea>;
  licitacion: string;
  ayudas: string;
  gestion: string;
  colaboracion: string;
  despedida: string;
  seguimientos: [string, string, string, string];
  asunto: string;
}
export interface PlantillasCarta {
  es: TextosIdioma;
  ca: TextosIdioma;
}

export interface AjustesCrm {
  remitente: string;
  organizacion: string;
  email: string;
  telefono: string;
  web: string;
  firma: string;
  cargo?: string;
  diasEntreEnvios: number;
  plantillas: PlantillasCarta;
}

export type MensajeBandeja = Mensaje & { entidad: Entidad; oportunidad: Oportunidad; destinatario: string };
export type Pendiente = EntradaHistorial & { entidadDatos: Entidad };

export interface AlertaCrm {
  entidad: { id: string; nombre: string; ref: string | null };
  oportunidades: { id: string; titulo: string }[];
  tipo: 'convocatoria' | 'licitacion';
  ref: string;
  titulo: string;
  fecha: string | null;
  espectaculos: { id: string; nombre: string }[];
}

export interface PropuestaPreparada {
  id: string;
  ref: string;
  nombre: string;
  municipio: string | null;
  provincia: string | null;
  ccaa: string | null;
  persona: string | null;
  cargo: string | null;
  destinatario: string;
  telefono: string | null;
  revisarEmail: string | null;
  idioma: 'es' | 'ca';
  motivos: string[];
  espectaculos: { id: string; nombre: string; tipo: TipoEspectaculo; motivos: string[]; avisos: string[] }[];
  ayudas: { id: string; titulo: string; fin: string | null }[];
  licitaciones: { id: string; titulo: string; fin: string | null }[];
  gestion: string[];
  asunto: string;
  cuerpo: string;
  puntos: number;
}

export interface Panel {
  propuestas: number;
  llamar: Pendiente[];
  alertas: AlertaCrm[];
  bandeja: { total: number; items: MensajeBandeja[] };
  respuestas: Pendiente[];
  ayudas: { convocatoria: Convocatoria; certeza: Certeza; espectaculos: EspectaculoBreve[] }[];
  licitaciones: { contrato: Contrato; espectaculos: EspectaculoBreve[] }[];
  catalogo: number;
}

export class ErrorCrm extends Error {
  constructor(
    message: string,
    readonly estado: number,
    readonly detalle?: { conflicto?: boolean; secuencias?: Secuencia[] },
  ) {
    super(message);
  }
}

async function pedir<T>(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  const r = await fetch(`/api/crm${ruta}`, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new ErrorCrm(j?.error ?? `Error ${r.status}`, r.status, j?.detalle);
  return j as T;
}

export const crm = {
  panel: () => pedir<Panel>('/panel'),
  ajustes: () => pedir<{ ajustes: AjustesCrm; envioConectado: boolean }>('/ajustes'),
  guardarAjustes: (a: AjustesCrm) => pedir('/ajustes', 'PUT', a),
  catalogo: () => pedir<{ items: Espectaculo[] }>('/catalogo'),
  guardarEspectaculo: (e: Omit<Espectaculo, 'id'>, id?: string) => pedir<{ id: string }>(id ? `/catalogo/${id}` : '/catalogo', id ? 'PUT' : 'POST', e),
  borrarEspectaculo: (id: string) => pedir(`/catalogo/${id}`, 'DELETE'),
  importarCatalogo: () => pedir<{ nuevos: number; actualizados: number; retirados: number; sinCambios: number }>('/catalogo/importar', 'POST', {}),
  entidades: () => pedir<{ items: Entidad[] }>('/entidades'),
  ficha: (id: string) => pedir<FichaEntidad>(`/entidades/${id}`),
  fichaRef: (ref: string) => pedir<FichaEntidad>(`/ref/${encodeURIComponent(ref)}`),
  crearEntidad: (datos: Partial<Entidad>) => pedir<Entidad>('/entidades', 'POST', datos),
  guardarEntidad: (id: string, datos: Partial<Entidad>) => pedir<Entidad>(`/entidades/${id}`, 'PUT', datos),
  anotar: (id: string, a: { tipo: TipoHistorial; texto?: string; oportunidad?: string | null; vence?: string | null }) => pedir(`/entidades/${id}/anotar`, 'POST', a),
  corregirEstado: (id: string, c: { estadoRelacion?: EstadoRelacion; noContactar?: boolean }) => pedir(`/entidades/${id}/estado`, 'POST', c),
  propuestas: () => pedir<{ items: PropuestaPreparada[] }>('/propuestas'),
  cargarPlantillasArsvia: () => pedir<{ textos: number; reescritas: number }>('/plantillas/arsvia', 'POST', {}),
  reescribirPropuestas: () => pedir<{ reescritas: number }>('/propuestas/reescribir', 'POST', {}),
  prepararPropuestas: (limite: number, ccaa: string) => pedir<{ nuevas: number }>('/propuestas/preparar', 'POST', { limite, ccaa }),
  guardarPropuesta: (id: string, c: { asunto: string; cuerpo: string; destinatario: string }) => pedir(`/propuestas/${id}`, 'PUT', c),
  descartarPropuesta: (id: string) => pedir(`/propuestas/${id}/descartar`, 'POST', {}),
  aceptarPropuesta: (id: string, c: { asunto: string; cuerpo: string; destinatario: string }) =>
    pedir<{ mensaje: Mensaje; entidad: Entidad }>(`/propuestas/${id}/aceptar`, 'POST', c),
  descartarAlerta: (entidad: string, ref: string) => pedir('/alertas/descartar', 'POST', { entidad, ref }),
  hecho: (id: string, hecho = true) => pedir(`/historial/${id}/hecho`, 'POST', { hecho }),
  crearOportunidad: (o: { entidad: string; tipo: TipoOportunidad; titulo: string; ref?: string | null; espectaculos: string[]; certeza?: Certeza; notas?: string }) =>
    pedir<Oportunidad>('/oportunidades', 'POST', o),
  actualizarOportunidad: (id: string, c: Partial<Pick<Oportunidad, 'certeza' | 'enlaceConfirmacion' | 'espectaculos' | 'estado' | 'notas'>>) => pedir<Oportunidad>(`/oportunidades/${id}`, 'PUT', c),
  abrirSecuencia: (oportunidad: string, destinatario: string, decision?: 'sustituir' | 'nueva') => pedir<{ secuencia: Secuencia; mensaje: Mensaje }>('/secuencias', 'POST', { oportunidad, destinatario, decision }),
  pausar: (id: string) => pedir(`/secuencias/${id}/pausar`, 'POST', {}),
  reanudar: (id: string) => pedir(`/secuencias/${id}/reanudar`, 'POST', {}),
  bandeja: () => pedir<{ items: MensajeBandeja[]; envioConectado: boolean }>('/bandeja'),
  editar: (id: string, asunto: string, cuerpo: string) => pedir(`/mensajes/${id}`, 'PUT', { asunto, cuerpo }),
  aprobar: (id: string, programarPara?: string) => pedir(`/mensajes/${id}/aprobar`, 'POST', { programarPara }),
  cancelar: (id: string) => pedir(`/mensajes/${id}/cancelar`, 'POST', {}),
  descartar: (id: string) => pedir(`/mensajes/${id}/descartar`, 'POST', {}),
  enviado: (id: string) => pedir(`/mensajes/${id}/enviado`, 'POST', {}),
  encajeConvocatoria: (id: string) => pedir<{ espectaculos: Encaje[] }>(`/encaje/convocatoria/${encodeURIComponent(id)}`),
  encajeContrato: (id: string) => pedir<{ espectaculos: (Encaje & { viabilidad: 'viable' | 'ajustada' | 'pendiente'; motivoViabilidad: string })[] }>(`/encaje/contrato/${encodeURIComponent(id)}`),
};

/** mailto con el correo ya redactado: se envía desde el programa de correo del usuario. */
export const enlaceCorreo = (para: string, asunto: string, cuerpo: string) => `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
