// Preparación del texto de las bases para leerlo y construcción de la ficha a partir de lo que se extrae.
// La lectura la hace Claude en la sesión de trabajo (sin API de pago): aquí solo se valida la estructura
// y se comprueba cada cita contra el documento.
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { esquemaFicha, VERSION_FICHA, type Ficha } from './esquema.js';
import { comprobarFicha, type DocumentoTexto } from './verificar.js';

/** Quién extrae las fichas (se guarda en cada una). */
export const AUTOR_FICHAS = 'Claude (sesión de Claude Code)';
/** Por encima de esto no se prepara: mejor avisar que recortar las bases y perder datos. */
export const MAX_CARACTERES = 600_000;

export const INSTRUCCIONES = `Extraes datos de convocatorias de subvenciones públicas españolas para un promotor de conciertos de jazz, música clásica y ópera.

Cada fichero de texto tiene uno o varios documentos oficiales. Cada documento empieza con [[Documento N: nombre]] y cada página con [[Página N]].

Rellena la ficha con lo que dicen los documentos y nada más:
- Cada dato lleva una cita: un fragmento copiado literalmente del documento (de 5 a 40 palabras, sin corregir erratas ni cambiar mayúsculas), con el número de documento y de página donde aparece. La cita debe contener el dato; en las cifras, la cifra tal como está escrita.
- Si los documentos no dicen algo, deja el valor en null y la cita en null. No deduzcas, no completes con lo habitual en otras convocatorias y no calcules fechas que el texto no da (por ejemplo, «20 días hábiles desde la publicación» se queda como texto en presentacion y finPresentacion queda en null).
- Los valores de texto son breves y fieles al documento, en español.
- Si el documento no son las bases ni la convocatoria (una resolución de concesión, una corrección de errores...), marca documentoEsBases como false, rellena lo que haya y explícalo en avisos.
- El resumen solo repite datos de la ficha, en frases cortas para alguien que no ha leído las bases.
- No copies datos personales (nombres de quien firma, DNI, teléfonos o correos de personas) ni en valores ni en citas.`;

/** Texto con las marcas de documento y página que se usan para citar. */
export function textoParaModelo(documentos: DocumentoTexto[]): string {
  return documentos
    .map(
      (d) =>
        `[[Documento ${d.id}: ${d.nombre}]]\n` + d.paginas.map((p, i) => `[[Página ${i + 1}]]\n${p.trim()}`).join('\n\n'),
    )
    .join('\n\n');
}

/** Esquema JSON de la ficha, para las instrucciones de quien la rellena. */
export function esquemaJson(): unknown {
  return z.toJSONSchema(esquemaFicha);
}

export function huella(paginas: string[]): string {
  return createHash('sha256').update(paginas.join('\f')).digest('hex').slice(0, 16);
}

export class ErrorFicha extends Error {}

/** Valida lo extraído contra el esquema, comprueba las citas y compone la ficha que se guarda. */
export function construirFicha(
  codigoBdns: string,
  documentos: DocumentoTexto[],
  extraido: unknown,
  opciones: { autor?: string; ahora?: () => Date } = {},
): Ficha {
  const resultado = esquemaFicha.safeParse(extraido);
  if (!resultado.success) {
    const problemas = resultado.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new ErrorFicha(`La ficha no cumple el esquema (${problemas.join('; ')})`);
  }
  const { datos, citas } = comprobarFicha(resultado.data, documentos);
  return {
    version: VERSION_FICHA,
    codigoBdns,
    generada: (opciones.ahora?.() ?? new Date()).toISOString(),
    modelo: opciones.autor ?? AUTOR_FICHAS,
    documentos: documentos.map((d) => ({ id: d.id, nombre: d.nombre, paginas: d.paginas.length, huella: huella(d.paginas) })),
    datos,
    citas,
  };
}
