// En qué idioma se escribe a cada sitio y a qué zona pertenece.
// - Cataluña: catalán.
// - Illes Balears y Comunitat Valenciana: según quién gobierna el municipio. Con PP o Vox, castellano; con cualquier
//   otro partido (PSOE, Compromís, Més, Sumar, listas locales...), catalán. Sin el dato, castellano.
// - El resto de España: castellano.

const CATALUNA = /catalu/i;
const BILINGUES = /balear|valencian/i;
const PP_O_VOX = /^\s*(pp|p\.p\.|partido popular|partit popular|vox)\b/i;

export function idiomaDe(ccaa: string | null | undefined, partido?: string | null): 'es' | 'ca' {
  if (!ccaa) return 'es';
  if (CATALUNA.test(ccaa)) return 'ca';
  if (BILINGUES.test(ccaa) && partido?.trim()) return PP_O_VOX.test(partido) ? 'es' : 'ca';
  return 'es';
}

/**
 * Zona de las propuestas: '' (toda España), 'resto' (toda España menos Cataluña), 'cataluna' o el nombre de una
 * comunidad autónoma.
 */
export const ZONAS_ESPECIALES = { resto: 'Resto de España (sin Cataluña)', cataluna: 'Cataluña' } as const;

export function enZona(ccaa: string | null | undefined, zona: string | undefined): boolean {
  if (!zona) return true;
  if (zona === 'resto') return !CATALUNA.test(ccaa ?? '');
  if (zona === 'cataluna') return CATALUNA.test(ccaa ?? '');
  return ccaa === zona;
}
