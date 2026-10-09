// Extracción de la ficha con Claude a partir del texto de las bases. El modelo devuelve JSON con el
// esquema de esquema.ts (structured outputs) y cada cita se comprueba después contra el documento.
import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { esquemaFicha, VERSION_FICHA, type Ficha, type FichaExtraida } from './esquema.js';
import { comprobarFicha, type DocumentoTexto } from './verificar.js';

export const MODELO_FICHAS = 'claude-opus-5-5';
/** Precio por millón de tokens del modelo (entrada, salida), para medir el coste de cada ficha. */
const PRECIO_USD_MTOK = { entrada: 4, salida: 20 };
/** Por encima de esto no se envía: mejor avisar que recortar las bases y perder datos. */
export const MAX_CARACTERES = 600_000;

export type Esfuerzo = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const INSTRUCCIONES = `Extraes datos de convocatorias de subvenciones públicas españolas para un promotor de conciertos de jazz, música clásica y ópera.

Recibirás el texto de uno o varios documentos oficiales. Cada documento empieza con [[Documento N: nombre]] y cada página con [[Página N]].

Rellena la ficha con lo que dicen los documentos y nada más:
- Cada dato lleva una cita: un fragmento copiado literalmente del documento (de 5 a 40 palabras, sin corregir erratas ni cambiar mayúsculas), con el número de documento y de página donde aparece. La cita debe contener el dato; en las cifras, la cifra tal como está escrita.
- Si los documentos no dicen algo, deja el valor en null y la cita en null. No deduzcas, no completes con lo habitual en otras convocatorias y no calcules fechas que el texto no da (por ejemplo, «20 días hábiles desde la publicación» se queda como texto en presentacion y finPresentacion queda en null).
- Los valores de texto son breves y fieles al documento, en español.
- Si el documento no son las bases ni la convocatoria (una resolución de concesión, una corrección de errores...), marca documentoEsBases como false, rellena lo que haya y explícalo en avisos.
- El resumen solo repite datos de la ficha, en frases cortas para alguien que no ha leído las bases.`;

/** Texto con las marcas de documento y página que el modelo usa para citar. */
export function textoParaModelo(documentos: DocumentoTexto[]): string {
  return documentos
    .map(
      (d) =>
        `[[Documento ${d.id}: ${d.nombre}]]\n` + d.paginas.map((p, i) => `[[Página ${i + 1}]]\n${p.trim()}`).join('\n\n'),
    )
    .join('\n\n');
}

export function huella(paginas: string[]): string {
  return createHash('sha256').update(paginas.join('\f')).digest('hex').slice(0, 16);
}

/** Lo que devuelve una llamada al modelo; separado del SDK para poder probarlo sin red. */
export interface RespuestaModelo {
  datos: FichaExtraida | null;
  modelo: string;
  motivoFin: string | null;
  entrada: number;
  salida: number;
}

export type LlamadaModelo = (peticion: { instrucciones: string; texto: string; esfuerzo: Esfuerzo }) => Promise<RespuestaModelo>;

/** Llamada real a la API de Claude (necesita ANTHROPIC_API_KEY u otra credencial del SDK). */
export function llamadaClaude(cliente = new Anthropic()): LlamadaModelo {
  return async ({ instrucciones, texto, esfuerzo }) => {
    const stream = cliente.beta.messages.stream({
      model: MODELO_FICHAS,
      max_tokens: 64000,
      // Si el modelo rechaza la petición por sus filtros, la API la repite con el modelo recomendado.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: esfuerzo, format: betaZodOutputFormat(esquemaFicha) },
      system: instrucciones,
      messages: [{ role: 'user', content: texto }],
    });
    const mensaje = await stream.finalMessage();
    return {
      datos: mensaje.stop_reason === 'end_turn' ? (mensaje.parsed_output ?? null) : null,
      modelo: mensaje.model,
      motivoFin: mensaje.stop_reason,
      entrada: mensaje.usage.input_tokens + (mensaje.usage.cache_creation_input_tokens ?? 0) + (mensaje.usage.cache_read_input_tokens ?? 0),
      salida: mensaje.usage.output_tokens,
    };
  };
}

export class ErrorFicha extends Error {}

/** Extrae y comprueba la ficha de una convocatoria. */
export async function extraerFicha(
  codigoBdns: string,
  documentos: DocumentoTexto[],
  llamar: LlamadaModelo,
  opciones: { esfuerzo?: Esfuerzo; ahora?: () => Date } = {},
): Promise<Ficha> {
  const texto = textoParaModelo(documentos);
  if (texto.length > MAX_CARACTERES) {
    throw new ErrorFicha(`Documentos demasiado largos (${texto.length} caracteres); no se recortan`);
  }
  const r = await llamar({ instrucciones: INSTRUCCIONES, texto, esfuerzo: opciones.esfuerzo ?? 'medium' });
  if (!r.datos) throw new ErrorFicha(`Sin ficha (motivo de fin: ${r.motivoFin ?? 'desconocido'})`);

  const { datos, citas } = comprobarFicha(r.datos, documentos);
  return {
    version: VERSION_FICHA,
    codigoBdns,
    generada: (opciones.ahora?.() ?? new Date()).toISOString(),
    modelo: r.modelo,
    documentos: documentos.map((d) => ({ id: d.id, nombre: d.nombre, paginas: d.paginas.length, huella: huella(d.paginas) })),
    datos,
    citas,
    uso: {
      entrada: r.entrada,
      salida: r.salida,
      costeUsd: Number(((r.entrada * PRECIO_USD_MTOK.entrada + r.salida * PRECIO_USD_MTOK.salida) / 1e6).toFixed(4)),
    },
  };
}
