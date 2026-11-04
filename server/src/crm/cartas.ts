// Composición de las cartas por bloques, con las plantillas de cada cuenta (editables en el catálogo):
// saludo, presentación de la línea principal, lo que el sitio ha programado (dato público), una sección por cada línea
// de programación que encaja (lírica y sinfónico-coral, cámara, jazz/rock/festivo) con el texto de cada propuesta,
// la licitación abierta, las ayudas como apoyo opcional, la propuesta de colaboración y la firma.
// El preajuste «ArsVia» reproduce las cartas modelo de Joan Romaní (ver docs/plan.md).

import type { AjustesCrm, Espectaculo, TipoEspectaculo } from './tipos.js';
import type { Estilo } from '../tipos.js';

export type Linea = 'lirica' | 'camara' | 'popular' | 'navidad';
export const LINEA_DE_TIPO: Record<TipoEspectaculo, Linea> = {
  opera: 'lirica',
  sinfonico_coral: 'lirica',
  religiosa: 'lirica',
  sinfonica: 'lirica',
  camara: 'camara',
  fusion: 'camara',
  jazz: 'popular',
  rock: 'popular',
  navidad: 'navidad',
  festivales: 'popular',
  otro: 'popular',
};

export interface TextoLinea {
  /** Título de la sección («Avance de programación · 2027-2029»). */
  titulo: string;
  /** Presentación cuando es la línea principal del correo. */
  intro: string;
  /** Párrafo que acompaña a la sección (puede ir vacío). */
  texto: string;
}

export interface TextosIdioma {
  saludo: string;
  /** Con la persona de contacto conocida; {persona} se sustituye. */
  saludoPersona: string;
  /** Presentación cuando el correo junta varias líneas. */
  introVarias: string;
  /** Lo que el sitio ha programado; {lugar} y {estilos}. */
  historial: string;
  lineas: Record<Linea, TextoLinea>;
  /** {titulo} y {fecha} (puede ir vacía). */
  licitacion: string;
  /** {convocatorias}. */
  ayudas: string;
  gestion: string;
  colaboracion: string;
  despedida: string;
  /** Seguimientos 2.º a 5.º; {lugar}. */
  seguimientos: [string, string, string, string];
  /** Asunto; {propuestas} y {lugar}. */
  asunto: string;
}

export interface PlantillasCarta {
  es: TextosIdioma;
  ca: TextosIdioma;
}

/** Textos neutros para cualquier cuenta (se pueden cambiar en el catálogo). */
export const PLANTILLAS_GENERICAS: PlantillasCarta = {
  es: {
    saludo: 'Buenos días,',
    saludoPersona: 'Estimado/a {persona}:',
    introVarias: 'Le escribo en representación de {organizacion} para presentarle algunas propuestas que creemos que pueden encajar en la programación de {lugar}.',
    historial: 'Hemos visto que en {lugar} han programado {estilos} en los últimos años, por lo que creemos que estas propuestas pueden resultarle de interés.',
    lineas: {
      lirica: { titulo: 'Ópera y repertorio sinfónico-coral', intro: 'Le escribo en representación de {organizacion} para presentarle nuestras propuestas líricas y sinfónico-corales.', texto: '' },
      camara: { titulo: 'Música de cámara', intro: 'Le escribo en representación de {organizacion} para presentarle nuestra línea de música de cámara.', texto: '' },
      popular: { titulo: 'Jazz, rock y propuestas para festivales', intro: 'Le escribo en representación de {organizacion} para presentarle nuestras propuestas para festivales y programación cultural.', texto: '' },
      navidad: { titulo: 'Navidad y Año Nuevo', intro: 'Le escribo en representación de {organizacion} para presentarle nuestras propuestas para Navidad y Año Nuevo.', texto: '' },
    },
    licitacion: 'También hemos visto que tienen abierta la licitación «{titulo}»{fecha}; si encaja con nuestras propuestas, podemos presentar oferta.',
    ayudas: 'Además, hemos detectado {convocatorias} que quizá podría facilitar la programación de estas propuestas. Si lo considera interesante, podemos estudiar conjuntamente esa posibilidad, sin ningún compromiso.',
    gestion: 'Además de conciertos, diseñamos, producimos y gestionamos festivales y ciclos completos, por si en algún momento les resulta de interés.',
    colaboracion:
      'Podemos facilitarle los dosieres artísticos y las fichas técnicas, y estudiar conjuntamente las fórmulas de colaboración que mejor se ajusten a su programación. Con este propósito, me gustaría proponerle una breve entrevista, presencial o por videoconferencia, durante los próximos días o semanas.',
    despedida: 'Quedo a su disposición para ampliar cualquier información.\n\nAtentamente,',
    seguimientos: [
      'Le escribí hace unos días para presentarle algunas propuestas para la programación de {lugar}. Le escribo de nuevo por si el mensaje se hubiera quedado entre otros. Si me indica quién lleva la programación, le haré llegar los dosieres directamente.',
      'Me permito escribirle de nuevo por si le resulta útil tener a mano nuestras propuestas para sus próximas programaciones. Nos adaptamos a espacios y modelos de programación muy distintos; si tienen alguna fecha o ciclo en mente, lo estudiamos.',
      'No quisiera insistir más de la cuenta: solo quería saber si alguna de las propuestas puede interesarles ahora o más adelante, para tenerlo en cuenta en nuestra planificación.',
      'Este es el último mensaje que le envío sobre estas propuestas. Si en algún momento son de su interés, estaré encantado de hablarlo. Muchas gracias por su tiempo.',
    ],
    asunto: 'Propuestas de {propuestas} para {lugar}',
  },
  ca: {
    saludo: 'Bon dia,',
    saludoPersona: 'Benvolgut/da {persona},',
    introVarias: 'Li escric en representació de {organizacion} per presentar-li algunes propostes que creiem que poden encaixar en la programació de {lugar}.',
    historial: 'Hem vist que a {lugar} han programat {estilos} en els darrers anys, per això creiem que aquestes propostes li poden interessar.',
    lineas: {
      lirica: { titulo: 'Òpera i repertori simfònico-coral', intro: 'Li escric en representació de {organizacion} per presentar-li les nostres propostes líriques i simfònico-corals.', texto: '' },
      camara: { titulo: 'Música de cambra', intro: 'Li escric en representació de {organizacion} per presentar-li la nostra línia de música de cambra.', texto: '' },
      popular: { titulo: 'Jazz, rock i propostes per a festivals', intro: 'Li escric en representació de {organizacion} per presentar-li les nostres propostes per a festivals i programació cultural.', texto: '' },
      navidad: { titulo: 'Nadal i Any Nou', intro: 'Li escric en representació de {organizacion} per presentar-li les nostres propostes per a Nadal i Any Nou.', texto: '' },
    },
    licitacion: 'També hem vist que tenen oberta la licitació «{titulo}»{fecha}; si encaixa amb les nostres propostes, hi podem presentar oferta.',
    ayudas: "A més, hem detectat {convocatorias} que potser podria facilitar la programació d'aquestes propostes. Si ho considera interessant, en podem estudiar conjuntament la possibilitat, sense cap compromís.",
    gestion: 'A més de concerts, dissenyem, produïm i gestionem festivals i cicles complets, per si en algun moment els pot interessar.',
    colaboracion:
      'Li podem facilitar els dossiers artístics i les fitxes tècniques, i estudiar conjuntament les fórmules de col·laboració que millor s’ajustin a la seva programació. Amb aquest propòsit, m’agradaria proposar-li una breu entrevista, presencial o per videoconferència, durant els propers dies o setmanes.',
    despedida: 'Resto a la seva disposició per ampliar qualsevol informació.\n\nAtentament,',
    seguimientos: [
      'Li vaig escriure fa uns dies per presentar-li algunes propostes per a la programació de {lugar}. Li torno a escriure per si el missatge s’hagués quedat entre d’altres. Si m’indica qui porta la programació, li faré arribar els dossiers directament.',
      'Em permeto tornar-li a escriure per si li és útil tenir a mà les nostres propostes per a les properes programacions. Ens adaptem a espais i models de programació molt diferents; si tenen alguna data o cicle en ment, ho estudiem.',
      'No voldria insistir més del compte: només volia saber si alguna de les propostes els pot interessar ara o més endavant, per tenir-ho en compte en la nostra planificació.',
      'Aquest és l’últim missatge que li envio sobre aquestes propostes. Si en algun moment són del seu interès, estaré encantat de parlar-ne. Moltes gràcies pel seu temps.',
    ],
    asunto: 'Propostes de {propuestas} per a {lugar}',
  },
};

// ---------- Preajuste ArsVia: las cartas modelo de Joan Romaní ----------

const ARSVIA_ES: TextosIdioma = {
  ...PLANTILLAS_GENERICAS.es,
  saludo: 'Buenos días,',
  saludoPersona: 'Buenos días, {persona}:',
  introVarias: 'Le escribo en representación de ArsVia – Music Projects para presentarle algunas de nuestras propuestas que creemos que pueden encajar en la programación de {lugar}.',
  historial: 'Hemos visto que en {lugar} han programado {estilos} en los últimos años, por lo que creemos que estas propuestas pueden resultarle de especial interés.',
  lineas: {
    lirica: {
      titulo: 'Avance de programación · 2027-2029',
      intro:
        'Me pongo en contacto con usted en representación de un equipo de producción y colaboración artística integrado por Òpera Popular de Barcelona, Orquestra Simfònica Segle XXI, Jeloudoli S.L. y ArsVia – Music Projects, para compartirle un avance de nuestras producciones líricas y sinfónico-corales previstas para las temporadas 2027-2028 y 2028-2029.',
      texto:
        'Nuestro trabajo reúne propuestas de gran formato y repertorio de amplio interés artístico, con producciones adaptables a distintos espacios y modelos de programación. Contemplamos opciones de contratación directa, coproducción y, cuando resulte pertinente, posibles vías de encaje en circuitos públicos de subvención y ayudas institucionales.',
    },
    camara: {
      titulo: 'Líneas destacadas de música de cámara',
      intro:
        'Le escribo en representación de ArsVia – Music Projects para presentarle nuestra línea de programación dedicada a la música de cámara, concebida especialmente para auditorios de aforo medio, teatros municipales y ciclos estables de programación.',
      texto:
        'En ArsVia apostamos por propuestas de cámara de alta calidad interpretativa que destacan por su versatilidad y cuidada elaboración artística. Diseñamos formatos flexibles que se adaptan con precisión a las características técnicas y acústicas de cada equipamiento, garantizando una experiencia íntima, cercana, pedagógica y de gran rigor musical para el público.\n\n• Ciclos monográficos: programas dedicados al universo de Brahms interpretados por formaciones estables de primer nivel.\n• Formatos versátiles de cuerda, viento y piano: desde la elegancia del cuarteto de cuerda hasta combinaciones singulares de trío o dúo (clarinete, violonchelo, piano...), ideales para ciclos de temporada o conciertos de proximidad.\n• Diálogos de cámara y música de autor: propuestas que exploran la confluencia entre la tradición clásica, la música contemporánea y el patrimonio musical, aportando un discurso dinámico, divulgativo y profundamente comunicativo. Desde Shostakóvich a la música mediterránea.',
    },
    popular: {
      titulo: 'Jazz, swing, grandes voces y rock clásico',
      intro:
        'Le escribo en representación de ArsVia – Music Projects para presentarle nuestro catálogo de propuestas musicales de carácter festivo y popular, concebidas para enriquecer la programación de festivales, ciclos culturales, fiestas mayores y eventos tanto al aire libre como en auditorio.',
      texto:
        'Nuestra oferta abarca desde el jazz tradicional de raíz y las grandes voces de la época dorada hasta la energía del rock clásico de los años 60 y 70, con formatos flexibles y solvencia técnica adaptada a cualquier equipamiento.',
    },
    navidad: {
      titulo: 'Navidad y Año Nuevo',
      intro: 'Le escribo en representación de ArsVia – Music Projects para presentarle nuestras propuestas para la programación de Navidad y Año Nuevo.',
      texto: '',
    },
  },
  licitacion: 'Hemos visto también que tienen abierta la licitación «{titulo}»{fecha}; si lo consideran oportuno, estaríamos encantados de presentar una propuesta.',
  ayudas: 'Asimismo, hemos detectado {convocatorias} que podría facilitar la programación de estas propuestas. Si lo considera interesante, podemos estudiar conjuntamente las posibles vías de financiación que se ajusten a cada proyecto.',
  gestion: 'Además de producciones y conciertos, diseñamos, producimos y gestionamos festivales y ciclos completos, como ya hacemos en Empuriabrava, Mollerussa o Terrassa.',
  colaboracion:
    'Nos gustaría conocer las líneas de programación de su entidad y valorar qué propuestas podrían resultar de mayor interés, atendiendo a sus características artísticas, técnicas y presupuestarias. Podemos facilitar los dossiers artísticos, las fichas técnicas y los requerimientos de montaje, así como estudiar conjuntamente las fórmulas de colaboración y las posibles vías de financiación que se ajusten a cada proyecto.\n\nCon este propósito, me gustaría proponerle una breve entrevista, presencial o por videoconferencia, durante los próximos días o semanas.',
  despedida: 'Quedo a su disposición para ampliar cualquier información y, si lo considera oportuno, concretar una fecha para este encuentro.\n\nAtentamente,',
  asunto: 'Propuestas de {propuestas} para {lugar} · ArsVia',
};

const ARSVIA_CA: TextosIdioma = {
  ...PLANTILLAS_GENERICAS.ca,
  saludo: 'Bon dia,',
  saludoPersona: 'Bon dia, {persona}:',
  introVarias: 'Li escric en representació d’ArsVia – Music Projects per presentar-li algunes de les nostres propostes que creiem que poden encaixar en la programació de {lugar}.',
  historial: 'Hem vist que a {lugar} han programat {estilos} en els darrers anys, per això creiem que aquestes propostes li poden ser d’especial interès.',
  lineas: {
    lirica: {
      titulo: 'Avançament de programació · 2027-2029',
      intro:
        'Em poso en contacte amb vostè en representació d’un equip de producció i col·laboració artística integrat per Òpera Popular de Barcelona, Orquestra Simfònica Segle XXI, Jeloudoli S.L. i ArsVia – Music Projects, per compartir-li un avançament de les nostres produccions líriques i simfònico-corals previstes per a les temporades 2027-2028 i 2028-2029.',
      texto:
        'El nostre treball reuneix propostes de gran format i repertori d’ampli interès artístic, amb produccions adaptables a diferents espais i models de programació. Contemplem opcions de contractació directa, coproducció i, quan sigui pertinent, possibles vies d’encaix en circuits públics de subvenció i ajuts institucionals.',
    },
    camara: {
      titulo: 'Línies destacades de música de cambra',
      intro:
        'Li escric en representació d’ArsVia – Music Projects per presentar-li la nostra línia de programació dedicada a la música de cambra, concebuda especialment per a auditoris d’aforament mitjà, teatres municipals i cicles estables de programació.',
      texto:
        'A ArsVia apostem per propostes de cambra d’alta qualitat interpretativa que destaquen per la seva versatilitat i acurada elaboració artística. Dissenyem formats flexibles que s’adapten amb precisió a les característiques tècniques i acústiques de cada equipament, garantint una experiència íntima, propera, pedagògica i de gran rigor musical per al públic.\n\n• Cicles monogràfics: programes dedicats a l’univers de Brahms interpretats per formacions estables de primer nivell.\n• Formats versàtils de corda, vent i piano: des de l’elegància del quartet de corda fins a combinacions singulars de trio o duo (clarinet, violoncel, piano...), ideals per a cicles de temporada o concerts de proximitat.\n• Diàlegs de cambra i música d’autor: propostes que exploren la confluència entre la tradició clàssica, la música contemporània i el patrimoni musical, amb un discurs dinàmic, divulgatiu i profundament comunicatiu. De Xostakóvitx a la música mediterrània.',
    },
    popular: {
      titulo: 'Jazz, swing, grans veus i rock clàssic',
      intro:
        'Li escric en representació d’ArsVia – Music Projects per presentar-li el nostre catàleg de propostes musicals de caràcter festiu i popular, concebudes per enriquir la programació de festivals, cicles culturals, festes majors i esdeveniments tant a l’aire lliure com en auditori.',
      texto:
        'La nostra oferta abasta des del jazz tradicional d’arrel i les grans veus de l’època daurada fins a l’energia del rock clàssic dels anys 60 i 70, amb formats flexibles i solvència tècnica adaptada a qualsevol equipament.',
    },
    navidad: {
      titulo: 'Nadal i Any Nou',
      intro: 'Li escric en representació d’ArsVia – Music Projects per presentar-li les nostres propostes per a la programació de Nadal i Any Nou.',
      texto: '',
    },
  },
  licitacion: 'També hem vist que tenen oberta la licitació «{titulo}»{fecha}; si ho consideren oportú, estaríem encantats de presentar-hi una proposta.',
  ayudas: 'Així mateix, hem detectat {convocatorias} que podria facilitar la programació d’aquestes propostes. Si ho considera interessant, podem estudiar conjuntament les possibles vies de finançament que s’ajustin a cada projecte.',
  gestion: 'A més de produccions i concerts, dissenyem, produïm i gestionem festivals i cicles complets, com ja fem a Empuriabrava, Mollerussa o Terrassa.',
  colaboracion:
    'Ens agradaria conèixer les línies de programació de la seva entitat i valorar quines propostes podrien ser de més interès, atenent les seves característiques artístiques, tècniques i pressupostàries. Podem facilitar els dossiers artístics, les fitxes tècniques i els requeriments de muntatge, així com estudiar conjuntament les fórmules de col·laboració i les possibles vies de finançament que s’ajustin a cada projecte.\n\nAmb aquest propòsit, m’agradaria proposar-li una breu entrevista, presencial o per videoconferència, durant els propers dies o setmanes.',
  despedida: 'Resto a la seva disposició per ampliar qualsevol informació i, si ho considera oportú, concretar una data per a aquesta trobada.\n\nAtentament,',
  asunto: 'Propostes de {propuestas} per a {lugar} · ArsVia',
};

export const PLANTILLAS_ARSVIA: PlantillasCarta = { es: ARSVIA_ES, ca: ARSVIA_CA };

export const FIRMA_ARSVIA =
  'Joan Romaní\nCoordinación de proyectos y giras\nÒpera Popular de Barcelona · Orquestra Simfònica Segle XXI · Jeloudoli S.L. · ArsVia – Music Projects\nTel. +34 613 11 23 83\njoanromani@arsvia.org | arsvia.org';

/** Textos de las cartas modelo para cada producción del catálogo (se asignan por nombre, solo si la ficha no tiene). */
export const TEXTOS_PRODUCCIONES_ARSVIA: { patron: RegExp; es: string; ca: string }[] = [
  {
    patron: /fidelio/i,
    es: 'Fidelio, de Beethoven. Producción operística con un lenguaje escénico contemporáneo, austero y de gran densidad dramática. Dirección musical de Salvador Brotons y dirección escénica de Jaume Villanueva. Temporada 2027 · Bicentenario de Beethoven. Disponibilidad de gira: a partir del último trimestre de 2027, con posibilidad de estudiar otras fechas según calendario.',
    ca: 'Fidelio, de Beethoven. Producció operística amb un llenguatge escènic contemporani, auster i de gran densitat dramàtica. Direcció musical de Salvador Brotons i direcció escènica de Jaume Villanueva. Temporada 2027 · Bicentenari de Beethoven. Disponibilitat de gira: a partir de l’últim trimestre de 2027, amb possibilitat d’estudiar altres dates segons calendari.',
  },
  {
    patron: /r[eé]quiem/i,
    es: 'Ein deutsches Requiem (Un réquiem alemán), de Brahms. Gran producción sinfónico-coral bajo la dirección de Jordi Mora, discípulo directo de Sergiu Celibidache, al frente de la Orquestra Simfònica Segle XXI, junto a las formaciones corales participantes. Disponibilidad de gira: a partir de julio de 2027.',
    ca: 'Ein deutsches Requiem (Un rèquiem alemany), de Brahms. Gran producció simfònico-coral sota la direcció de Jordi Mora, deixeble directe de Sergiu Celibidache, al capdavant de l’Orquestra Simfònica Segle XXI, juntament amb les formacions corals participants. Disponibilitat de gira: a partir de juliol de 2027.',
  },
  {
    patron: /pasi[oó]n.*juan|passi[oó].*joan/i,
    es: 'Pasión según San Juan, de Bach. Temporada 2028. Proyecto escénico que reúne a la Orquestra Simfònica Segle XXI, bajo la dirección musical de Salvador Brotons, con coro, solistas y equipo escénico de Òpera Popular de Barcelona.',
    ca: 'Passió segons sant Joan, de Bach. Temporada 2028. Projecte escènic que reuneix l’Orquestra Simfònica Segle XXI, sota la direcció musical de Salvador Brotons, amb cor, solistes i equip escènic d’Òpera Popular de Barcelona.',
  },
  {
    patron: /flauta m[aáà]gica/i,
    es: 'La flauta mágica, de Mozart. Temporada 2028. Producción operística de repertorio, ágil y de amplio atractivo para públicos diversos, concebida para acercar la ópera a distintos tipos de teatros y auditorios.',
    ca: 'La flauta màgica, de Mozart. Temporada 2028. Producció operística de repertori, àgil i d’ampli atractiu per a públics diversos, concebuda per acostar l’òpera a diferents tipus de teatres i auditoris.',
  },
  {
    patron: /ella fitzgerald/i,
    es: 'Homenaje a Ella Fitzgerald y grandes damas del jazz. Un recorrido por el elegante repertorio de la «Primera Dama de la Canción» y los grandes estándares del Great American Songbook. Un espectáculo que combina virtuosismo vocal, arreglos cuidados y la calidez del jazz clásico, perfecto para noches de festival o veladas de gala en plazas y teatros.',
    ca: 'Homenatge a Ella Fitzgerald i grans dames del jazz. Un recorregut per l’elegant repertori de la «Primera Dama de la Cançó» i els grans estàndards del Great American Songbook. Un espectacle que combina virtuosisme vocal, arranjaments acurats i la calidesa del jazz clàssic, perfecte per a nits de festival o vetllades de gala en places i teatres.',
  },
  {
    patron: /creedence/i,
    es: 'Tributo a Creedence Clearwater Revival. Un homenaje vibrante a la mítica banda de John Fogerty, que repasa los grandes himnos del swamp rock y el rock sureño de los 60 y 70 (Proud Mary, Bad Moon Rising, Have You Ever Seen the Rain, Fortunate Son). Una propuesta de sonido directo, potente y contagioso que conecta de forma inmediata con públicos intergeneracionales en escenarios de fiesta mayor y festivales.',
    ca: 'Tribut a Creedence Clearwater Revival. Un homenatge vibrant a la mítica banda de John Fogerty, que repassa els grans himnes del swamp rock i el rock sudista dels 60 i 70 (Proud Mary, Bad Moon Rising, Have You Ever Seen the Rain, Fortunate Son). Una proposta de so directe, potent i encomanadís que connecta de manera immediata amb públics intergeneracionals en escenaris de festa major i festivals.',
  },
  {
    patron: /historia del rock/i,
    es: 'La Historia del Rock. Un espectáculo festivo que propone un viaje cronológico por las décadas doradas de la música moderna. A través de la interpretación de los temas más icónicos de la historia del rock, el concierto combina la potencia de la banda en directo con comentarios y contextualización de cada época, resultando ideal tanto para audiencias familiares como para grandes eventos al aire libre.',
    ca: 'La Història del Rock. Un espectacle festiu que proposa un viatge cronològic per les dècades daurades de la música moderna. A través de la interpretació dels temes més icònics de la història del rock, el concert combina la potència de la banda en directe amb comentaris i contextualització de cada època, i resulta ideal tant per a públics familiars com per a grans esdeveniments a l’aire lliure.',
  },
];

// ---------- Composición ----------

const NOMBRE_ESTILO: Record<'es' | 'ca', Record<Estilo, string>> = {
  es: { jazz: 'jazz', clasica: 'música clásica', opera: 'ópera' },
  ca: { jazz: 'jazz', clasica: 'música clàssica', opera: 'òpera' },
};
const NOMBRE_LINEA_ASUNTO: Record<'es' | 'ca', Record<Linea, string>> = {
  es: { lirica: 'ópera y repertorio sinfónico-coral', camara: 'música de cámara', popular: 'jazz, swing y rock', navidad: 'Navidad y Año Nuevo' },
  ca: { lirica: 'òpera i repertori simfònico-coral', camara: 'música de cambra', popular: 'jazz, swing i rock', navidad: 'Nadal i Any Nou' },
};

const lista = (xs: string[], y: string) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} ${y} ${xs.at(-1)}`);
const rellenar = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
const fechaLarga = (iso: string | null, idioma: 'es' | 'ca') =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(idioma === 'ca' ? 'ca-ES' : 'es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : null;

export interface DatosComposicion {
  idioma: 'es' | 'ca';
  lugar: string;
  persona: string | null;
  /** Estilos que el sitio ha programado (contratos públicos), de más a menos. */
  historial: Estilo[];
  espectaculos: Pick<Espectaculo, 'id' | 'nombre' | 'tipo' | 'enlace' | 'textoCarta' | 'textoCartaCa'>[];
  licitaciones: { titulo: string; fin: string | null }[];
  ayudas: { titulo: string }[];
  gestion: boolean;
  ajustes: AjustesCrm;
}

/** Completa unas plantillas guardadas con las genéricas (textos que falten o secciones añadidas después). */
export function completarPlantillas(x: unknown): PlantillasCarta {
  const completar = (v: unknown, base: unknown): unknown => {
    if (typeof base === 'string') return typeof v === 'string' ? v.slice(0, 6000) : base;
    if (Array.isArray(base)) return base.map((b, i) => completar(Array.isArray(v) ? v[i] : undefined, b));
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(base as Record<string, unknown>).map(([k, b]) => [k, completar(o[k], b)]));
  };
  return completar(x, PLANTILLAS_GENERICAS) as PlantillasCarta;
}

export function plantillasDe(a: AjustesCrm): PlantillasCarta {
  return a.plantillas ? completarPlantillas(a.plantillas) : PLANTILLAS_GENERICAS;
}

export function firmaCarta(a: AjustesCrm, idioma: 'es' | 'ca'): string {
  if (a.firma.trim()) return a.firma.trim();
  const lineas = [a.remitente, a.cargo, a.organizacion, a.telefono, a.email, a.web].filter((x) => x?.trim());
  return lineas.length ? lineas.join('\n') : idioma === 'ca' ? '[La teva signatura]' : '[Tu firma]';
}

/**
 * Primera carta de una propuesta, por bloques. Dentro de la lírica, a quien programa sobre todo ópera se le presentan
 * primero las óperas; a quien programa sinfónico-coral, primero el repertorio sinfónico-coral.
 */
export function componerCarta(d: DatosComposicion): { asunto: string; cuerpo: string } {
  const t = plantillasDe(d.ajustes)[d.idioma];
  const v = { lugar: d.lugar, organizacion: d.ajustes.organizacion || 'nuestra compañía', persona: d.persona ?? '' };
  const y = d.idioma === 'ca' ? 'i' : 'y';
  const primeroOpera = d.historial[0] === 'opera';
  const ordenTipo = (x: TipoEspectaculo) =>
    x === 'opera' ? (primeroOpera ? 0 : 2) : x === 'sinfonico_coral' || x === 'religiosa' ? (primeroOpera ? 1 : 0) : primeroOpera ? 2 : 1;
  const porLinea = new Map<Linea, DatosComposicion['espectaculos']>();
  for (const e of d.espectaculos) porLinea.set(LINEA_DE_TIPO[e.tipo], [...(porLinea.get(LINEA_DE_TIPO[e.tipo]) ?? []), e]);
  porLinea.get('lirica')?.sort((a, b) => ordenTipo(a.tipo) - ordenTipo(b.tipo));
  // Línea principal: la del estilo que más programa el sitio; si no, la que más propuestas aporta.
  const lineaDeEstilo: Record<Estilo, Linea> = { opera: 'lirica', clasica: 'lirica', jazz: 'popular' };
  const lineas = [...porLinea.keys()].sort((a, b) => {
    const pa = d.historial.findIndex((e) => lineaDeEstilo[e] === a);
    const pb = d.historial.findIndex((e) => lineaDeEstilo[e] === b);
    return (pa < 0 ? 9 : pa) - (pb < 0 ? 9 : pb) || porLinea.get(b)!.length - porLinea.get(a)!.length;
  });

  const parrafos: string[] = [d.persona ? rellenar(t.saludoPersona, v) : t.saludo];
  parrafos.push(rellenar(lineas.length === 1 ? t.lineas[lineas[0]!].intro : t.introVarias, v));
  if (d.historial.length) parrafos.push(rellenar(t.historial, { ...v, estilos: lista(d.historial.map((e) => NOMBRE_ESTILO[d.idioma][e]), y) }));
  for (const [i, l] of lineas.entries()) {
    const bloque = [t.lineas[l].titulo];
    // La línea principal, con su texto de presentación; las demás, solo con sus propuestas (el correo no se alarga).
    if (i === 0 && t.lineas[l].texto) bloque.push(rellenar(t.lineas[l].texto, v));
    for (const e of porLinea.get(l)!) {
      const texto = (d.idioma === 'ca' ? e.textoCartaCa || e.textoCarta : e.textoCarta)?.trim();
      const propio = e.enlace && e.enlace.replace(/\/$/, '') !== d.ajustes.web.replace(/\/$/, '') ? ` (${e.enlace})` : '';
      bloque.push(`• ${texto || e.nombre}${propio}`);
    }
    parrafos.push(bloque.join('\n\n'));
  }
  for (const l of d.licitaciones.slice(0, 1)) {
    const f = fechaLarga(l.fin, d.idioma);
    parrafos.push(rellenar(t.licitacion, { ...v, titulo: l.titulo, fecha: f ? (d.idioma === 'ca' ? ` (ofertes fins al ${f})` : ` (ofertas hasta el ${f})`) : '' }));
  }
  if (d.ayudas.length) {
    const nombres = lista(
      d.ayudas.slice(0, 2).map((a) => `«${a.titulo}»`),
      y,
    );
    const convocatorias = d.idioma === 'ca' ? `${d.ayudas.length > 1 ? 'les convocatòries' : 'la convocatòria'} ${nombres},` : `${d.ayudas.length > 1 ? 'las convocatorias' : 'la convocatoria'} ${nombres},`;
    parrafos.push(rellenar(t.ayudas, { ...v, convocatorias }));
  }
  if (d.gestion) parrafos.push(rellenar(t.gestion, v));
  parrafos.push(rellenar(t.colaboracion, v));
  parrafos.push(`${rellenar(t.despedida, v)}\n\n${firmaCarta(d.ajustes, d.idioma)}`);
  const asunto = rellenar(t.asunto, { ...v, propuestas: lista(lineas.slice(0, 2).map((l) => NOMBRE_LINEA_ASUNTO[d.idioma][l]), y) || (d.idioma === 'ca' ? 'programació' : 'programación') });
  return { asunto, cuerpo: parrafos.join('\n\n') };
}

/** Seguimientos (2.º a 5.º): breves, con el saludo y la firma de la cuenta. */
export function componerSeguimiento(paso: number, d: Pick<DatosComposicion, 'idioma' | 'lugar' | 'persona' | 'ajustes'>, asuntoInicial: string): { asunto: string; cuerpo: string } {
  const t = plantillasDe(d.ajustes)[d.idioma];
  const v = { lugar: d.lugar, organizacion: d.ajustes.organizacion, persona: d.persona ?? '' };
  const texto = t.seguimientos[Math.min(Math.max(paso - 2, 0), 3)]!;
  const despedida = d.idioma === 'ca' ? 'Atentament,' : 'Atentamente,';
  return {
    asunto: `Re: ${asuntoInicial}`,
    cuerpo: [d.persona ? rellenar(t.saludoPersona, v) : t.saludo, rellenar(texto, v), `${despedida}\n\n${firmaCarta(d.ajustes, d.idioma)}`].join('\n\n'),
  };
}
