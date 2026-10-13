// Títulos legibles: sin la fórmula administrativa ("Resolución de ... por la que se convocan subvenciones para...")
// y sin mayúsculas continuas. El título oficial completo se sigue enseñando en la ficha.

const FORMULAS: RegExp[] = [
  // "Resolución de 25 de mayo de 2026, de la Dirección General de..., por la que se convocan ..."
  /^.{0,250}?\bpor (la|el) que se (convoca[n]?|aprueba[n]?|establece[n]?|regula[n]?)( la convocatoria( de| para)?| las bases reguladoras( y la convocatoria)?( de| para)?)?\s*/i,
  /^.{0,250}?\bque (convoca[n]?|aprueba[n]?)( las bases reguladoras)?( y)?( la convocatoria( de| para)?)?\s*/i,
  /^(extracto|anuncio|acuerdo|decreto|orden|resolucion|resolución)\b[^,:]{0,120}[,:]\s*/i,
  /^(bases reguladoras( específicas)?( y)?( de la)?( convocatoria( pública)?)?|bases( de la convocatoria)?|convocatoria( pública| anticipada)?)\s+(del(?= )|de|para|que rige)?\s*/i,
  /^(el |la )?(concesión|concesion|otorgamiento) de\s+/i,
  /^resoluci[oó]n\b.{0,120}?\b(por la que se abre la|de) (\d+ª )?convocatoria( anticipada)?( \d{4})? (para|de) (la concesi[oó]n de\s*)?/i,
  /^en r[ée]gimen de concurrencia (no )?competitiva,?\s*(de\s+)?/i,
  /^de \d{1,2} de \p{L}+( de \d{4})?,\s*(de |por (la|el) que\s*)?/iu,
  /^relativo a( la aprobación de)?( las bases y)?( la)?( convocatoria( de)?)?\s*/i,
];
const RELLENO = /,?\s*en r[ée]gimen de concurrencia (no )?competitiva,?|\s*\(?\s*(expte?\.?|expediente|bdns)[^)]*\)?$|\s*l\d{4}\.?\s*/gi;

/** "CONVOCATORIA DE SUBVENCIONES..." -> "Convocatoria de subvenciones..." si casi todo está en mayúsculas. */
function sinMayusculas(texto: string): string {
  const letras = texto.replace(/[^\p{L}]/gu, '');
  const mayusculas = letras.replace(/[^\p{Lu}]/gu, '');
  if (letras.length < 8 || mayusculas.length / letras.length < 0.7) return texto;
  const bajo = texto.toLocaleLowerCase('es');
  return bajo.charAt(0).toLocaleUpperCase('es') + bajo.slice(1);
}

export function tituloCorto(titulo: string): string {
  let t = titulo.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) {
    const antes = t;
    for (const re of FORMULAS) {
      const recortado = t.replace(re, '');
      // Solo si queda algo con sentido.
      if (recortado.length >= 15) t = recortado;
    }
    if (t === antes) break;
  }
  t = t.replace(RELLENO, ' ').replace(/\s+/g, ' ').replace(/^[\s,.:;-]+|[\s,.;:-]+$/g, '');
  // Ordinales romanos antes del nombre del evento: "xiv concurso" -> "XIV concurso".
  t = sinMayusculas(t).replace(
    /\b([ivxlcdm]{1,7})(?= (concursos?|certamen|festival|edici[oó]n|premios?|ciclo|muestra|semana|jornadas|encuentro|programa|convocatoria)\b)/gi,
    (r) => r.toUpperCase(),
  );
  // "Para la promoción de la música" -> "Ayudas para la promoción de la música".
  if (/^(para|a) (la|el|los|las)\b/i.test(t)) t = `Ayudas ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  else if (/^(la|el|los|las) (?!subvenci|ayuda|convocatoria|bases)/i.test(t)) t = `Ayudas para ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  t = t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
  return t.length > 160 ? `${t.slice(0, 157).replace(/\s+\S*$/, '')}…` : t;
}
