// Ejemplos para ver la web funcionando sin acceso a la BDNS. Se basan en ayudas
// reales de 2026 encontradas en prensa y boletines, pero NO vienen de la BDNS:
// solo se rellenan los datos que constan en la fuente enlazada (urlDetalle) y el
// resto queda a null. Se marcan con origen "demo" y la web lo avisa.

import { clasificar } from '../clasificacion/musica.js';
import type { Convocatoria } from '../tipos.js';

type Base = Omit<Convocatoria, 'clasificacion' | 'vistaPorPrimeraVez' | 'actualizada' | 'origen' | 'codigoBdns'>;

const base = {
  finalidad: null,
  tiposBeneficiario: [],
  presupuesto: null,
  fechaPublicacion: null,
  fechaInicioSolicitud: null,
  fechaFinSolicitud: null,
  abierta: null,
  urlBases: null,
  provincias: [],
} satisfies Partial<Base>;

const ejemplos: Base[] = [
  {
    ...base,
    id: 'demo-inaem-musica-lirica-2026',
    tipo: 'convocatoria',
    titulo: 'Ayudas a la música y a la lírica 2026 (INAEM)',
    organo: 'Instituto Nacional de las Artes Escénicas y de la Música',
    organoNiveles: ['ESTADO', 'MINISTERIO DE CULTURA', 'INSTITUTO NACIONAL DE LAS ARTES ESCÉNICAS Y DE LA MÚSICA'],
    administracion: 'estatal',
    ccaa: [],
    fechaPublicacion: '2026-03-26',
    urlDetalle: 'https://www.recursosculturales.com/inaem-ayudas-musica-lirica-danza/',
    texto:
      'Ayudas a la música y a la lírica correspondientes a 2026. En la convocatoria de 2025 financiaban giras nacionales e internacionales, giras de coproducciones interautonómicas, festivales y temporadas líricas, residencias artísticas de lírica y música y encargos de composición vinculados a estreno.',
  },
  {
    ...base,
    id: 'demo-andalucia-musica-en-vivo-2026',
    tipo: 'convocatoria',
    titulo: 'Ayudas a la promoción de la música en vivo en Andalucía 2026',
    organo: 'Junta de Andalucía',
    organoNiveles: ['ANDALUCÍA'],
    administracion: 'autonomica',
    ccaa: ['Andalucía'],
    urlDetalle:
      'https://www.juntadeandalucia.es/sites/default/files/inline-files/2026/05/promo_musica_2026_extracto.pdf',
    texto:
      'Ayudas a la música en vivo: eventos culturales de exhibición de conciertos y espectáculos de música en vivo en formato de ferias, festivales o ciclos celebrados en Andalucía.',
  },
  {
    ...base,
    id: 'demo-castellon-ciclos-conciertos-2026',
    tipo: 'convocatoria',
    titulo: 'Subvenciones a entidades organizadoras de ciclos y conciertos de música en la provincia de Castellón 2026',
    organo: 'Patronato Provincial de Turismo de Castellón',
    organoNiveles: ['LOCAL', 'DIPUTACIÓN DE CASTELLÓN', 'PATRONATO PROVINCIAL DE TURISMO'],
    administracion: 'local',
    ccaa: ['Comunitat Valenciana'],
    provincias: ['Castellón/Castelló'],
    urlDetalle:
      'https://www.eldebate.com/espana/comunidad-valenciana/20260530/diputacion-castellon-convoca-ayudas-destinadas-organizacion-ciclos-conciertos-provincia_423347.html',
    texto:
      'Subvenciones para entidades organizadoras de ciclos y conciertos de música en la provincia de Castellón durante 2026, para impulsar el turismo de festival y música.',
  },
  {
    ...base,
    id: 'demo-cordoba-festivales-2026',
    tipo: 'convocatoria',
    titulo: 'Subvenciones a festivales y ferias culturales 2026',
    organo: 'Instituto Municipal de las Artes Escénicas Gran Teatro de Córdoba',
    organoNiveles: ['LOCAL', 'AYUNTAMIENTO DE CÓRDOBA', 'IMAE GRAN TEATRO'],
    administracion: 'local',
    ccaa: ['Andalucía'],
    provincias: ['Córdoba'],
    presupuesto: 1_400_000,
    fechaPublicacion: '2026-08-12',
    urlDetalle: 'https://bop.dipucordoba.es/visor-pdf/12-08-2026/BOP-A-2026-2796.pdf',
    texto:
      'Bases reguladoras y convocatoria de subvenciones en régimen de concurrencia competitiva destinadas a festivales y ferias culturales.',
  },
  {
    ...base,
    id: 'demo-avila-festival-jazz-2026',
    tipo: 'nominativa',
    titulo: 'Subvención nominativa al Festival Itinerante de Jazz Provincia de Ávila 2026',
    organo: 'Diputación de Ávila',
    organoNiveles: ['LOCAL', 'DIPUTACIÓN DE ÁVILA'],
    administracion: 'local',
    ccaa: ['Castilla y León'],
    provincias: ['Ávila'],
    presupuesto: 12_500,
    fechaPublicacion: '2026-07-31',
    abierta: false,
    urlDetalle:
      'https://www.diputacionavila.es/docus/la-diputacion/convenios/2026/convenio-2026-0126-exp-5886-2026.pdf',
    texto:
      'Convenio con la Asociación Cultural Hovercraft para colaborar con los gastos de realización del Festival Itinerante de Jazz Provincia de Ávila.',
  },
  {
    ...base,
    id: 'demo-platea-2026-27',
    tipo: 'convenio',
    titulo: 'Programa PLATEA 2026-27: circulación de espectáculos en espacios de las entidades locales',
    organo: 'INAEM y Federación Española de Municipios y Provincias',
    organoNiveles: ['ESTADO', 'MINISTERIO DE CULTURA', 'INAEM'],
    administracion: 'estatal',
    ccaa: [],
    fechaPublicacion: '2026-04-25',
    urlDetalle: 'https://boe.es/boe/dias/2026/04/25/pdfs/BOE-A-2026-9071.pdf',
    texto:
      'Convenio entre el INAEM y la FEMP para la circulación de espectáculos de artes escénicas en espacios escénicos de las entidades locales (Programa Platea).',
  },
];

export function convocatoriasDemo(ahora = new Date()): Convocatoria[] {
  const marca = ahora.toISOString();
  return ejemplos.map((e) => ({
    ...e,
    origen: 'demo',
    codigoBdns: null,
    clasificacion: clasificar({ texto: `${e.titulo}\n${e.texto}`, tiposBeneficiario: e.tiposBeneficiario }),
    vistaPorPrimeraVez: marca,
    actualizada: marca,
  }));
}
