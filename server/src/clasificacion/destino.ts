// ¿Le sirve al mánager de grupos? Una convocatoria le interesa solo si:
// - la pueden pedir sus grupos (giras, producción, grabación, internacionalización, creación...), o
// - da dinero a quien contrata conciertos (programación de ayuntamientos, festivales, ciclos, salas, circuitos).
// Todo lo demás se descarta con un motivo: asociaciones y fiestas locales, formación y becas, equipamiento,
// bandas y coros aficionados, temas sin relación... Se decide sobre todo por el título, que es lo que mejor
// dice qué financia; el texto largo de los extractos menciona de todo.

import type { Beneficiarios, Destino } from '../tipos.js';

type Regla = [motivo: string, regex: RegExp];

// Lo que nunca es para un mánager, aunque el título hable de música.
const DESCARTES: Regla[] = [
  [
    'Formación, becas o estudios',
    /\b(becas?|beques|beca|bekak?|estudi(os|s|ar)|alumn(o|a|os|as|ado)|matricul|escuelas?|escola|conservatorios?|curso (academico|escolar)|\d{4}\/\d{2,4}\b.*curs|formacion|formacio|ensenan|educacion|educativ|expediente academico|practicas|iniciacion|talleres?|tallers?|aprendizaje|educandos)/,
  ],
  [
    'Fiestas locales, peñas o celebraciones',
    /\b(fiestas?|festes|jaiak?|festejos|penas|semana santa|carnaval|cabalgata|reyes magos|moros y cristianos|tamborrada|hogueras|fallas|fiesta mayor|festa major|romeria|navidad|nadal|san juan|patronales)\b/,
  ],
  [
    'Asociaciones, entidades o barrios del municipio',
    /\b(asociaciones|associacions|asociacion|entidades (culturales|ciudadanas|sin animo)|entitats|colectivos|barrios|vecinales|vecinos|federaciones|peñas|grupos, asociaciones|agentes culturales de)\b/,
  ],
  ['Funcionamiento, sedes o equipamiento', /\b(funcionamiento|sedes?|local social|mantenimiento|equipamiento|equipament|instrumentos?|adquisicion|inversion(es)?|obras|rehabilitacion|alquiler|infraestructura)\b/],
  [
    'Bandas, coros o música aficionada',
    /\b(bandas? de musica|bandas?\b|sociedades musicales|societats musicals|agrupaciones musicales|coral(es)?\b|coros?\b|orfeon|charangas?|txarangas?|dolcain|musica festera|marchas? moras?|cornetas|tambores|gaitas|txistu|rondallas?|cobla|sardan)/,
  ],
  [
    'No es de música en vivo profesional',
    /\b(igualdad|violencias?|machista|feminis|lgtb|euskera|normalizacion linguistica|bilingu|juventud|juvenil|jovenes|infantil|mayores|deport|bibliotecas?|lectura|libros?|cine|cinematograf|peliculas|audiovisual|universidad|estudiantado|grado en|grado de|neurocien|medicina|fotograf|pintura|literari|poesia|teatro amateur|ampas?|padres|escolar|comercio|turismo|gastronom|patrimonio|museos?|exposicion|arte urbano|graffiti|carteles?|disfraces|belen)/,
  ],
];

// Concursos y premios: solo si son para intérpretes de jazz, clásica o lírica (no maquetas, bandas o música festera).
const CONCURSO = /\b(concursos?|certamen|certamenes|premios?|premis|sari(a|ak))\b/;
const CONCURSO_PROFESIONAL = /\b(jazz|piano|violin|violonchelo|guitarra clasica|canto|lirica|opera|composicion|interpretacion|musica de camara|orquesta|direccion)\b/;

// Dinero para quien contrata: programación, festivales, ciclos, salas, circuitos.
const PROGRAMADORES =
  /\b(programacion|programacio|programar|programen|circuitos?|circuit|red de (teatros|auditorios|espacios)|xarxa|platea|programa\.cat|catalogo de espectaculos|contratacion de espectaculos|espectaculos profesionales|cache|caches|festival(es)?|festivals|jaialdi|ciclos? de (musica|conciertos|jazz)|temporadas? (de|musical|lirica)|salas? de (musica|conciertos)|salas de musica en (vivo|directo)|musica en (vivo|directo)|locales de musica|eventos musicales|espacios escenicos|artes escenicas y (de la )?musica|actuaciones musicales)\b/;
const PARA_AYUNTAMIENTOS = /\b(ayuntamientos?|entidades locales|municipios|corporaciones locales|ajuntaments)\b/;
// Giras, grabación o producción mandan sobre "festivales" ("ayudas para giras y asistencia a festivales").
const GRUPOS_FUERTE = /\b(giras?|circulacion|grabacion|grabaciones|discografic|internacionalizacion|produccion de (espectaculos|conciertos|musica|artes escenicas))\b/;
const PROGRAMADORES_LOCALES = /\b(artes escenicas|musica|espectaculos|actividades culturales|programa cultural|cultura)\b/;

// Lo que pueden pedir los grupos (siempre que la convocatoria sea de música).
const GRUPOS =
  /\b(giras?|gira|circulacion|movilidad|internacionalizacion|internacional|exterior|produccion|grabacion|grabaciones|discografic|fonograma|edicion|creacion|composicion|estrenos?|residencias?|promocion (de la musica|musical|de artistas)|industrias? (musical|musicales|culturales|creativas)|empresas? (musicales|culturales|del sector)|sector musical|profesionales (de la musica|del sector)|artistas|grupos musicales|solistas|compan(ia|ias)|formaciones musicales|proyectos musicales|ayudas a la musica|musica y (la )?lirica|actividad musical profesional)\b/;

export interface EntradaDestino {
  /** Título y título en lengua cooficial, normalizados. */
  titulo: string;
  musical: boolean;
  estilosEnTitulo: boolean;
  beneficiarios: Beneficiarios;
}

export function destinoParaManager({ titulo, musical, estilosEnTitulo, beneficiarios: b }: EntradaDestino): {
  destino: Destino | null;
  descarte: string | null;
} {
  // Programación para entidades locales: el ayuntamiento cobra y contrata.
  const paraAyuntamientos = b.entidadesLocales || PARA_AYUNTAMIENTOS.test(titulo);
  const programadores = PROGRAMADORES.test(titulo) || (paraAyuntamientos && PROGRAMADORES_LOCALES.test(titulo));
  for (const [motivo, re] of DESCARTES) if (re.test(titulo)) return { destino: null, descarte: motivo };
  if (CONCURSO.test(titulo)) {
    return musical && (estilosEnTitulo || CONCURSO_PROFESIONAL.test(titulo))
      ? { destino: 'grupos', descarte: null }
      : { destino: null, descarte: 'Concurso o premio que no es para intérpretes profesionales' };
  }
  if (musical && GRUPOS_FUERTE.test(titulo) && !paraAyuntamientos) return { destino: 'grupos', descarte: null };
  if (programadores) return { destino: 'programadores', descarte: null };
  if (musical && GRUPOS.test(titulo)) return { destino: 'grupos', descarte: null };
  // Ayuda de música que admite autónomos y empresas: la pueden pedir los grupos.
  if (musical && b.empresas === true) return { destino: 'grupos', descarte: null };
  return { destino: null, descarte: musical ? 'No financia giras, producción ni programación' : 'No es de música' };
}
