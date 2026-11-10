import { normalizar } from '../clasificacion/musica.js';
import type { TipoEspectaculo } from '../crm/tipos.js';

/** Formación del concierto, más fina que «clásica»: no es lo mismo un cuarteto que un Réquiem. */
export type Formacion = 'opera' | 'religiosa' | 'sinfonica' | 'coral' | 'camara' | 'jazz' | 'banda';
export const FORMACIONES: Formacion[] = ['opera', 'religiosa', 'sinfonica', 'coral', 'camara', 'jazz', 'banda'];

const PATRONES: [Formacion, RegExp][] = [
  ['opera', /\b(opera|operas|operistic\w*|zarzuelas?|sarsuel\w*|lirica|lirico|gala lirica|bel canto)\b/],
  ['religiosa', /\b(pasion (segun|de)|passio (segons|de)|requiem|misas?|missas?|oratori\w*|cantatas?|stabat|magnificat|musica sacra|musica religiosa|sacra|concierto de organo|recital de organo|organista|orgue|semana santa|setmana santa)\b/],
  ['sinfonica', /\b(sinfonic\w*|simfonic\w*|filarmonic\w*|orquestas? joven|jove orquestra|orquesta de (castilla|euskadi|valencia|galicia|extremadura|navarra|asturias|murcia|cordoba|sevilla|malaga|granada|tenerife|gran canaria|baleares|la rioja|cadiz|cantabria))\b/],
  ['coral', /\b(coro|coros|cor|cors|coral|corals|orfeo|orfeon|escolania|abesbatz\w*|polifonic\w*|cantoria)\b/],
  ['camara', /\b(cuartetos?|quartets?|quartetos?|trios?|duos?|dueto|quintetos?|quintets?|sextet\w*|musica de camara|musica de cambra|cambra|camerata|recitals?|piano|pianista|violin\w*|violoncel\w*|violonchel\w*|chelo|cello|guitarra clasica|arpa|sonatas?|barroc\w*|musica antigua|musica antiga|clavecin)\b/],
  ['jazz', /\b(jazz|swing|dixie\w*|big band|blues|bossa nova|be ?bop)\b/],
  ['banda', /\b(bandas? de musica|banda municipal|bandas? simfonic\w*|bandas? sinfonic\w*|unio musical|union musical|agrupacio musical|agrupacion musical|societat musical|sociedad musical)\b/],
];

/** Formaciones que nombra el título (puede haber varias: «Coral i Orquestra»). */
export function formacionesDe(titulo: string): Formacion[] {
  // «Sagrat Cor» no es un coro, ni un «recital de poesía» un concierto de cámara.
  const t = normalizar(titulo).replace(/\b(sagrat cor|sagrado corazon|recitals? (de )?poe\w*|recitals? poetic\w*)\b/g, ' ');
  const fs = PATRONES.filter(([, re]) => re.test(t)).map(([f]) => f);
  // Una banda sinfónica es una banda, no una orquesta.
  return fs.includes('banda') ? fs.filter((f) => f !== 'sinfonica') : fs;
}

/** Qué formaciones del historial de un cliente cuentan para cada tipo de espectáculo del catálogo. */
export const FORMACIONES_DE_TIPO: Partial<Record<TipoEspectaculo, Formacion[]>> = {
  opera: ['opera'],
  religiosa: ['religiosa', 'coral'],
  sinfonico_coral: ['sinfonica', 'coral', 'religiosa'],
  sinfonica: ['sinfonica'],
  camara: ['camara'],
  jazz: ['jazz'],
};

export const NOMBRE_FORMACION: Record<Formacion, string> = {
  opera: 'ópera y zarzuela',
  religiosa: 'música sacra',
  sinfonica: 'sinfónico',
  coral: 'coral',
  camara: 'cámara y recital',
  jazz: 'jazz',
  banda: 'banda',
};
