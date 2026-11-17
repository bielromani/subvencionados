// Preajuste ArsVia: las cartas modelo y los dossieres de Joan Romaní (noviembre de 2026), por líneas.
// Se cargan con «Cargar las cartas modelo de ArsVia» y después se pueden cambiar en la app.

import type { Linea, PlantillasCarta, TextoLinea, TextosIdioma } from './cartas.js';
import type { Espectaculo, FichaDossier } from './tipos.js';

const ALIANZA = 'Ópera Popular de Barcelona · Orquesta Sinfónica Siglo XXI · ArsVia – Music Projects';
const ALIANZA_NAVIDAD = 'Orquesta Sinfónica Siglo XXI · ArsVia – Music Projects';
const ARSVIA = 'ArsVia – Music Projects';
const firma = (entidades: string) => `Joan Romaní\nCoordinación de proyectos y giras\n${entidades}\nTel. +34 613 11 23 83\njoanromani@arsvia.org`;
const firmaCa = (entidades: string) => `Joan Romaní\nCoordinació de projectes i gires\n${entidades}\nTel. +34 613 11 23 83\njoanromani@arsvia.org`;

/** Firma de la cuenta (las líneas con otra alianza llevan la suya). */
export const FIRMA_ARSVIA = firma(ARSVIA);
/** Firmas de preajustes anteriores: si la cuenta aún tiene una, se cambia por la nueva. */
export const FIRMAS_ANTERIORES_ARSVIA = [
  'Joan Romaní\nCoordinación de proyectos y giras\nÒpera Popular de Barcelona · Orquestra Simfònica Segle XXI · Jeloudoli S.L. · ArsVia – Music Projects\nTel. +34 613 11 23 83\njoanromani@arsvia.org | arsvia.org',
];

const CONDICIONES_ES = {
  base: (incluye: string, quien: string, extra = '') =>
    `Los precios son cerrados por ${incluye}.\n\nEl alojamiento y la manutención ${quien}, en caso de ser necesarios, no están incluidos en el precio y corren a cargo del contratante, que se encarga de gestionar y pagar directamente la estancia y las comidas. Antes de cada actuación, facilitaremos una ficha con el número de personas y las necesidades concretas para que el promotor pueda organizarlas con antelación.\n\n${extra}`,
};

const LINEAS_ES: Record<Linea, TextoLinea> = {
  opera: {
    titulo: 'Ópera escenificada',
    asunto: 'La flauta mágica, años 2027 y 2028. Fidelio (Bicentenario de la muerte de Beethoven), entre octubre y diciembre de 2027',
    intro: 'Te presento dos grandes producciones de ópera escenificada para la programación de {lugar}, pensadas tanto para atraer al gran público como para ofrecer hitos artísticos de primer nivel.',
    texto:
      'Soy {remitente} y te escribo en representación de la alianza de producción formada por Ópera Popular de Barcelona, Orquesta Sinfónica Siglo XXI y ArsVia – Music Projects (del latín ars y via: camino del arte).\n\nEstas son nuestras dos apuestas líricas:',
    cierre: 'En el dossier adjunto encontrarás la descripción artística de cada título, las fechas disponibles y las condiciones económicas. Si te interesa conocer otras de nuestras producciones, puedes consultarlas en {web}.',
    invitacion:
      'TE INVITO A VERNOS EN ESCENA. Presentamos La flauta mágica en el Palau de la Música Catalana los días 7 de diciembre de 2026 y 15 de enero de 2027. Te invito a una de las dos funciones, con una entrada para ti y otra para quien quieras traer. Escríbeme con la fecha que prefieras y te reservo las entradas.',
    invitacionHasta: '2027-01-14',
    firma: firma(ALIANZA),
    dossierTitulo: 'Propuestas de Ópera Escenificada · Temporadas 2027 y 2028',
    dossierSubtitulo: ALIANZA,
    condiciones: CONDICIONES_ES.base(
      'función e incluyen la coordinación artística, los solistas, el coro, la orquesta, el equipo técnico-escénico, los traslados y la gestión de la producción',
      'del grupo',
      'Somos flexibles en cuanto a las soluciones de alojamiento y nos adaptamos a las posibilidades de cada teatro o municipio (hoteles, residencias, casas de acogida u otros espacios que reúnan unas condiciones adecuadas).\n\nEn muchos casos, las actuaciones pueden facturarse exentas de IVA.\n\nEstudiaremos conjuntamente las subvenciones que puedan facilitar cada proyecto. A modo de ejemplo, presentaremos a PLATEA Fidelio para 2027 y La flauta mágica para 2028.\n\nFormalizamos la colaboración mediante una carta de intenciones y, posteriormente, un contrato.',
    ),
    notaFinal: 'Los precios son por función e incluyen actuación y traslados. El alojamiento y la manutención del grupo, caso de ser necesarios, corren a cargo del contratante, que los gestiona y paga directamente.',
  },
  sinfonico: {
    titulo: 'Música sinfónico-coral y sacra',
    asunto: 'Propuestas sinfónico-corales y sacras · Réquiem alemán (Brahms) a partir de julio de 2027 y Pasión según San Juan escenificada (Bach) todo el 2028',
    intro:
      'Te presento dos grandes producciones del repertorio sinfónico-coral y sacro para la programación de {lugar}. Son dos propuestas concebidas tanto para auditorios como para iglesias, monasterios y festivales de música religiosa o ciclos de Semana Santa, con formatos flexibles que facilitan su viabilidad.',
    texto:
      'Soy {remitente} y te escribo en representación de la alianza de producción formada por Ópera Popular de Barcelona, Orquesta Sinfónica Siglo XXI y ArsVia – Music Projects (del latín ars y via: camino del arte).\n\nEstas son nuestras dos propuestas:',
    cierre: 'En el dossier adjunto encontrarás la descripción detallada de cada obra y las fechas disponibles, incluidas las condiciones especiales de gira para el Réquiem de Brahms.',
    invitacion:
      'TE INVITO A VERNOS EN ESCENA. Si te interesa conocer de cerca el trabajo artístico de nuestra alianza, presentamos La flauta mágica en el Palau de la Música Catalana, representada por Ópera Popular, los días 7 de diciembre de 2026 y 15 de enero de 2027, y estaré encantado de invitarte con dos entradas.',
    invitacionHasta: '2027-01-14',
    firma: firma(ALIANZA),
    dossierTitulo: 'Propuestas Sinfónico-Corales y Sacras · Temporadas 2027 y 2028',
    dossierSubtitulo: ALIANZA,
    condiciones: CONDICIONES_ES.base(
      'función e incluyen la coordinación artística, los músicos, los solistas, los traslados y la gestión de la producción',
      'del grupo',
      'Somos muy flexibles en cuanto a las soluciones de alojamiento y nos adaptamos a las posibilidades de cada entidad o municipio: no es imprescindible recurrir a hoteles; pueden contemplarse residencias, conventos, casas de acogida, escuelas u otros espacios que reúnan unas condiciones adecuadas. Venimos de una larga tradición de trabajo con corales y agrupaciones musicales, donde este tipo de soluciones han sido siempre habituales.\n\nEn muchos casos, las actuaciones pueden facturarse exentas de IVA.\n\nEstudiaremos conjuntamente las subvenciones que puedan facilitar cada proyecto. A modo de ejemplo, presentaremos a PLATEA el Réquiem alemán para 2027 y la Pasión según San Juan para 2028.\n\nFormalizamos la colaboración mediante una carta de intenciones y, posteriormente, un contrato.',
    ),
    notaFinal: 'Los precios son por función e incluyen actuación y traslados. El alojamiento y la manutención del grupo, caso de ser necesarios, corren a cargo del contratante, que los gestiona y paga directamente.',
  },
  camara: {
    titulo: 'Música de cámara',
    asunto: 'Propuestas de música de cámara 2027-2028 · Integral de Brahms y Romanticismo alemán (Dúo Aidos)',
    intro:
      'Te presento dos propuestas de música de cámara para la programación de {lugar} entre enero de 2027 y diciembre de 2028. Dos proyectos pensados para ciclos estables, ateneos, fundaciones y salas de formato íntimo que busquen excelencia interpretativa y cercanía con el público.',
    texto: 'Soy {remitente} y te escribo en representación de ArsVia – Music Projects (del latín ars y via: camino del arte).\n\nEstas son nuestras dos propuestas de cámara:',
    cierre: 'En el dossier adjunto encontrarás la descripción de cada propuesta, las opciones de contratación y las condiciones económicas.',
    invitacion:
      'TE INVITO A CONOCERNOS el 18 de enero de 2027 en la inauguración del ciclo «Los tercer lunes, música en LaFACT cultural», en Terrassa.\n\nEl Romanticismo apasionado · Brahms y Schumann en estado puro. Intérpretes: Quartet Calders y Carolina Cho, piano. Comentarios: Jordi Mora, director de orquesta.\n\nUna inmersión en el corazón del Romanticismo alemán a través del Cuarteto de cuerda n.º 1 en do menor, op. 51, de Brahms, y el Quinteto con piano en mi bemol mayor, op. 44, de Schumann. Dos obras de referencia del repertorio camerístico del Romanticismo germánico, que combinan magistralmente energía desbordante, lirismo apasionado y una gran riqueza formal. En el caso de Schumann, el diálogo entre las cuerdas y el piano adquiere una dimensión casi sinfónica, en una obra capital de la música de cámara europea del siglo XIX.',
    invitacionHasta: '2027-01-17',
    firma: firma(ARSVIA),
    dossierTitulo: 'Propuestas de Música de Cámara · Temporadas 2027 y 2028',
    dossierSubtitulo: ARSVIA,
    condiciones: CONDICIONES_ES.base(
      'concierto (o ciclo) e incluyen la coordinación artística, los intérpretes, los traslados y la gestión de la producción',
      'de los músicos',
      'Somos flexibles en cuanto a las soluciones de alojamiento y nos adaptamos a las posibilidades de cada entidad o municipio (hoteles, residencias, casas de acogida u otros espacios adecuados).\n\nEn muchos casos, las actuaciones pueden facturarse exentas de IVA.\n\nEstudiaremos conjuntamente las subvenciones o circuitos públicos que puedan facilitar cada proyecto.\n\nSalvo indicación contraria, las propuestas están disponibles durante 2027 y 2028.\n\nFormalizamos la colaboración mediante una carta de intenciones y, posteriormente, un contrato.',
    ),
    notaFinal: 'Los precios son por concierto e incluyen actuación y traslados. El alojamiento y la manutención de los músicos, caso de ser necesarios, corren a cargo del contratante, que los gestiona y paga directamente.',
  },
  popular: {
    titulo: 'Jazz, rock clásico y fusión',
    asunto: 'Propuestas de jazz, rock clásico y fusión 2027-2028 · De The Crossroads a los clásicos del swing y el rock',
    intro:
      'Te presento nuestras propuestas de jazz, rock clásico, músicas de raíz y fusión para la programación de {lugar} entre enero de 2027 y diciembre de 2028. Un catálogo pensado para festivales, programaciones de verano, ciclos de club y teatros que busquen conciertos con energía, rigor musical y una conexión directa con públicos de todas las edades.',
    texto: 'Soy {remitente} y te escribo en representación de ArsVia – Music Projects (del latín ars y via: camino del arte).\n\nEstas son nuestras propuestas:',
    cierre: 'En el dossier adjunto encontrarás la descripción artística, la ficha técnica de The Crossroads y las condiciones económicas de cada espectáculo.',
    invitacion: '',
    invitacionHasta: '',
    firma: firma(ARSVIA),
    dossierTitulo: 'Propuestas de Jazz, Rock Clásico y Fusión · Años 2027 y 2028',
    dossierSubtitulo: ARSVIA,
    condiciones: CONDICIONES_ES.base(
      'función e incluyen la coordinación artística, los músicos, los traslados y la gestión de la producción',
      'del grupo',
      'Somos flexibles en cuanto a las soluciones de alojamiento y nos adaptamos a las posibilidades de cada promotor o municipio (hoteles, residencias, casas de acogida u otros espacios que reúnan unas condiciones adecuadas).\n\nEn muchos casos, las actuaciones pueden facturarse exentas de IVA.\n\nEstudiaremos conjuntamente las subvenciones o circuitos que puedan facilitar cada proyecto.\n\nSalvo indicación contraria, las propuestas están disponibles durante 2027 y 2028.\n\nFormalizamos la colaboración mediante una carta de intenciones y, posteriormente, un contrato.',
    ),
    notaFinal: 'Los precios son por función e incluyen actuación y traslados. El alojamiento y la manutención del grupo, caso de ser necesarios, corren a cargo del contratante, que los gestiona y paga directamente.',
  },
  navidad: {
    titulo: 'Navidad y Año Nuevo',
    asunto: 'Propuesta para Navidad y Año Nuevo · Concierto de Año Nuevo al estilo del 1 de enero vienés (en formato sinfónico o de cámara)',
    intro:
      'De cara a la programación navideña de {lugar}, te presento nuestra propuesta de Concierto de Año Nuevo, disponible cada temporada entre el 15 de diciembre y el 15 de enero e inspirada en la tradición vienesa del 1 de enero: valses, polcas y marchas de la familia Strauss, melodías de La viuda alegre, opereta de Lehár, y una selección de villancicos para todos los públicos.',
    texto:
      'Soy {remitente} y te escribo en representación de la alianza de producción formada por la Orquesta Sinfónica Siglo XXI y ArsVia – Music Projects (del latín ars y via: camino del arte).\n\nPara adaptarnos tanto a grandes auditorios como a teatros municipales o salas de formato íntimo, ofrecemos esta producción en dos formatos cerrados:',
    cierre: 'En el dossier adjunto encontrarás los detalles de cada formato y las condiciones económicas.',
    invitacion: 'TE INVITO A CONOCERNOS y a disfrutar de este concierto, que celebraremos en la Seu d’Urgell el próximo 29 de diciembre.',
    invitacionHasta: '2026-12-28',
    firma: firma(ALIANZA_NAVIDAD),
    dossierTitulo: 'Propuestas de Navidad y Año Nuevo · Cada año, del 15 de diciembre al 15 de enero',
    dossierSubtitulo: ALIANZA_NAVIDAD,
    condiciones: CONDICIONES_ES.base(
      'función e incluyen la coordinación artística, los intérpretes, los traslados y la gestión de la producción',
      'del grupo',
      'Somos flexibles en cuanto a las soluciones de alojamiento y nos adaptamos a las posibilidades de cada entidad o municipio (hoteles, residencias, casas de acogida u otros espacios que reúnan unas condiciones adecuadas).\n\nEn muchos casos, las actuaciones pueden facturarse exentas de IVA.\n\nFormalizamos la colaboración mediante una carta de intenciones y, posteriormente, un contrato.',
    ),
    notaFinal: 'Los precios son por función e incluyen actuación y traslados. El alojamiento y la manutención del grupo, caso de ser necesarios, corren a cargo del contratante, que los gestiona y paga directamente.',
  },
};

const ALIANZA_CA = 'Òpera Popular de Barcelona · Orquestra Simfònica Segle XXI · ArsVia – Music Projects';
const ALIANZA_NAVIDAD_CA = 'Orquestra Simfònica Segle XXI · ArsVia – Music Projects';
const PRESENTACION_ALIANZA_CA =
  'Sóc {remitente} i t’escric en representació de l’aliança de producció formada per Òpera Popular de Barcelona, Orquestra Simfònica Segle XXI i ArsVia – Music Projects (del llatí ars i via: camí de l’art).';
const PRESENTACION_ARSVIA_CA = 'Sóc {remitente} i t’escric en representació d’ArsVia – Music Projects (del llatí ars i via: camí de l’art).';
const NOTA_CA = 'Els preus són per funció i inclouen actuació i trasllats. L’allotjament i la manutenció del grup, en cas de ser necessaris, van a càrrec del contractant, que els gestiona i paga directament.';

/** En catalán: las cartas; el dossier, si no se traduce en la app, sale en castellano. */
const LINEAS_CA: Record<Linea, TextoLinea> = {
  opera: {
    ...LINEAS_ES.opera,
    titulo: 'Òpera escenificada',
    asunto: 'La flauta màgica, anys 2027 i 2028. Fidelio (Bicentenari de la mort de Beethoven), entre octubre i desembre de 2027',
    intro: 'Et presento dues grans produccions d’òpera escenificada per a la programació de {lugar}, pensades tant per atraure el gran públic com per oferir fites artístiques de primer nivell.',
    texto: `${PRESENTACION_ALIANZA_CA}\n\nAquestes són les nostres dues apostes líriques:`,
    cierre: 'Al dossier adjunt trobaràs la descripció artística de cada títol, les dates disponibles i les condicions econòmiques. Si t’interessa conèixer altres produccions nostres, pots consultar-les a {web}.',
    invitacion:
      'ET CONVIDO A VEURE’NS EN ESCENA. Presentem La flauta màgica al Palau de la Música Catalana els dies 7 de desembre de 2026 i 15 de gener de 2027. Et convido a una de les dues funcions, amb una entrada per a tu i una altra per a qui vulguis portar. Escriu-me amb la data que prefereixis i et reservo les entrades.',
    firma: firmaCa(ALIANZA_CA),
  },
  sinfonico: {
    ...LINEAS_ES.sinfonico,
    titulo: 'Música simfònico-coral i sacra',
    asunto: 'Propostes simfònico-corals i sacres · Un rèquiem alemany (Brahms) a partir de juliol de 2027 i Passió segons sant Joan escenificada (Bach) tot el 2028',
    intro:
      'Et presento dues grans produccions del repertori simfònico-coral i sacre per a la programació de {lugar}. Són dues propostes concebudes tant per a auditoris com per a esglésies, monestirs i festivals de música religiosa o cicles de Setmana Santa, amb formats flexibles que en faciliten la viabilitat.',
    texto: `${PRESENTACION_ALIANZA_CA}\n\nAquestes són les nostres dues propostes:`,
    cierre: 'Al dossier adjunt trobaràs la descripció detallada de cada obra i les dates disponibles, incloses les condicions especials de gira per al Rèquiem de Brahms.',
    invitacion:
      'ET CONVIDO A VEURE’NS EN ESCENA. Si t’interessa conèixer de prop el treball artístic de la nostra aliança, presentem La flauta màgica al Palau de la Música Catalana, representada per Òpera Popular, els dies 7 de desembre de 2026 i 15 de gener de 2027, i estaré encantat de convidar-te amb dues entrades.',
    firma: firmaCa(ALIANZA_CA),
  },
  camara: {
    ...LINEAS_ES.camara,
    titulo: 'Música de cambra',
    asunto: 'Propostes de música de cambra 2027-2028 · Integral de Brahms i Romanticisme alemany (Duo Aidos)',
    intro:
      'Et presento dues propostes de música de cambra per a la programació de {lugar} entre gener de 2027 i desembre de 2028. Dos projectes pensats per a cicles estables, ateneus, fundacions i sales de format íntim que busquin excel·lència interpretativa i proximitat amb el públic.',
    texto: `${PRESENTACION_ARSVIA_CA}\n\nAquestes són les nostres dues propostes de cambra:`,
    cierre: 'Al dossier adjunt trobaràs la descripció de cada proposta, les opcions de contractació i les condicions econòmiques.',
    invitacion:
      'ET CONVIDO A CONÈIXER-NOS el 18 de gener de 2027 a la inauguració del cicle «Los tercer lunes, música en LaFACT cultural», a Terrassa.\n\nEl Romanticisme apassionat · Brahms i Schumann en estat pur. Intèrprets: Quartet Calders i Carolina Cho, piano. Comentaris: Jordi Mora, director d’orquestra.\n\nUna immersió en el cor del Romanticisme alemany a través del Quartet de corda núm. 1 en do menor, op. 51, de Brahms, i el Quintet amb piano en mi bemoll major, op. 44, de Schumann. Dues obres de referència del repertori cambrístic del Romanticisme germànic, que combinen magistralment una energia desbordant, un lirisme apassionat i una gran riquesa formal. En el cas de Schumann, el diàleg entre les cordes i el piano adquireix una dimensió gairebé simfònica, en una obra cabdal de la música de cambra europea del segle XIX.',
    firma: firmaCa(ARSVIA),
  },
  popular: {
    ...LINEAS_ES.popular,
    titulo: 'Jazz, rock clàssic i fusió',
    asunto: 'Propostes de jazz, rock clàssic i fusió 2027-2028 · De The Crossroads als clàssics del swing i el rock',
    intro:
      'Et presento les nostres propostes de jazz, rock clàssic, músiques d’arrel i fusió per a la programació de {lugar} entre gener de 2027 i desembre de 2028. Un catàleg pensat per a festivals, programacions d’estiu, cicles de club i teatres que busquin concerts amb energia, rigor musical i una connexió directa amb públics de totes les edats.',
    texto: `${PRESENTACION_ARSVIA_CA}\n\nAquestes són les nostres propostes:`,
    cierre: 'Al dossier adjunt trobaràs la descripció artística, la fitxa tècnica de The Crossroads i les condicions econòmiques de cada espectacle.',
    firma: firmaCa(ARSVIA),
  },
  navidad: {
    ...LINEAS_ES.navidad,
    titulo: 'Nadal i Any Nou',
    asunto: 'Proposta per a Nadal i Any Nou · Concert d’Any Nou a l’estil de l’1 de gener vienès (en format simfònic o de cambra)',
    intro:
      'De cara a la programació nadalenca de {lugar}, et presento la nostra proposta de Concert d’Any Nou, disponible cada temporada entre el 15 de desembre i el 15 de gener i inspirada en la tradició vienesa de l’1 de gener: valsos, polques i marxes de la família Strauss, melodies de La vídua alegre, opereta de Lehár, i una selecció de nadales per a tots els públics.',
    texto:
      'Sóc {remitente} i t’escric en representació de l’aliança de producció formada per l’Orquestra Simfònica Segle XXI i ArsVia – Music Projects (del llatí ars i via: camí de l’art).\n\nPer adaptar-nos tant a grans auditoris com a teatres municipals o sales de format íntim, oferim aquesta producció en dos formats tancats:',
    cierre: 'Al dossier adjunt trobaràs els detalls de cada format i les condicions econòmiques.',
    invitacion: 'ET CONVIDO A CONÈIXER-NOS i a gaudir d’aquest concert, que celebrarem a la Seu d’Urgell el proper 29 de desembre.',
    firma: firmaCa(ALIANZA_NAVIDAD_CA),
  },
};
for (const l of Object.keys(LINEAS_CA) as Linea[]) LINEAS_CA[l].notaFinal = NOTA_CA;

const ARSVIA_ES: TextosIdioma = {
  saludo: 'Hola:',
  saludoPersona: 'Hola, {persona}:',
  historial: 'He visto que en {lugar} habéis programado {estilos} en los últimos años, y por eso creo que estas propuestas pueden interesarte.',
  otrasLineas: 'También tenemos propuestas de {lineas}. Si te interesan, te envío el dossier.',
  lineas: LINEAS_ES,
  licitacion: 'He visto también que tenéis abierta la licitación «{titulo}»{fecha}; si lo veis oportuno, estaremos encantados de presentar una propuesta.',
  ayudas: 'Además, he visto {convocatorias} que podría facilitar la programación de estas propuestas; si te parece, lo estudiamos juntos.',
  gestion: 'Además de producciones y conciertos, diseñamos, producimos y gestionamos festivales y ciclos completos, como ya hacemos en Empuriabrava, Mollerussa o Terrassa.',
  colaboracion: 'Si te resulta más cómodo, me acerco yo a visitarte. También podemos concertar una videoconferencia o hablar por teléfono.',
  despedida: 'Será un placer escuchar tus necesidades de programación y explorar posibles vías de colaboración.\n\nUn cordial saludo,',
  seguimientos: [
    'Te escribí hace unos días para presentarte algunas propuestas para la programación de {lugar}. Te escribo de nuevo por si el mensaje se quedó entre otros. Si me indicas quién lleva la programación, le hago llegar el dossier directamente.',
    'Me permito escribirte de nuevo por si te resulta útil tener a mano nuestras propuestas para las próximas temporadas. Nos adaptamos a espacios y presupuestos muy distintos; si tenéis alguna fecha o ciclo en mente, lo estudiamos.',
    'No quisiera insistir más de la cuenta: solo quería saber si alguna de las propuestas puede interesaros ahora o más adelante, para tenerlo en cuenta en nuestra planificación.',
    'Este es el último mensaje que te envío sobre estas propuestas. Si en algún momento te interesan, estaré encantado de hablarlo. Muchas gracias por tu tiempo.',
  ],
  despedidaBreve: 'Un cordial saludo,',
  asunto: 'Propuestas de {propuestas} para {lugar} · ArsVia',
};

const ARSVIA_CA: TextosIdioma = {
  saludo: 'Hola,',
  saludoPersona: 'Hola, {persona},',
  historial: 'He vist que a {lugar} heu programat {estilos} en els darrers anys, i per això crec que aquestes propostes et poden interessar.',
  otrasLineas: 'També tenim propostes de {lineas}. Si t’interessen, t’envio el dossier.',
  lineas: LINEAS_CA,
  licitacion: 'He vist també que teniu oberta la licitació «{titulo}»{fecha}; si ho veieu oportú, estarem encantats de presentar-hi una proposta.',
  ayudas: 'A més, he vist {convocatorias} que podria facilitar la programació d’aquestes propostes; si et sembla bé, ho estudiem junts.',
  gestion: 'A més de produccions i concerts, dissenyem, produïm i gestionem festivals i cicles complets, com ja fem a Empuriabrava, Mollerussa o Terrassa.',
  colaboracion: 'Si et resulta més còmode, m’acosto jo a visitar-te. També podem concertar una videoconferència o parlar per telèfon.',
  despedida: 'Serà un plaer escoltar les teves necessitats de programació i explorar possibles vies de col·laboració.\n\nUna salutació cordial,',
  seguimientos: [
    'Et vaig escriure fa uns dies per presentar-te algunes propostes per a la programació de {lugar}. T’escric de nou per si el missatge es va quedar entre d’altres. Si m’indiques qui porta la programació, li faig arribar el dossier directament.',
    'Em permeto escriure’t de nou per si et resulta útil tenir a mà les nostres propostes per a les properes temporades. Ens adaptem a espais i pressupostos molt diferents; si teniu alguna data o cicle en ment, ho estudiem.',
    'No voldria insistir més del compte: només volia saber si alguna de les propostes us pot interessar ara o més endavant, per tenir-ho en compte en la nostra planificació.',
    'Aquest és l’últim missatge que t’envio sobre aquestes propostes. Si en algun moment t’interessen, estaré encantat de parlar-ne. Moltes gràcies pel teu temps.',
  ],
  despedidaBreve: 'Una salutació cordial,',
  asunto: 'Propostes de {propuestas} per a {lugar} · ArsVia',
};

export const PLANTILLAS_ARSVIA: PlantillasCarta = { es: ARSVIA_ES, ca: ARSVIA_CA };

const d = (x: Partial<FichaDossier>): FichaDossier => ({ titulo: '', etiqueta: '', subtitulo: '', equipo: '', descripcion: '', fichaTecnica: '', disponibilidad: '', precio: '', resumen: '', nota: '', ...x });

export interface ProduccionArsvia {
  patron: RegExp;
  /** Viñetas de la carta (una por línea). */
  es: string;
  ca: string;
  dossier: FichaDossier;
  precioMin?: number;
  precioMax?: number;
}

/** Texto de cada producción en las cartas y su página del dossier (se asignan por nombre a las fichas del catálogo). */
export const TEXTOS_PRODUCCIONES_ARSVIA: ProduccionArsvia[] = [
  {
    patron: /flauta m[aáà]gica/i,
    es: 'La flauta mágica, de Mozart · Una producción ágil, visual y para todos los públicos, ideal para acercar la ópera a espectadores de distintas generaciones.',
    ca: 'La flauta màgica, de Mozart · Una producció àgil, visual i per a tots els públics, ideal per acostar l’òpera a espectadors de diferents generacions.',
    precioMin: 30000,
    precioMax: 30000,
    dossier: d({
      titulo: 'LA FLAUTA MÁGICA · Mozart',
      subtitulo: 'Ópera escenificada',
      descripcion:
        'Un príncipe, una princesa, un pajarero y una Reina de la Noche. Tamino y Pamina cruzan las pruebas del fuego y del agua, y Mozart convierte un cuento en una ópera que hace reír, emociona y deja una luz encendida. Una producción ágil, dinámica y pensada para todos los públicos, ideal para fidelizar audiencias y acercar el género lírico a espectadores de distintas generaciones.',
      disponibilidad: 'Temporadas 2027 y 2028.',
      precio: 'Caché por función: 30.000 €',
      resumen: 'La flauta mágica (Mozart) | Producción escenificada para todos los públicos | 2027 y 2028 | 30.000 €',
    }),
  },
  {
    patron: /fidelio/i,
    es: 'Fidelio, de Beethoven · Con dirección musical de Salvador Brotons y dirección escénica de Jaume Villanueva. Una producción de gran fuerza dramática con motivo del bicentenario de la muerte de Beethoven en 2027.',
    ca: 'Fidelio, de Beethoven · Amb direcció musical de Salvador Brotons i direcció escènica de Jaume Villanueva. Una producció de gran força dramàtica amb motiu del bicentenari de la mort de Beethoven el 2027.',
    precioMin: 48000,
    precioMax: 48000,
    dossier: d({
      titulo: 'FIDELIO · Beethoven',
      subtitulo: 'Ópera escenificada',
      equipo: 'Dirección musical: Salvador Brotons (Orquesta Sinfónica Siglo XXI) · Dirección escénica: Jaume Villanueva',
      descripcion:
        'Leonora arriesga su vida para salvar a su marido Florestan de una muerte injusta en prisión: un canto universal a la belleza, la justicia y la libertad. La puesta en escena se inspira en el claroscuro de Goya, recordando que la versión definitiva de la ópera se estrenó en 1814, el mismo año en que Goya pintó El tres de mayo. La orquesta suena desde el foso, como el pulso oculto de la tiranía, y el coro asume el papel de los prisioneros hasta el desenlace liberador.\n\nUna historia con especial resonancia en 2027, bicentenario de la muerte de Beethoven (1827-2027).',
      disponibilidad: 'De octubre a diciembre de 2027.',
      precio: 'Caché por función: 48.000 €',
      resumen: 'Fidelio (Beethoven) | Dir. Salvador Brotons · Escena: Jaume Villanueva | Oct. – Dic. 2027 | 48.000 €',
    }),
  },
  {
    patron: /r[eé]quiem/i,
    es: 'Un réquiem alemán, de Brahms · Con la Orquesta Sinfónica Siglo XXI, la Coral Sant Jordi, la Coral Cantiga y dos solistas, bajo la dirección de Jordi Mora (discípulo directo de Sergiu Celibidache). Incluye una introducción pedagógica previa y permite adaptarse a formaciones más reducidas para iglesias y salas pequeñas.',
    ca: 'Un rèquiem alemany, de Brahms · Amb l’Orquestra Simfònica Segle XXI, la Coral Sant Jordi, la Coral Cantiga i dos solistes, sota la direcció de Jordi Mora (deixeble directe de Sergiu Celibidache). Inclou una introducció pedagògica prèvia i es pot adaptar a formacions més reduïdes per a esglésies i sales petites.',
    precioMin: 12000,
    precioMax: 20000,
    dossier: d({
      titulo: 'UN RÉQUIEM ALEMÁN · Johannes Brahms',
      subtitulo: 'Sinfónico-coral · Dirección: Jordi Mora',
      equipo: 'Con la Orquesta Sinfónica Siglo XXI, la Coral Sant Jordi, la Coral Cantiga y dos solistas, bajo la dirección de Jordi Mora, discípulo directo de Sergiu Celibidache.',
      descripcion:
        'Una introducción pedagógica previa prepara al público para la escucha de una obra profundamente humana y consoladora que deja una honda huella emocional. Además, la producción puede adaptarse a formaciones más reducidas, lo que permite presentarla con total solvencia tanto en auditorios como en iglesias, conventos y salas pequeñas, acercando el gran repertorio sinfónico-coral a espacios singulares.',
      disponibilidad: 'A partir del 14 de julio de 2027 y durante 2028.',
      precio:
        'Caché general por función: 20.000 €\nOferta especial de gira (exclusivamente para estas fechas de 2027):\n14, 16 y 17 de julio de 2027: 12.000 € por función.\n18 y 19 de septiembre de 2027: 14.000 € por función.',
      resumen:
        'Un réquiem alemán (Brahms) | Dir. Jordi Mora · Orquesta Sinfónica Siglo XXI + corales. Incluye introducción pedagógica. Adaptable a iglesias. | A partir del 14/07/2027 | 20.000 € (12.000 € en julio / 14.000 € en sept. 2027) ¹',
      nota: '¹ Oferta especial de gira válida exclusivamente para los días 14, 16 y 17 de julio (12.000 €) y 18 y 19 de septiembre de 2027 (14.000 €).',
    }),
  },
  {
    patron: /pasi[oó]n.*juan|passi[oó].*joan/i,
    es: 'Pasión según San Juan, de Bach (versión escenificada) · Con la Orquesta Sinfónica Siglo XXI, bajo la dirección de Salvador Brotons y la escenificación de Ópera Popular de Barcelona dirigida por Jaume Villanueva. Una propuesta conmovedora donde el coro actúa y representa las escenas de la Pasión, con opción de integrar un coro local en los corales de reflexión.',
    ca: 'Passió segons sant Joan, de Bach (versió escenificada) · Amb l’Orquestra Simfònica Segle XXI, sota la direcció de Salvador Brotons i l’escenificació d’Òpera Popular de Barcelona dirigida per Jaume Villanueva. Una proposta commovedora on el cor actua i representa les escenes de la Passió, amb l’opció d’integrar-hi un cor local en els corals de reflexió.',
    precioMin: 25000,
    precioMax: 25000,
    dossier: d({
      titulo: 'PASIÓN SEGÚN SAN JUAN · Johann Sebastian Bach',
      subtitulo: 'Versión escenificada · Dirección musical: Salvador Brotons · Escenificación: Jaume Villanueva',
      descripcion:
        'La Pasión de Bach, interpretada por la Orquesta Sinfónica Siglo XXI y escenificada por el equipo artístico de Ópera Popular de Barcelona, concebida como una experiencia teatral y espiritual de gran intensidad (ideal para ciclos de Semana Santa y festivales de música sacra).\n\nEn esta propuesta, el coro no se limita a leer la partitura: actúa, representa las escenas de la Pasión y da vida al pueblo y a la turba, y entre sus integrantes emergen los solistas. Asimismo, el montaje ofrece la posibilidad de integrar un coro local, situado en un lateral del escenario y con partitura, para interpretar los corales de reflexión y meditación junto al público.',
      disponibilidad: 'Año 2028 (especial disponibilidad para Semana Santa).',
      precio: 'Caché por función: 25.000 €',
      resumen: 'Pasión según San Juan (Bach) | Versión escenificada · Dir. Salvador Brotons · Escena: Jaume Villanueva. Opción de coro local. | Año 2028 | 25.000 €',
    }),
  },
  {
    patron: /integral de brahms/i,
    es: 'Integral de la música de cámara de Johannes Brahms · Un proyecto monumental que reúne las 23 obras de cámara del compositor en diez conciertos, con total flexibilidad para programar el ciclo completo o contratar una selección a medida de vuestro espacio.',
    ca: 'Integral de la música de cambra de Johannes Brahms · Un projecte monumental que reuneix les 23 obres de cambra del compositor en deu concerts, amb total flexibilitat per programar el cicle complet o contractar-ne una selecció a mida del vostre espai.',
    precioMin: 2000,
    precioMax: 50000,
    dossier: d({
      titulo: 'INTEGRAL DE LA MÚSICA DE CÁMARA DE BRAHMS',
      subtitulo: 'Ciclo completo (10 conciertos) o programas sueltos',
      descripcion:
        'Un recorrido exhaustivo y apasionante por las 23 obras de cámara de Johannes Brahms, estructurado en un ciclo de diez conciertos que abarca desde sus dúos y tríos hasta sus cuartetos, quintetos y sextetos con piano, cuerda y viento.\n\nLa propuesta está diseñada con total versatilidad: puede programarse como el gran eje temático de una o dos temporadas (el ciclo completo) o bien contratar una selección de conciertos sueltos adaptados al presupuesto y al perfil de cada sala.',
      disponibilidad: 'Temporadas 2027 y 2028.',
      precio: 'Ciclo completo (10 conciertos): 50.000 €\nConciertos sueltos: 1.000 € por músico y concierto.',
      resumen: 'Integral de cámara de Brahms | Formaciones variables · Las 23 obras en 10 conciertos | 2027 y 2028 | 50.000 € (ciclo completo) ¹',
      nota: '¹ Posibilidad de contratar conciertos sueltos a razón de 1.000 € por músico y concierto.',
    }),
  },
  {
    patron: /d[uú]o (aidos|de violonchelo y piano)/i,
    es: 'Dúo Aidos · Romanticismo alemán · Con Clàudia Romaní (violonchelo) y Rocío Sevares (piano). Un viaje cálido e íntimo por las grandes sonatas de Brahms, Mendelssohn y Schumann, en un formato ágil y muy accesible.',
    ca: 'Duo Aidos · Romanticisme alemany · Amb Clàudia Romaní (violoncel) i Rocío Sevares (piano). Un viatge càlid i íntim per les grans sonates de Brahms, Mendelssohn i Schumann, en un format àgil i molt accessible.',
    precioMin: 2000,
    precioMax: 2000,
    dossier: d({
      titulo: 'DÚO AIDOS · Violonchelo y piano',
      subtitulo: 'Romanticismo alemán: Brahms, Mendelssohn y Schumann',
      equipo: 'Clàudia Romaní, violonchelo · Rocío Sevares, piano',
      descripcion:
        'Un viaje por el corazón del romanticismo alemán del siglo XIX a través de tres de sus voces más expresivas y complementarias: la profundidad arquitectónica de Brahms, la elegancia lírica de Mendelssohn y el impulso poético de Schumann.\n\nUn programa íntimo, cálido y de gran riqueza sonora en un formato ágil y cercano, ideal para salas de cámara, museos, ateneos, ciclos y festivales de formato reducido.',
      disponibilidad: 'Años 2027 y 2028.',
      precio: 'Caché por concierto: 2.000 €',
      resumen: 'Dúo Aidos | Violonchelo y piano · Brahms, Mendelssohn y Schumann | 2027 y 2028 | 2.000 € (por concierto)',
    }),
  },
  {
    patron: /crossroads/i,
    es: 'THE CROSSROADS · Una odisea sonora · Un cruce de caminos hecho trencadís, al modo de Gaudí: Bach, Beethoven, canción popular, jazz, blues y rock ensamblados en una sola noche de 90 minutos que culmina con todo el auditorio cantando The Wall, de Pink Floyd.',
    ca: 'THE CROSSROADS · Una odissea sonora · Un encreuament de camins fet trencadís, a la manera de Gaudí: Bach, Beethoven, cançó popular, jazz, blues i rock acoblats en una sola nit de 90 minuts que culmina amb tot l’auditori cantant The Wall, de Pink Floyd.',
    precioMin: 7500,
    precioMax: 7500,
    dossier: d({
      titulo: 'THE CROSSROADS · Una odisea sonora',
      etiqueta: 'Nuevo espectáculo musical',
      subtitulo: 'Un cruce de caminos donde nos encontramos todos',
      descripcion:
        'Nadie se pregunta si se puede disfrutar a la vez de un Goya y de un Picasso en una tarde de museo, ni si las esculturas de Bernini desmerecen junto a la Venus de Milo. Con la música, en cambio, compartimentamos. Unos van a la ópera, otros a bailar, otros a la intimidad de la música de cámara. Casi nunca coinciden. Es una lástima, porque la buena música ha existido en todas las épocas y en todos los estilos.\n\nTHE CROSSROADS nace para reunirlos. Como en el trencadís de Gaudí, piezas de distinto origen, bien elegidas, componen una imagen mayor que cualquiera de ellas: de Bach, Beethoven y Brahms a Casta Diva, de Bellini; de la canción popular, el folk, el jazz y el blues, al rock de todos los tiempos.\n\nNo es una suma de estilos, sino un mismo hilo: la búsqueda de la belleza, la justicia y la libertad. Fidelio exalta la libertad, como Oh Freedom, el espiritual que Joan Baez cantó al abrir el programa musical de la Marcha de Martin Luther King sobre Washington en el año 1963. El blues y los espirituales expresan el quejío y el deseo de libertad; Bach pone el orden y la armonía que lo sostienen todo.\n\nEl nombre —Crossroads— recoge la leyenda del blues: el cruce de caminos donde, según cuenta la leyenda, Robert Johnson encontró su música. Eric Clapton y Sheryl Crow la han recogido también en Crossroads.\n\nTerminamos la fiesta con The Wall, derribando el muro, con todo el auditorio y, si lo deseáis, un coro local, que lo interpreta. Quien viene por el rock descubre a Bach. Quien viene por la ópera acaba cantando un himno de Pink Floyd. Cada público se lleva a casa un formato que no conocía. Una función que se recuerda, ideal para conmemoraciones, inauguraciones o clausuras de temporada.',
      fichaTecnica:
        'Músicos en escena: 15, con coro local opcional.\nDuración: 90 minutos de música, sin pausa.\nMontaje, juego de luces y prueba de sonido: 3 horas.\nSonido: equipo estándar del teatro; opcionalmente, podemos aportar el nuestro.\nAforo: válido para todo tipo de aforos.',
      precio: 'Caché por función: 7.500 €',
      resumen: 'The Crossroads | Odisea sonora de Bach al rock, 90 min (15 músicos) | 2027 y 2028 | 7.500 €',
    }),
  },
  {
    patron: /athrodeel/i,
    es: 'Athrodeel · Fusión · Liderado por la soprano siria Aseel Massoud (premio InterContinental Music Awards 2025), un dúo estable de voz y guitarra con violonchelista invitado que une Oriente Medio, flamenco y Mediterráneo.',
    ca: 'Athrodeel · Fusió · Liderat per la soprano siriana Aseel Massoud (premi InterContinental Music Awards 2025), un duo estable de veu i guitarra amb violoncel·lista convidat que uneix l’Orient Mitjà, el flamenc i la Mediterrània.',
    precioMin: 2500,
    precioMax: 2500,
    dossier: d({
      titulo: 'ATHRODEEL · Música, Memoria y Mediterráneo',
      etiqueta: 'Fusión',
      equipo: 'Aseel Massoud, soprano',
      descripcion:
        'La soprano siria Aseel Massoud, formada en canto clásico y operístico, lidera Athrodeel, un dúo estable de voz y guitarra que para esta propuesta incorpora un violonchelista invitado. Une las tradiciones vocales de Oriente Medio con el flamenco, la guitarra clásica y la música mediterránea, y habla de memoria, desarraigo y pertenencia.\n\nEn 2025 recibió un premio InterContinental Music Awards, en la categoría de fusión, por su composición Refugee. Aseel Massoud es también médica y musicoterapeuta: canta para comunicar, no para impresionar. Ha interpretado a Violetta en La Traviata de Ópera Popular de Barcelona en el Palau de la Música.',
      precio: 'Caché por función: 2.500 €',
      resumen: 'Athrodeel | Fusión Oriente Medio y flamenco (dúo + violonchelo invitado) | 2027 y 2028 | 2.500 €',
    }),
  },
  {
    patron: /historia del rock/i,
    es: 'Historia del rock · Los grandes clásicos, con opción de invitar a corales locales para el cierre.',
    ca: 'Història del rock · Els grans clàssics, amb l’opció de convidar corals locals per al tancament.',
    precioMin: 3000,
    precioMax: 3000,
    dossier: d({
      titulo: 'HISTORIA DEL ROCK · Los grandes clásicos',
      etiqueta: 'Jazz y rock clásico',
      descripcion:
        'Beatles, Rolling Stones, Joe Cocker, Eric Clapton, The Band, Janis Joplin, Al Green y Fleetwood Mac. El concierto arranca potente, pasa por el rock y el soul, las raíces americanas y un momento íntimo, y culmina en una subida emocional final.\n\nSolemos invitar a agrupaciones corales amateurs locales a acompañar dos o tres temas en el escenario, en especial The Wall, de Pink Floyd.',
      precio: 'Caché: 3.000 €',
      resumen: 'Historia del rock | Grandes clásicos del rock y el soul (opción coro local) | 2027 y 2028 | 3.000 €',
    }),
  },
  {
    patron: /creedence/i,
    es: 'Tributo a Creedence Clearwater Revival · Rock clásico americano, directo y festivo.',
    ca: 'Tribut a Creedence Clearwater Revival · Rock clàssic americà, directe i festiu.',
    precioMin: 3000,
    precioMax: 3000,
    dossier: d({
      titulo: 'TRIBUTO A CREEDENCE CLEARWATER REVIVAL',
      etiqueta: 'Jazz y rock clásico',
      subtitulo: 'Rock clásico',
      descripcion:
        'Los grandes éxitos de Creedence Clearwater Revival, a cargo de una banda con veinte años de trayectoria, con la energía y el sonido que convirtieron a la banda original en una referencia del rock americano. Una propuesta directa y reconocible, ideal para públicos intergeneracionales.',
      precio: 'Caché: 3.000 €',
      resumen: 'Tributo a Creedence | Rock clásico americano, directo y festivo | 2027 y 2028 | 3.000 €',
    }),
  },
  {
    patron: /ella fitzgerald/i,
    es: 'Homenaje a Ella Fitzgerald · Swingologie Trio & Gemma Abrié.',
    ca: 'Homenatge a Ella Fitzgerald · Swingologie Trio & Gemma Abrié.',
    precioMin: 3000,
    precioMax: 3000,
    dossier: d({
      titulo: 'HOMENAJE A ELLA FITZGERALD',
      etiqueta: 'Jazz y rock clásico',
      subtitulo: 'Swingologie Trio & Gemma Abrié',
      descripcion:
        'Piano, contrabajo y guitarra acompañan a Gemma Abrié en el universo de Ella Fitzgerald, con sus encuentros con Oscar Peterson y anécdotas que sitúan al público en la edad de oro del swing. Para teatros, salas pequeñas y festivales. Pueden actuar en acústico.',
      precio: 'Caché: 3.000 €',
      resumen: 'Homenaje a Ella Fitzgerald | Swing vocal y jazz de cámara (trío y cantante) | 2027 y 2028 | 3.000 €',
    }),
  },
  {
    patron: /goodman/i,
    es: 'Homenaje a Benny Goodman y Lionel Hampton · Sexteto de swing.',
    ca: 'Homenatge a Benny Goodman i Lionel Hampton · Sextet de swing.',
    precioMin: 3000,
    precioMax: 3000,
    dossier: d({
      titulo: 'HOMENAJE A BENNY GOODMAN Y LIONEL HAMPTON',
      etiqueta: 'Jazz y rock clásico',
      subtitulo: 'Sexteto de swing',
      descripcion:
        'El encuentro entre el clarinetista Benny Goodman y el vibrafonista Lionel Hampton, dos figuras esenciales de la edad dorada del swing. Clarinete, vibráfono, piano, guitarra, contrabajo y batería recuperan un repertorio de energía, elegancia y ritmo, y evocan el ambiente de los clubes y salones de baile.',
      precio: 'Caché: 3.000 €',
      resumen: 'Homenaje a Goodman y Hampton | Swing clásico con clarinete y vibráfono (sexteto) | 2027 y 2028 | 3.000 €',
    }),
  },
  {
    patron: /oriol roman[ií]/i,
    es: 'Oriol Romaní & Friends · Formación de jazz tradicional de Nueva Orleans, blues, espirituales y swing.',
    ca: 'Oriol Romaní & Friends · Formació de jazz tradicional de Nova Orleans, blues, espirituals i swing.',
    precioMin: 3000,
    precioMax: 3000,
    dossier: d({
      titulo: 'ORIOL ROMANÍ & FRIENDS',
      etiqueta: 'Jazz y rock clásico',
      subtitulo: 'Sexteto de jazz',
      descripcion:
        'El alma del jazz clásico, de la mano del clarinetista barcelonés Oriol Romaní, uno de los grandes divulgadores del swing y el jazz tradicional en Cataluña y Europa.\n\nSeis músicos, con miembros de La Locomotora Negra, y décadas de escenarios compartidos, recorren Nueva Orleans, el swing de los años 30 y 40, el blues y los espirituales, con repertorio de Armstrong, Bechet, Ellington y Fats Waller. Elegancia, improvisación fresca y breves explicaciones que acercan cada tema al público. Una propuesta cálida y accesible, tanto para aficionados como para público familiar.',
      precio: 'Caché: 3.000 €',
      resumen: 'Oriol Romaní & Friends | Jazz clásico de Nueva Orleans y swing (sexteto) | 2027 y 2028 | 3.000 €',
    }),
  },
  {
    patron: /a[ñn]o nuevo|any nou|valses vieneses/i,
    es: 'Concierto de Valses Vieneses para el Año Nuevo, en dos formatos:\n- Formato sinfónico · Con la Orquesta Sinfónica Siglo XXI, soprano solista y narrador, bajo la dirección de Francesc Minguella.\n- Formato de cámara · Con el Cuarteto Calders (dos violines, viola y violonchelo) y la soprano Aseel Massoud.',
    ca: 'Concert de Valsos Vienesos per a l’Any Nou, en dos formats:\n- Format simfònic · Amb l’Orquestra Simfònica Segle XXI, soprano solista i narrador, sota la direcció de Francesc Minguella.\n- Format de cambra · Amb el Quartet Calders (dos violins, viola i violoncel) i la soprano Aseel Massoud.',
    precioMin: 2500,
    precioMax: 15000,
    dossier: d({
      titulo: 'CONCIERTO DE AÑO NUEVO · Al estilo del 1 de enero vienés',
      subtitulo: 'Del 15 de diciembre al 15 de enero de cada año',
      descripcion:
        'Empezar o despedir el año como se hace en Viena: un programa festivo, elegante y participativo con los grandes valses, polcas y marchas de la familia Strauss, célebres melodías de La viuda alegre, de Franz Lehár, y una cuidada selección de villancicos para disfrutar en familia y con todos los públicos.\n\nLa producción se ofrece en dos formatos totalmente autónomos para ajustarse a las dimensiones y el presupuesto de cada espacio.\n\n### Formato 1 · Gran formato sinfónico\n\nIntérpretes: Orquesta Sinfónica Siglo XXI, soprano solista y narrador. Dirección: Francesc Minguella.\n\nIdeal para: auditorios, grandes teatros y conciertos institucionales de Navidad o Año Nuevo.\n\n### Programa · Primera parte\n\nI. La tradición vienesa y el lirismo\n• J. Strauss II: Obertura de Die Fledermaus (El murciélago). Iniciamos el concierto, como manda la tradición, con la vibrante obertura de esta célebre opereta.\n• J. Strauss II: Annen Polka. Una pequeña joya llena de elegancia y vitalidad.\n• J. Strauss II: «Mein Herr Marquis» (de Die Fledermaus), con la soprano Aseel Massoud. Primera intervención de la soprano, con la picante y célebre aria de opereta.\n• V. Bellini: «Casta Diva» (de Norma), con la soprano Aseel Massoud. Uno de los momentos más sublimes y celebrados de toda la historia de la ópera.\n• J. Strauss II: Tritsch-Tratsch Polka. La orquesta retoma el protagonismo con esta danza juguetona y festiva.\n\nII. Raíces, tradición catalana y mensaje de paz\n• S. Brotons: Villancicos catalanes para orquesta. Un arreglo brillante y festivo que nos adentra plenamente en el bloque dedicado a nuestras raíces.\n• Tradicional / X. Montsalvatge: «El cant dels ocells», con la soprano Aseel Massoud y Mariona Camats al violonchelo. Uno de los momentos más intensos y conmovedores del concierto, en una preciosa versión para voz, violonchelo y orquesta.\n• J. Ribas: «Rosó» (Pel teu amor). La interpretación de esta emblemática canción catalana a cargo de la voz solista.\n\n### Programa · Segunda parte\n\nIII. Valses y apoteosis festiva\n• J. Strauss II: Frühlingsstimmen (Voces de primavera), con la soprano Aseel Massoud. Última intervención de la soprano, con un vals virtuoso, exultante y exuberante.\n• J. Brahms: Danza húngara n.º 5. Ritmo, carácter y energía para abrir la recta final del concierto.\n• J. Strauss II: El Danubio azul. El vals por excelencia del 1 de enero, indispensable y majestuoso.\n• J. Strauss I: Marcha Radetzky. El broche festivo y participativo por excelencia.\n\n### Formato 2 · Formato de cámara\n\nIntérpretes: Cuarteto Calders (dos violines, viola y violonchelo) junto a la soprano Aseel Massoud.\n\nIdeal para: teatros municipales, salas de cámara, iglesias, centros cívicos y ciclos navideños de proximidad.',
      disponibilidad: 'Del 15 de diciembre al 15 de enero de cada año.',
      precio: 'Formato sinfónico: 15.000 € por función\nFormato de cámara: 2.500 € por función',
      resumen:
        'Concierto de Año Nuevo · Cámara | Cuarteto Calders + soprano Aseel Massoud | Del 15 dic. al 15 ene. | 2.500 €\nConcierto de Año Nuevo · Sinfónico | Orquesta Sinfónica Siglo XXI + soprano y narrador (Dir. F. Minguella) | Del 15 dic. al 15 ene. | 15.000 €',
    }),
  },
];

/** Producciones de las cartas que aún no están en arsvia.org: se crean en el catálogo (una vez). */
export const FICHAS_NUEVAS_ARSVIA: Omit<Espectaculo, 'id'>[] = [
  {
    nombre: 'The Crossroads · Una odisea sonora',
    tipo: 'fusion',
    formato: '15 músicos en escena, con coro local opcional. 90 minutos de música, sin pausa.',
    requisitos: 'Montaje, juego de luces y prueba de sonido: 3 horas. Sonido: equipo estándar del teatro; opcionalmente, podemos aportar el nuestro. Válido para todo tipo de aforos.',
    precioMin: 7500,
    precioMax: 7500,
    disponibilidad: '2027 y 2028',
    fechasCerradas: '',
    ambito: '',
    enlace: '',
    estadoInfo: 'vigente',
    revisado: null,
    origen: 'arsvia-cartas#1',
  },
];

/** Del catálogo de arsvia.org, las que Joan no ofrece en sus cartas de ahora (siguen en el catálogo). */
export const FUERA_DE_CARTAS_ARSVIA: RegExp[] = [/professor cunningham/i, /barcelona jazz orquesta/i, /simfon[ií]a n[uú]m\.? ?2|sinfon[ií]a n[uú]m\.? ?2/i, /viajes sonoros/i];

/** Textos de las cartas de preajustes anteriores: una ficha con uno de estos aún no lo ha cambiado su dueño. */
export const TEXTOS_ANTERIORES_ARSVIA: string[] = [
  'Formato sinfónico · Con la Orquesta Sinfónica Siglo XXI, soprano solista y narrador, bajo la dirección de Francesc Minguella.\nFormato de cámara · Con el Cuarteto Calders (dos violines, viola y violonchelo) y la soprano Aseel Massoud.',
  'Format simfònic · Amb l’Orquestra Simfònica Segle XXI, soprano solista i narrador, sota la direcció de Francesc Minguella.\nFormat de cambra · Amb el Quartet Calders (dos violins, viola i violoncel) i la soprano Aseel Massoud.',
  "Fidelio, de Beethoven. Producción operística con un lenguaje escénico contemporáneo, austero y de gran densidad dramática. Dirección musical de Salvador Brotons y dirección escénica de Jaume Villanueva. Temporada 2027 · Bicentenario de Beethoven. Disponibilidad de gira: a partir del último trimestre de 2027, con posibilidad de estudiar otras fechas según calendario.",
  "Fidelio, de Beethoven. Producció operística amb un llenguatge escènic contemporani, auster i de gran densitat dramàtica. Direcció musical de Salvador Brotons i direcció escènica de Jaume Villanueva. Temporada 2027 · Bicentenari de Beethoven. Disponibilitat de gira: a partir de l’últim trimestre de 2027, amb possibilitat d’estudiar altres dates segons calendari.",
  "Ein deutsches Requiem (Un réquiem alemán), de Brahms. Gran producción sinfónico-coral bajo la dirección de Jordi Mora, discípulo directo de Sergiu Celibidache, al frente de la Orquestra Simfònica Segle XXI, junto a las formaciones corales participantes. Disponibilidad de gira: a partir de julio de 2027.",
  "Ein deutsches Requiem (Un rèquiem alemany), de Brahms. Gran producció simfònico-coral sota la direcció de Jordi Mora, deixeble directe de Sergiu Celibidache, al capdavant de l’Orquestra Simfònica Segle XXI, juntament amb les formacions corals participants. Disponibilitat de gira: a partir de juliol de 2027.",
  "Pasión según San Juan, de Bach. Temporada 2028. Proyecto escénico que reúne a la Orquestra Simfònica Segle XXI, bajo la dirección musical de Salvador Brotons, con coro, solistas y equipo escénico de Òpera Popular de Barcelona.",
  "Passió segons sant Joan, de Bach. Temporada 2028. Projecte escènic que reuneix l’Orquestra Simfònica Segle XXI, sota la direcció musical de Salvador Brotons, amb cor, solistes i equip escènic d’Òpera Popular de Barcelona.",
  "La flauta mágica, de Mozart. Temporada 2028. Producción operística de repertorio, ágil y de amplio atractivo para públicos diversos, concebida para acercar la ópera a distintos tipos de teatros y auditorios.",
  "La flauta màgica, de Mozart. Temporada 2028. Producció operística de repertori, àgil i d’ampli atractiu per a públics diversos, concebuda per acostar l’òpera a diferents tipus de teatres i auditoris.",
  "Homenaje a Ella Fitzgerald y grandes damas del jazz. Un recorrido por el elegante repertorio de la «Primera Dama de la Canción» y los grandes estándares del Great American Songbook. Un espectáculo que combina virtuosismo vocal, arreglos cuidados y la calidez del jazz clásico, perfecto para noches de festival o veladas de gala en plazas y teatros.",
  "Homenatge a Ella Fitzgerald i grans dames del jazz. Un recorregut per l’elegant repertori de la «Primera Dama de la Cançó» i els grans estàndards del Great American Songbook. Un espectacle que combina virtuosisme vocal, arranjaments acurats i la calidesa del jazz clàssic, perfecte per a nits de festival o vetllades de gala en places i teatres.",
  "Tributo a Creedence Clearwater Revival. Un homenaje vibrante a la mítica banda de John Fogerty, que repasa los grandes himnos del swamp rock y el rock sureño de los 60 y 70 (Proud Mary, Bad Moon Rising, Have You Ever Seen the Rain, Fortunate Son). Una propuesta de sonido directo, potente y contagioso que conecta de forma inmediata con públicos intergeneracionales en escenarios de fiesta mayor y festivales.",
  "Tribut a Creedence Clearwater Revival. Un homenatge vibrant a la mítica banda de John Fogerty, que repassa els grans himnes del swamp rock i el rock sudista dels 60 i 70 (Proud Mary, Bad Moon Rising, Have You Ever Seen the Rain, Fortunate Son). Una proposta de so directe, potent i encomanadís que connecta de manera immediata amb públics intergeneracionals en escenaris de festa major i festivals.",
  "La Historia del Rock. Un espectáculo festivo que propone un viaje cronológico por las décadas doradas de la música moderna. A través de la interpretación de los temas más icónicos de la historia del rock, el concierto combina la potencia de la banda en directo con comentarios y contextualización de cada época, resultando ideal tanto para audiencias familiares como para grandes eventos al aire libre.",
  "La Història del Rock. Un espectacle festiu que proposa un viatge cronològic per les dècades daurades de la música moderna. A través de la interpretació dels temes més icònics de la història del rock, el concert combina la potència de la banda en directe amb comentaris i contextualització de cada època, i resulta ideal tant per a públics familiars com per a grans esdeveniments a l’aire lliure.",
];

// ---------- La lista de producciones, dentro de la plantilla de cada línea ----------
// La carta sale entera de las plantillas: la lista de cada línea se escribe ahí (como en las cartas de Joan) y no se
// toma de las fichas. Aquí se añade a la frase que la abre.

const LINEA_DE_PRODUCCION: [string, Linea][] = [
  ['flauta', 'opera'],
  ['fidelio', 'opera'],
  ['quiem', 'sinfonico'],
  ['pasi', 'sinfonico'],
  ['integral', 'camara'],
  ['aidos', 'camara'],
  ['crossroads', 'popular'],
  ['athrodeel', 'popular'],
  ['historia del rock', 'popular'],
  ['creedence', 'popular'],
  ['ella fitzgerald', 'popular'],
  ['goodman', 'popular'],
  ['oriol', 'popular'],
  ['valses vieneses', 'navidad'],
];

const comoVineta = (t: string) => {
  const [cabeza, ...resto] = t.split('\n').filter((x) => x.trim());
  return [`• ${cabeza}`, ...resto.map((x) => `   – ${x.replace(/^[-–•]\s*/, '')}`)].join('\n');
};

/** Textos de las líneas antes de llevar la lista dentro: si una cuenta los tiene guardados, se cambian por los nuevos. */
export const TEXTOS_LINEA_SIN_LISTA: { idioma: 'es' | 'ca'; linea: Linea; antes: string; ahora: string }[] = [];
for (const [idioma, lineas] of [
  ['es', LINEAS_ES],
  ['ca', LINEAS_CA],
] as const) {
  for (const l of Object.keys(lineas) as Linea[]) {
    const vinetas = TEXTOS_PRODUCCIONES_ARSVIA.filter((p) => LINEA_DE_PRODUCCION.find(([k]) => p.patron.source.includes(k))?.[1] === l).map((p) => comoVineta(p[idioma]));
    if (!vinetas.length) continue;
    const antes = lineas[l].texto;
    lineas[l].texto = `${antes}\n\n${vinetas.join('\n\n')}`;
    TEXTOS_LINEA_SIN_LISTA.push({ idioma, linea: l, antes, ahora: lineas[l].texto });
  }
}
