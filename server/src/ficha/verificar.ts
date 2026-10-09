// Comprobación de las citas: cada fragmento que devuelve el modelo tiene que estar, literalmente,
// en el documento. Lo que no se encuentra queda marcado «revisar» y la web lo avisa.
import type { Cita, CitaComprobada, ConEstado, FichaExtraida } from './esquema.js';

/** Texto de un documento por páginas (separadas por \f en lo que guarda pdftotext). */
export interface DocumentoTexto {
  id: number;
  nombre: string;
  paginas: string[];
}

/** Minúsculas, sin tildes ni signos, guiones de corte de línea unidos y espacios colapsados. */
export function normalizarCita(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/-\s*\n\s*/g, '')
    .replace(/[«»"“”'‘’`´]/g, '')
    .replace(/[^\p{L}\p{N}%€]+/gu, ' ')
    .trim();
}

/** Dígitos de una cifra, para buscarla en la cita ("6.000,00 €" y 6000 → "6000"). */
function digitosDe(n: number): string[] {
  const entero = Math.trunc(n);
  const variantes = [String(entero)];
  if (!Number.isInteger(n)) variantes.push(String(n).replace('.', ''));
  return variantes;
}

function cifraEnTexto(n: number, texto: string): boolean {
  // Quita separadores de miles y decimales a cero: "6.000,00" → "6000", "1.250.000" → "1250000".
  const limpio = texto.replace(/(\d)[.\s](?=\d{3}\b)/g, '$1').replace(/,00\b/g, '');
  const numeros = limpio.match(/\d+(?:,\d+)?/g) ?? [];
  return numeros.some((x) => digitosDe(n).includes(x.replace(',', '')));
}

/** Busca la cita en la página indicada y, si no está, en el resto del documento (corrige la página). */
export function comprobarCita(cita: Cita, documentos: DocumentoTexto[], cifra?: number | null): CitaComprobada {
  const doc = documentos.find((d) => d.id === cita.documento) ?? (documentos.length === 1 ? documentos[0] : undefined);
  if (!doc) return { ...cita, estado: 'revisar', motivo: 'Documento desconocido' };
  const buscada = normalizarCita(cita.texto);
  if (buscada.split(' ').length < 3) return { ...cita, documento: doc.id, estado: 'revisar', motivo: 'Cita demasiado corta' };

  const paginas = doc.paginas.map(normalizarCita);
  let pagina = paginas[cita.pagina - 1]?.includes(buscada) ? cita.pagina : 0;
  // Una cita puede cruzar el salto de página.
  if (!pagina) pagina = paginas.findIndex((p, i) => p.includes(buscada) || `${p} ${paginas[i + 1] ?? ''}`.includes(buscada)) + 1;
  if (!pagina) return { ...cita, documento: doc.id, estado: 'revisar', motivo: 'No aparece en el documento' };

  const comprobada: CitaComprobada = { ...cita, documento: doc.id, pagina, estado: 'verificada' };
  if (cifra != null && !cifraEnTexto(cifra, cita.texto)) {
    return { ...comprobada, estado: 'revisar', motivo: 'La cifra no aparece en la cita' };
  }
  return comprobada;
}

const esCita = (x: unknown): x is Cita =>
  typeof x === 'object' && x !== null && 'documento' in x && 'pagina' in x && 'texto' in x;

/**
 * Comprueba todas las citas de la ficha. Un dato con valor pero sin cita también se marca: no se acepta
 * nada que no tenga respaldo en el documento.
 */
export function comprobarFicha(
  datos: FichaExtraida,
  documentos: DocumentoTexto[],
): { datos: ConEstado<FichaExtraida>; citas: { verificadas: number; revisar: number; noConsta: number } } {
  const recuento = { verificadas: 0, revisar: 0, noConsta: 0 };

  const visitar = (nodo: unknown): unknown => {
    if (Array.isArray(nodo)) return nodo.map(visitar);
    if (typeof nodo !== 'object' || nodo === null) return nodo;
    const objeto = nodo as Record<string, unknown>;
    if ('cita' in objeto) {
      const valor = 'valor' in objeto ? objeto.valor : ('texto' in objeto ? objeto.texto : objeto.criterio);
      const cifra = typeof objeto.valor === 'number' ? objeto.valor : typeof objeto.puntosMaximos === 'number' ? objeto.puntosMaximos : null;
      if (valor === null || valor === undefined) {
        recuento.noConsta++;
        return { ...objeto, cita: null };
      }
      if (!esCita(objeto.cita)) {
        recuento.revisar++;
        return { ...objeto, cita: null, sinCita: true };
      }
      const comprobada = comprobarCita(objeto.cita, documentos, cifra);
      recuento[comprobada.estado === 'verificada' ? 'verificadas' : 'revisar']++;
      return { ...objeto, cita: comprobada };
    }
    return Object.fromEntries(Object.entries(objeto).map(([k, v]) => [k, visitar(v)]));
  };

  return { datos: visitar(datos) as ConEstado<FichaExtraida>, citas: recuento };
}
