// Composición de las cartas por bloques, con las plantillas de cada cuenta (editables en el catálogo).
// Cada carta presenta una línea de programación (ópera, sinfónico-coral y sacra, cámara, jazz/rock/fusión o Navidad)
// con sus producciones y su dossier: saludo, presentación de la línea, lo que el sitio ha programado (dato público),
// quién escribe, la lista de producciones, el cierre que remite al dossier, la licitación abierta, las ayudas, la
// invitación de esa línea (si sigue vigente), las demás líneas en una frase, la propuesta de colaboración y la firma.
// El preajuste «ArsVia» (cartasArsvia.ts) reproduce las cartas modelo de Joan Romaní.

import type { AjustesCrm, Espectaculo, TipoEspectaculo } from './tipos.js';
import type { Estilo } from '../tipos.js';

export type Linea = 'opera' | 'sinfonico' | 'camara' | 'popular' | 'navidad';
export const LINEAS: Linea[] = ['opera', 'sinfonico', 'camara', 'popular', 'navidad'];
export const LINEA_DE_TIPO: Record<TipoEspectaculo, Linea> = {
  opera: 'opera',
  sinfonico_coral: 'sinfonico',
  religiosa: 'sinfonico',
  sinfonica: 'sinfonico',
  camara: 'camara',
  fusion: 'popular',
  jazz: 'popular',
  rock: 'popular',
  navidad: 'navidad',
  festivales: 'popular',
  otro: 'popular',
};
export const NOMBRE_LINEA: Record<'es' | 'ca', Record<Linea, string>> = {
  es: { opera: 'ópera', sinfonico: 'repertorio sinfónico-coral y sacro', camara: 'música de cámara', popular: 'jazz, rock y fusión', navidad: 'Navidad y Año Nuevo' },
  ca: { opera: 'òpera', sinfonico: 'repertori simfònico-coral i sacre', camara: 'música de cambra', popular: 'jazz, rock i fusió', navidad: 'Nadal i Any Nou' },
};

export interface TextoLinea {
  /** Nombre de la línea (en la app y en los correos que juntan varias). */
  titulo: string;
  /** Asunto propio de la línea; vacío, el asunto general. */
  asunto: string;
  /** Primer párrafo: qué se presenta y para quién; {lugar}. */
  intro: string;
  /** Quién escribe y en nombre de quién, y la frase que abre la lista; {remitente}. */
  texto: string;
  /** Después de la lista: lo que hay en el dossier; {web}. */
  cierre: string;
  /** Invitación a una función (vacía, no hay). Sale hasta el día `invitacionHasta` incluido (aaaa-mm-dd). */
  invitacion: string;
  invitacionHasta: string;
  /** Firma propia de la línea (otra alianza de producción); vacía, la de la cuenta. */
  firma: string;
  /** Dossier PDF de la línea: título, entidades, condiciones generales y nota final. */
  dossierTitulo: string;
  dossierSubtitulo: string;
  condiciones: string;
  notaFinal: string;
}

export interface TextosIdioma {
  saludo: string;
  /** Con la persona de contacto conocida; {persona} se sustituye. */
  saludoPersona: string;
  /** Lo que el sitio ha programado; {lugar} y {estilos}. */
  historial: string;
  /** Las demás líneas que le pueden encajar, en una frase; {lineas}. */
  otrasLineas: string;
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
  /** Despedida de los seguimientos. */
  despedidaBreve: string;
  /** Asunto general; {propuestas} y {lugar}. */
  asunto: string;
}

export interface PlantillasCarta {
  es: TextosIdioma;
  ca: TextosIdioma;
}

const linea = (titulo: string, intro: string, dossierTitulo: string): TextoLinea => ({
  titulo,
  asunto: '',
  intro,
  texto: '{producciones}',
  cierre: '',
  invitacion: '',
  invitacionHasta: '',
  firma: '',
  dossierTitulo,
  dossierSubtitulo: '',
  condiciones: '',
  notaFinal: '',
});

/** Textos neutros para cualquier cuenta (se pueden cambiar en el catálogo). */
export const PLANTILLAS_GENERICAS: PlantillasCarta = {
  es: {
    saludo: 'Buenos días,',
    saludoPersona: 'Estimado/a {persona}:',
    historial: 'Hemos visto que en {lugar} han programado {estilos} en los últimos años, por lo que creemos que estas propuestas pueden resultarle de interés.',
    otrasLineas: 'También tenemos propuestas de {lineas}; si le interesan, se las enviamos.',
    lineas: {
      opera: linea('Ópera', 'Le escribo en representación de {organizacion} para presentarle nuestras producciones de ópera para la programación de {lugar}.', 'Propuestas de ópera'),
      sinfonico: linea('Sinfónico-coral y sacra', 'Le escribo en representación de {organizacion} para presentarle nuestras propuestas sinfónico-corales y de música sacra para la programación de {lugar}.', 'Propuestas sinfónico-corales y sacras'),
      camara: linea('Música de cámara', 'Le escribo en representación de {organizacion} para presentarle nuestra línea de música de cámara para la programación de {lugar}.', 'Propuestas de música de cámara'),
      popular: linea('Jazz, rock y fusión', 'Le escribo en representación de {organizacion} para presentarle nuestras propuestas de jazz, rock y fusión para la programación de {lugar}.', 'Propuestas de jazz, rock y fusión'),
      navidad: linea('Navidad y Año Nuevo', 'Le escribo en representación de {organizacion} para presentarle nuestras propuestas para la programación de Navidad y Año Nuevo de {lugar}.', 'Propuestas de Navidad y Año Nuevo'),
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
    despedidaBreve: 'Atentamente,',
    asunto: 'Propuestas de {propuestas} para {lugar}',
  },
  ca: {
    saludo: 'Bon dia,',
    saludoPersona: 'Benvolgut/da {persona},',
    historial: 'Hem vist que a {lugar} han programat {estilos} en els darrers anys, per això creiem que aquestes propostes li poden interessar.',
    otrasLineas: 'També tenim propostes de {lineas}; si li interessen, les hi enviem.',
    lineas: {
      opera: linea('Òpera', 'Li escric en representació de {organizacion} per presentar-li les nostres produccions d’òpera per a la programació de {lugar}.', 'Propostes d’òpera'),
      sinfonico: linea('Simfònico-coral i sacra', 'Li escric en representació de {organizacion} per presentar-li les nostres propostes simfònico-corals i de música sacra per a la programació de {lugar}.', 'Propostes simfònico-corals i sacres'),
      camara: linea('Música de cambra', 'Li escric en representació de {organizacion} per presentar-li la nostra línia de música de cambra per a la programació de {lugar}.', 'Propostes de música de cambra'),
      popular: linea('Jazz, rock i fusió', 'Li escric en representació de {organizacion} per presentar-li les nostres propostes de jazz, rock i fusió per a la programació de {lugar}.', 'Propostes de jazz, rock i fusió'),
      navidad: linea('Nadal i Any Nou', 'Li escric en representació de {organizacion} per presentar-li les nostres propostes per a la programació de Nadal i Any Nou de {lugar}.', 'Propostes de Nadal i Any Nou'),
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
    despedidaBreve: 'Atentament,',
    asunto: 'Propostes de {propuestas} per a {lugar}',
  },
};

export { FIRMA_ARSVIA, PLANTILLAS_ARSVIA, TEXTOS_PRODUCCIONES_ARSVIA } from './cartasArsvia.js';
import { FIRMA_ARSVIA as FIRMA_MODELO, FIRMA_ARSVIA_CA as FIRMA_MODELO_CA, FIRMAS_ANTERIORES_ARSVIA, TEXTOS_LINEA_SIN_LISTA } from './cartasArsvia.js';

// ---------- Composición ----------

const NOMBRE_ESTILO: Record<'es' | 'ca', Record<Estilo, string>> = {
  es: { jazz: 'jazz', clasica: 'música clásica', opera: 'ópera' },
  ca: { jazz: 'jazz', clasica: 'música clàssica', opera: 'òpera' },
};

const lista = (xs: string[], y: string) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} ${y} ${xs.at(-1)}`);
export const rellenar = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
const fechaLarga = (iso: string | null, idioma: 'es' | 'ca') =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(idioma === 'ca' ? 'ca-ES' : 'es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : null;

type EspectaculoCarta = Pick<Espectaculo, 'id' | 'nombre' | 'tipo' | 'enlace' | 'textoCarta' | 'textoCartaCa'>;

export interface DatosComposicion {
  idioma: 'es' | 'ca';
  lugar: string;
  persona: string | null;
  /** Estilos que el sitio ha programado (contratos públicos), de más a menos. */
  historial: Estilo[];
  /** Producciones que se presentan; la carta presenta la línea principal (ver lineaPrincipal). */
  espectaculos: EspectaculoCarta[];
  /** Otras líneas que le pueden encajar (se nombran en una frase). Sin indicar, las de los demás espectáculos. */
  otrasLineas?: Linea[];
  licitaciones: { titulo: string; fin: string | null }[];
  ayudas: { titulo: string }[];
  gestion: boolean;
  ajustes: AjustesCrm;
  hoy?: Date;
}

/** Línea que presenta una carta: la que más producciones aporta; a igualdad, la del estilo que más programa el sitio. */
export function lineaPrincipal(espectaculos: Pick<Espectaculo, 'tipo'>[], historial: Estilo[] = []): Linea | null {
  const n = new Map<Linea, number>();
  for (const e of espectaculos) n.set(LINEA_DE_TIPO[e.tipo], (n.get(LINEA_DE_TIPO[e.tipo]) ?? 0) + 1);
  const deEstilo = (l: Linea) => {
    const i = historial.findIndex((e) => (e === 'opera' ? l === 'opera' : e === 'jazz' ? l === 'popular' : l === 'sinfonico' || l === 'camara'));
    return i < 0 ? 9 : i;
  };
  const orden = [...n.keys()].sort((a, b) => n.get(b)! - n.get(a)! || deEstilo(a) - deEstilo(b) || LINEAS.indexOf(a) - LINEAS.indexOf(b));
  return orden[0] ?? null;
}

/** Completa unas plantillas guardadas con las genéricas (textos que falten o secciones añadidas después). */
export function completarPlantillas(x: unknown): PlantillasCarta {
  const completar = (v: unknown, base: unknown): unknown => {
    if (typeof base === 'string') return typeof v === 'string' ? v.slice(0, 8000) : base;
    if (Array.isArray(base)) return base.map((b, i) => completar(Array.isArray(v) ? v[i] : undefined, b));
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(base as Record<string, unknown>).map(([k, b]) => [k, completar(o[k], b)]));
  };
  // Las plantillas de antes tenían una sola línea «lirica» (ópera y sinfónico-coral juntos): sirve para las dos.
  const migrar = (t: unknown) => {
    const o = t && typeof t === 'object' ? (t as Record<string, unknown>) : null;
    const ls = o?.lineas && typeof o.lineas === 'object' ? (o.lineas as Record<string, unknown>) : null;
    if (!o || !ls?.lirica) return t;
    const { lirica, ...resto } = ls;
    return { ...o, lineas: { opera: lirica, sinfonico: lirica, ...resto } };
  };
  const y = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const t = completar({ es: migrar(y.es), ca: migrar(y.ca) }, PLANTILLAS_GENERICAS) as PlantillasCarta;
  // Las cartas modelo de ArsVia ya llevan la lista de producciones dentro del texto de cada línea.
  // Y los títulos en catalán de las líneas catalanas.
  for (const m of TEXTOS_LINEA_SIN_LISTA) {
    const o = (m.linea ? t[m.idioma].lineas[m.linea] : t[m.idioma]) as unknown as Record<string, unknown>;
    if (o[m.campo] === m.antes) o[m.campo] = m.ahora;
  }
  return t;
}

export function plantillasDe(a: AjustesCrm): PlantillasCarta {
  return a.plantillas ? completarPlantillas(a.plantillas) : PLANTILLAS_GENERICAS;
}

export function firmaCarta(a: AjustesCrm, idioma: 'es' | 'ca'): string {
  if (idioma === 'ca' && a.firmaCa?.trim()) return a.firmaCa.trim();
  if (a.firma.trim()) return a.firma.trim();
  const lineas = [a.remitente, a.cargo, a.organizacion, a.telefono, a.email, a.web].filter((x) => x?.trim());
  return lineas.length ? lineas.join('\n') : idioma === 'ca' ? '[La teva signatura]' : '[Tu firma]';
}

/** Segundos nombres habituales: «Juan Ignacio», «María José», «Josep Maria»... van juntos en el saludo. */
const SEGUNDOS = new Set(
  'josé jose josep maría maria mª carmen luis lluís lluis carlos carles antonio antoni manuel jesús jesus pilar ángel angel ángeles angeles isabel teresa dolores rosa elena francisco francesc javier xavier miguel ignacio ramón ramon vicente vicent pablo eugenia victoria cristina belén belen lourdes mercedes montserrat'.split(' '),
);

/**
 * El nombre de pila para el saludo («Hola, Nuria:»), sin apellidos ni tratamientos: «Nuria Escamilla Belizón» → «Nuria»,
 * «Juan Ignacio Trelis Sempere» → «Juan Ignacio», «María del Mar López» → «María del Mar», «López García, Ana» → «Ana».
 */
export function nombrePila(nombre: string | null | undefined): string {
  let n = (nombre ?? '').replace(/\([^)]*\)/g, ' ').trim();
  if (n.includes(',')) n = n.split(',').slice(1).join(' ').trim() || n.split(',')[0]!.trim();
  const t = n
    .split(/\s+/)
    .filter(Boolean)
    .filter((x, i) => !(i === 0 && /^(d\.?|dña\.?|dª|don|doña|sr\.?|sra\.?|excmo\.?|excma\.?|ilmo\.?|ilma\.?)$/i.test(x)));
  if (t.length <= 2) return t[0] ?? '';
  const [a, b, c, d] = t as [string, string, string, string | undefined];
  if (/^(del|de)$/i.test(b) && t.length >= 4) return /^(los|las|la)$/i.test(c) && d && t.length >= 5 ? `${a} ${b} ${c} ${d}` : `${a} ${b} ${c}`;
  // «Jana Vicente i Marqués»: tras una «i» o «y» vienen apellidos, así que el segundo también lo es.
  if (SEGUNDOS.has(b.toLowerCase()) && !/^(i|y)$/i.test(c)) return `${a} ${b}`;
  return a;
}

/** El título del primer correo (el de su línea): «Propuestas de Ópera Escenificada · Temporadas 2027 y 2028». */
export function tituloCorreo(espectaculos: Pick<Espectaculo, 'tipo'>[], idioma: 'es' | 'ca', a: AjustesCrm): string | null {
  const l = lineaPrincipal(espectaculos);
  if (!l) return null;
  const t = plantillasDe(a)[idioma].lineas[l];
  return t.dossierTitulo.trim() || t.titulo.trim() || null;
}

/** La invitación de la línea, si la hay y sigue vigente. */
export function invitacionVigente(t: TextoLinea, hoy = new Date()): string | null {
  if (!t.invitacion.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t.invitacionHasta) && hoy.toISOString().slice(0, 10) > t.invitacionHasta) return null;
  return t.invitacion.trim();
}

/**
 * La firma de una línea (otra alianza de producción) solo sustituye a la de la cuenta si esta no es propia: vacía o la
 * de las cartas modelo. Quien ha escrito su firma la ve en todos los correos.
 */
function firmaDeLinea(tl: TextoLinea | null, a: AjustesCrm, idioma: 'es' | 'ca'): string {
  // En catalán, la firma en catalán de la cuenta si es propia; si no, la de la línea (en catalán).
  if (idioma === 'ca') {
    const ca = a.firmaCa?.trim();
    if (ca && ca !== FIRMA_MODELO_CA.trim()) return ca;
    return tl?.firma.trim() || ca || firmaCarta(a, idioma);
  }
  const propia = a.firma.trim() && a.firma.trim() !== FIRMA_MODELO.trim() && !FIRMAS_ANTERIORES_ARSVIA.includes(a.firma.trim());
  return (!propia && tl?.firma.trim()) || firmaCarta(a, idioma);
}

/** Primera carta: presenta una línea con sus producciones; las demás líneas que encajan, en una frase. */
export function componerCarta(d: DatosComposicion): { asunto: string; cuerpo: string; linea: Linea | null } {
  const t = plantillasDe(d.ajustes)[d.idioma];
  const v = {
    lugar: d.lugar,
    organizacion: d.ajustes.organizacion || 'nuestra compañía',
    persona: nombrePila(d.persona),
    remitente: d.ajustes.remitente || d.ajustes.organizacion || '',
    web: d.ajustes.web || '',
  };
  const y = d.idioma === 'ca' ? 'i' : 'y';
  const principal = lineaPrincipal(d.espectaculos, d.historial);
  const deLinea = d.espectaculos.filter((e) => principal && LINEA_DE_TIPO[e.tipo] === principal);
  const otras = (d.otrasLineas ?? [...new Set(d.espectaculos.map((e) => LINEA_DE_TIPO[e.tipo]))]).filter((l) => l !== principal);
  const tl = principal ? t.lineas[principal] : null;
  const p: string[] = [v.persona ? rellenar(t.saludoPersona, v) : t.saludo];
  if (tl?.intro.trim()) p.push(rellenar(tl.intro, v));
  if (d.historial.length && t.historial.trim()) p.push(rellenar(t.historial, { ...v, estilos: lista(d.historial.map((e) => NOMBRE_ESTILO[d.idioma][e]), y) }));
  // El texto de la línea es el de la plantilla tal cual (con su lista de producciones escrita ahí). Con {producciones},
  // la app pone los nombres de las de esta línea que encajan con el sitio.
  const producciones = deLinea.map((e) => `• ${e.nombre}`).join('\n');
  if (tl?.texto.trim()) p.push(rellenar(tl.texto, { ...v, producciones }));
  if (tl?.cierre.trim()) p.push(rellenar(tl.cierre, v));
  for (const l of d.licitaciones.slice(0, 1)) {
    const f = fechaLarga(l.fin, d.idioma);
    p.push(rellenar(t.licitacion, { ...v, titulo: l.titulo, fecha: f ? (d.idioma === 'ca' ? ` (ofertes fins al ${f})` : ` (ofertas hasta el ${f})`) : '' }));
  }
  if (d.ayudas.length) {
    const nombres = lista(
      d.ayudas.slice(0, 2).map((a) => `«${a.titulo}»`),
      y,
    );
    const convocatorias = d.idioma === 'ca' ? `${d.ayudas.length > 1 ? 'les convocatòries' : 'la convocatòria'} ${nombres},` : `${d.ayudas.length > 1 ? 'las convocatorias' : 'la convocatoria'} ${nombres},`;
    p.push(rellenar(t.ayudas, { ...v, convocatorias }));
  }
  const invitacion = tl ? invitacionVigente(tl, d.hoy) : null;
  // La invitación va en un solo bloque (sus párrafos, en líneas seguidas): en el correo sale entera en un recuadro.
  if (invitacion) p.push(rellenar(invitacion, v).replace(/\n\s*\n/g, '\n'));
  if (d.gestion) p.push(rellenar(t.gestion, v));
  if (otras.length && t.otrasLineas.trim()) p.push(rellenar(t.otrasLineas, { ...v, lineas: lista(otras.map((l) => NOMBRE_LINEA[d.idioma][l]), y) }));
  if (t.colaboracion.trim()) p.push(rellenar(t.colaboracion, v));
  p.push(`${rellenar(t.despedida, v)}\n\n${firmaDeLinea(tl, d.ajustes, d.idioma)}`);
  const general = rellenar(t.asunto, { ...v, propuestas: principal ? NOMBRE_LINEA[d.idioma][principal] : d.idioma === 'ca' ? 'programació' : 'programación' });
  return { asunto: tl?.asunto.trim() ? rellenar(tl.asunto, v) : general, cuerpo: p.join('\n\n'), linea: principal };
}

/** Seguimientos (2.º a 5.º): breves, con el saludo y la firma de la cuenta (la de la línea, si la tiene). */
export function componerSeguimiento(
  paso: number,
  d: Pick<DatosComposicion, 'idioma' | 'lugar' | 'persona' | 'ajustes'> & { linea?: Linea | null },
  asuntoInicial: string,
): { asunto: string; cuerpo: string } {
  const t = plantillasDe(d.ajustes)[d.idioma];
  const v = { lugar: d.lugar, organizacion: d.ajustes.organizacion, persona: nombrePila(d.persona) };
  const texto = t.seguimientos[Math.min(Math.max(paso - 2, 0), 3)]!;
  const firma = firmaDeLinea(d.linea ? t.lineas[d.linea] : null, d.ajustes, d.idioma);
  return {
    asunto: `Re: ${asuntoInicial}`,
    cuerpo: [v.persona ? rellenar(t.saludoPersona, v) : t.saludo, rellenar(texto, v), `${t.despedidaBreve}\n\n${firma}`].join('\n\n'),
  };
}
