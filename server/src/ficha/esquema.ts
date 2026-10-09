// Esquema de la ficha que se extrae de las bases (bloques 1 a 8 de la ficha de convocatoria, ver docs/plan.md).
// Cada dato lleva su cita literal y la página: si las bases no lo dicen, el valor es null («no consta»).
import { z } from 'zod';

const cita = z
  .object({
    documento: z.number().int().describe('Identificador del documento del que sale la cita (el de la cabecera [[Documento N]]).'),
    pagina: z.number().int().describe('Página de la marca [[Página N]] en la que está la cita.'),
    texto: z.string().describe('Fragmento copiado literalmente del documento, de 5 a 40 palabras, sin cambiar nada.'),
  })
  .nullable();

const datoTexto = z.object({
  valor: z.string().nullable().describe('null si el documento no lo dice.'),
  cita,
});
const datoNumero = z.object({
  valor: z.number().nullable().describe('Cifra tal cual (euros o %). null si el documento no la da.'),
  cita,
});
const datoFecha = z.object({
  valor: z.string().nullable().describe('aaaa-mm-dd solo si el documento da la fecha exacta; si no, null.'),
  cita,
});
const elemento = z.object({ texto: z.string(), cita });

export const esquemaFicha = z.object({
  documentoEsBases: z
    .boolean()
    .describe('true si el texto contiene las bases o la convocatoria; false si es otra cosa (resolución de concesión, corrección...).'),
  resumen: z
    .array(z.string())
    .describe('Hasta 5 frases cortas: qué financia, para quién, cuánto y hasta cuándo. Solo con datos de la ficha.'),
  objeto: datoTexto.describe('Qué actividades financia.'),
  beneficiarios: datoTexto.describe('Quién puede pedirla (personas físicas, empresas, asociaciones, ayuntamientos...).'),
  plazos: z.object({
    presentacion: datoTexto.describe('Plazo de presentación tal como lo describe el documento.'),
    inicioPresentacion: datoFecha,
    finPresentacion: datoFecha,
    resolucion: datoTexto.describe('Plazo máximo para resolver y notificar.'),
    ejecucion: datoTexto.describe('Periodo en que deben realizarse las actividades.'),
    justificacion: datoTexto.describe('Plazo y forma de justificar.'),
  }),
  dinero: z.object({
    presupuestoTotal: datoNumero.describe('Crédito total de la convocatoria, en euros.'),
    importeMaximo: datoNumero.describe('Importe máximo por solicitud o beneficiario, en euros.'),
    porcentajeMaximo: datoNumero.describe('Porcentaje máximo del presupuesto de la actividad que se financia.'),
    pago: datoTexto.describe('Cuándo y cómo se paga: anticipo, tras justificar, pagos parciales...'),
    compatibilidad: datoTexto.describe('Compatibilidad con otras ayudas.'),
    minimis: datoTexto.describe('Si está sujeta al régimen de minimis.'),
  }),
  requisitos: z.array(elemento).describe('Requisitos de los beneficiarios y de las actividades.'),
  gastosSubvencionables: z.array(elemento),
  gastosNoSubvencionables: z.array(elemento),
  criterios: z
    .array(z.object({ criterio: z.string(), puntosMaximos: z.number().nullable(), cita }))
    .describe('Criterios de valoración con sus puntos máximos.'),
  documentacion: z.array(elemento).describe('Documentos que hay que presentar con la solicitud.'),
  presentacion: z.object({
    lugar: datoTexto.describe('Dónde se presenta: sede electrónica, registro...'),
    url: datoTexto.describe('Dirección web de la sede o del trámite, si aparece.'),
    certificadoDigital: datoTexto.describe('Si exige presentación electrónica o certificado digital.'),
  }),
  avisos: z.array(z.string()).describe('Cualquier cosa que el promotor deba saber y no encaje arriba, o problemas del documento.'),
});

export type FichaExtraida = z.infer<typeof esquemaFicha>;
export type Cita = NonNullable<z.infer<typeof cita>>;

/** Resultado de comprobar una cita contra el texto del documento. */
export type EstadoCita = 'verificada' | 'revisar';

export interface CitaComprobada extends Cita {
  estado: EstadoCita;
  /** Motivo cuando hay que revisarla. */
  motivo?: string;
}

/** La misma estructura con cada cita ya comprobada. */
export type ConEstado<T> = T extends Cita
  ? CitaComprobada
  : T extends (infer U)[]
    ? ConEstado<U>[]
    : T extends object
      ? { [K in keyof T]: ConEstado<T[K]> }
      : T;

/** La ficha tal como se guarda: las citas comprobadas y los datos de la extracción. */
export interface Ficha {
  version: number;
  codigoBdns: string;
  generada: string;
  modelo: string;
  /** Documentos usados, con un resumen del texto para saber si hay que regenerar la ficha. */
  documentos: { id: number; nombre: string; paginas: number; huella: string }[];
  datos: ConEstado<FichaExtraida>;
  /** Recuento de citas por estado. */
  citas: { verificadas: number; revisar: number; noConsta: number };
  uso: { entrada: number; salida: number; costeUsd: number };
}

/** Sube cuando cambian el esquema o las instrucciones: obliga a regenerar las fichas. */
export const VERSION_FICHA = 1;
