// Cartas y correos de la secuencia (cinco envíos escritos), generados con plantillas, sin IA. Tono personal, natural y
// concreto; nunca dan por cerrados precios, fechas ni financiación: las subvenciones se ofrecen como apoyo opcional y
// las condiciones se concretan en la conversación.

import type { AjustesCrm, Certeza, Entidad, Espectaculo, TipoEspectaculo, TipoOportunidad } from './tipos.js';

export interface DatosCarta {
  paso: number;
  entidad: Pick<Entidad, 'nombre' | 'persona' | 'municipio' | 'idioma' | 'tipo'>;
  oportunidad: { tipo: TipoOportunidad; titulo: string; certeza: Certeza };
  espectaculos: Pick<Espectaculo, 'nombre' | 'tipo' | 'enlace' | 'estadoInfo'>[];
  /** Convocatoria relacionada (si la oportunidad sale de una ayuda). */
  ayuda?: { titulo: string; enlace: string | null } | null;
  ajustes: AjustesCrm;
}

const NOMBRE_TIPO: Record<'es' | 'ca', Record<TipoEspectaculo, string>> = {
  es: {
    opera: 'ópera',
    sinfonico_coral: 'repertorio sinfónico-coral',
    sinfonica: 'repertorio sinfónico',
    fusion: 'música mediterránea y fusión lírica',
    religiosa: 'música religiosa',
    camara: 'música de cámara',
    jazz: 'jazz',
    rock: 'rock clásico',
    navidad: 'programación de Navidad',
    festivales: 'diseño y gestión de festivales',
    otro: 'otras propuestas',
  },
  ca: {
    opera: 'òpera',
    sinfonico_coral: 'repertori simfònico-coral',
    sinfonica: 'repertori simfònic',
    fusion: 'música mediterrània i fusió lírica',
    religiosa: 'música religiosa',
    camara: 'música de cambra',
    jazz: 'jazz',
    rock: 'rock clàssic',
    navidad: 'programació de Nadal',
    festivales: 'disseny i gestió de festivals',
    otro: 'altres propostes',
  },
};

function lista(xs: string[], y: string): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} ${y} ${xs.at(-1)}`;
}

/** «Ayuntamiento de Lugo» → «el Ayuntamiento de Lugo»; para el saludo, la persona si se conoce. */
function saludo(e: DatosCarta['entidad'], idioma: 'es' | 'ca'): string {
  if (e.persona) return idioma === 'ca' ? `Benvolgut/da ${e.persona},` : `Estimado/a ${e.persona}:`;
  return idioma === 'ca' ? 'Bon dia,' : 'Buenos días:';
}

function propuestas(d: DatosCarta, idioma: 'es' | 'ca'): string {
  const xs = d.espectaculos.slice(0, 4);
  if (xs.length === 0) return '';
  return xs
    .map((x) => `- ${x.nombre} (${NOMBRE_TIPO[idioma][x.tipo]})${x.enlace ? `: ${x.enlace}` : ''}`)
    .join('\n');
}

/** Frase sobre la ayuda: opcional y prudente; solo afirma la concesión si está confirmada oficialmente. */
function fraseAyuda(d: DatosCarta, idioma: 'es' | 'ca'): string {
  if (!d.ayuda) return '';
  const t = d.ayuda.titulo;
  if (d.oportunidad.certeza === 'confirmada') {
    return idioma === 'ca'
      ? `Hem vist que consta la concessió de la convocatòria «${t}». Si us sembla oportú, podríem estudiar com encaixar-hi aquesta proposta.`
      : `Hemos visto que consta la concesión de la convocatoria «${t}». Si os parece oportuno, podríamos estudiar cómo encajar en ella esta propuesta.`;
  }
  return idioma === 'ca'
    ? `D'altra banda, hem detectat una convocatòria («${t}») que potser podria facilitar la programació d'aquesta proposta. Si ho considereu interessant, en podem estudiar conjuntament les possibilitats, sense cap compromís.`
    : `Por otra parte, hemos detectado una convocatoria («${t}») que quizá podría facilitar la programación de esta propuesta. Si lo consideráis interesante, podemos estudiar conjuntamente las posibilidades, sin ningún compromiso.`;
}

function firma(a: AjustesCrm, idioma: 'es' | 'ca'): string {
  if (a.firma.trim()) return a.firma.trim();
  const lineas = [a.remitente, a.organizacion, a.telefono, a.email, a.web].filter((x) => x.trim());
  return lineas.length ? lineas.join('\n') : idioma === 'ca' ? '[La teva signatura]' : '[Tu firma]';
}

export function generarCarta(d: DatosCarta): { asunto: string; cuerpo: string } {
  const idioma = d.entidad.idioma;
  const ca = idioma === 'ca';
  const org = d.ajustes.organizacion || (ca ? 'la nostra companyia' : 'nuestra compañía');
  const tipos = [...new Set(d.espectaculos.map((x) => NOMBRE_TIPO[idioma][x.tipo]))];
  const queOfrece = tipos.length ? lista(tipos, ca ? 'i' : 'y') : ca ? 'la nostra programació' : 'nuestra programación';
  const lugar = d.entidad.municipio ?? d.entidad.nombre;
  const pendiente = d.espectaculos.some((x) => x.estadoInfo === 'pendiente');
  const condiciones = ca
    ? `Les condicions, el format i les dates les podem concretar segons les vostres necessitats${pendiente ? ' (algunes dades encara les estem actualitzant)' : ''}.`
    : `Las condiciones, el formato y las fechas las podemos concretar según vuestras necesidades${pendiente ? ' (algunos datos los estamos actualizando todavía)' : ''}.`;
  const lineasPropuestas = propuestas(d, idioma);
  const ayuda = fraseAyuda(d, idioma);
  const s = saludo(d.entidad, idioma);
  const f = firma(d.ajustes, idioma);
  const contexto =
    d.oportunidad.tipo === 'licitacion'
      ? ca
        ? `Hem vist la licitació «${d.oportunidad.titulo}» i creiem que algunes de les nostres propostes hi podrien encaixar.`
        : `Hemos visto la licitación «${d.oportunidad.titulo}» y creemos que algunas de nuestras propuestas podrían encajar en ella.`
      : d.oportunidad.tipo === 'gestion_festival'
        ? ca
          ? `A més de programació, dissenyem, produïm i gestionem festivals i cicles complets, com ja fem en altres municipis.`
          : `Además de programación, diseñamos, producimos y gestionamos festivales y ciclos completos, como ya hacemos en otros municipios.`
        : ca
          ? `M'adreço a vosaltres perquè crec que la programació cultural de ${lugar} podria tenir interès en ${queOfrece}.`
          : `Me dirijo a vosotros porque creo que la programación cultural de ${lugar} podría tener interés en ${queOfrece}.`;

  const parrafos: Record<number, { asunto: string; texto: string[] }> = ca
    ? {
        1: {
          asunto: `Proposta de ${queOfrece} per a ${lugar}`,
          texto: [
            `Em presento: sóc ${d.ajustes.remitente || '[nom]'}, de ${org}. ${contexto}`,
            lineasPropuestas ? `Us comparteixo algunes propostes que crec que hi podrien encaixar:\n\n${lineasPropuestas}` : '',
            condiciones,
            ayuda,
            `Si us ve de gust, us puc enviar el dossier complet o en parlem per telèfon quan us vagi bé.`,
          ],
        },
        2: {
          asunto: `Re: Proposta de ${queOfrece} per a ${lugar}`,
          texto: [
            `Fa uns dies us vaig escriure per presentar-vos ${queOfrece} per a ${lugar}. Us torno a escriure per si el missatge s'havia quedat entre d'altres.`,
            `Si m'indiqueu qui porta la programació, li puc fer arribar el dossier directament.`,
          ],
        },
        3: {
          asunto: `${org}: propostes per a la vostra programació`,
          texto: [
            `Us escric de nou per si us és útil tenir a mà les nostres propostes per a properes programacions.`,
            lineasPropuestas ? lineasPropuestas : '',
            `Ens adaptem a espais i pressupostos molt diferents; si teniu alguna data o cicle en ment, ho podem mirar.`,
          ],
        },
        4: {
          asunto: `Re: ${org}: propostes per a la vostra programació`,
          texto: [`No vull insistir més del compte: només volia saber si la proposta us pot interessar ara o més endavant, per tenir-ho en compte.`],
        },
        5: {
          asunto: `Darrer missatge sobre la nostra proposta`,
          texto: [
            `Aquest és l'últim missatge que us envio sobre aquesta proposta. Si en algun moment hi teniu interès, estaré encantat de parlar-ne.`,
            `Moltes gràcies pel vostre temps.`,
          ],
        },
      }
    : {
        1: {
          asunto: `Propuesta de ${queOfrece} para ${lugar}`,
          texto: [
            `Me presento: soy ${d.ajustes.remitente || '[nombre]'}, de ${org}. ${contexto}`,
            lineasPropuestas ? `Os comparto algunas propuestas que creo que podrían encajar:\n\n${lineasPropuestas}` : '',
            condiciones,
            ayuda,
            `Si os apetece, os puedo enviar el dosier completo o lo hablamos por teléfono cuando os vaya bien.`,
          ],
        },
        2: {
          asunto: `Re: Propuesta de ${queOfrece} para ${lugar}`,
          texto: [
            `Hace unos días os escribí para presentaros ${queOfrece} para ${lugar}. Vuelvo a escribiros por si el mensaje se había quedado entre otros.`,
            `Si me indicáis quién lleva la programación, le puedo hacer llegar el dosier directamente.`,
          ],
        },
        3: {
          asunto: `${org}: propuestas para vuestra programación`,
          texto: [
            `Os escribo de nuevo por si os resulta útil tener a mano nuestras propuestas para próximas programaciones.`,
            lineasPropuestas ? lineasPropuestas : '',
            `Nos adaptamos a espacios y presupuestos muy distintos; si tenéis alguna fecha o ciclo en mente, lo miramos.`,
          ],
        },
        4: {
          asunto: `Re: ${org}: propuestas para vuestra programación`,
          texto: [`No quiero insistir más de la cuenta: solo quería saber si la propuesta os puede interesar ahora o más adelante, para tenerlo en cuenta.`],
        },
        5: {
          asunto: `Último mensaje sobre nuestra propuesta`,
          texto: [
            `Este es el último mensaje que os envío sobre esta propuesta. Si en algún momento os interesa, estaré encantado de hablarlo.`,
            `Muchas gracias por vuestro tiempo.`,
          ],
        },
      };
  const p = parrafos[d.paso] ?? parrafos[1]!;
  const despedida = ca ? 'Una salutació cordial,' : 'Un saludo cordial,';
  return { asunto: p.asunto, cuerpo: [s, ...p.texto.filter(Boolean), `${despedida}\n${f}`].join('\n\n') };
}
