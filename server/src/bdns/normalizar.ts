import { clasificar } from '../clasificacion/musica.js';
import { codigosProvinciaDe, type Referencias } from '../referencias.js';
import { ambitoDesdeRegiones, ccaaDesdeNombre } from '../regiones.js';
import type { Administracion, Convocatoria, ResumenConcesiones } from '../tipos.js';
import { urlFichaBdns } from './cliente.js';
import type { BdnsConcesion, BdnsConvocatoria } from './tipos.js';

function administracionDesdeNivel1(nivel1: string | undefined): Administracion {
  switch ((nivel1 ?? '').trim().toUpperCase()) {
    case 'ESTADO':
      return 'estatal';
    case 'AUTONOMICA':
      return 'autonomica';
    case 'LOCAL':
      return 'local';
    default:
      return 'otra';
  }
}

/** Fechas de la BDNS ("2026-03-26" o "2026-03-26T00:00:00") a aaaa-mm-dd. */
function fechaIso(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return /^(\d{4}-\d{2}-\d{2})/.exec(valor)?.[1] ?? null;
}

/** HTML de los extractos a texto plano, conservando los saltos de párrafo. */
export function textoPlano(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const descripciones = (xs: { descripcion?: string }[] | undefined) =>
  (xs ?? []).map((x) => x.descripcion?.trim()).filter((x): x is string => !!x);

const DIRECTA_EN_TITULO = /nominativ|convenio|conveni\b|subvenci[oó]n directa|concesi[oó]n directa|subv\. directa/i;

function tipoDesde(c: BdnsConvocatoria, titulo: string): Convocatoria['tipo'] {
  if (c.tipoConvocatoria) return /directa/i.test(c.tipoConvocatoria) ? 'directa' : 'concurrencia';
  return DIRECTA_EN_TITULO.test(titulo) ? 'directa' : 'concurrencia';
}

/** CIF de persona jurídica: letra inicial A-H, J, N, P-S, U-W y 7 dígitos más control. */
const CIF = /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]\s+/;

/** Separa el NIF del nombre y oculta a las personas físicas. */
export function beneficiarioPublico(beneficiario: string | undefined): string | null {
  const b = (beneficiario ?? '').trim();
  if (!CIF.test(b)) return null;
  return b.replace(CIF, '').trim();
}

/** Resume las concesiones guardando solo personas jurídicas con nombre. */
export function resumirConcesiones(concesiones: BdnsConcesion[]): ResumenConcesiones {
  const entidades = concesiones
    .map((c) => ({
      nombre: beneficiarioPublico(c.beneficiario),
      importe: c.importe ?? 0,
      fecha: fechaIso(c.fechaConcesion),
    }))
    .filter((e): e is { nombre: string; importe: number; fecha: string | null } => e.nombre !== null)
    .sort((a, b) => b.importe - a.importe);
  const fechas = concesiones.map((c) => fechaIso(c.fechaConcesion)).filter((f): f is string => !!f).sort();
  return {
    numero: concesiones.length,
    importeTotal: Math.round(concesiones.reduce((t, c) => t + (c.importe ?? 0), 0) * 100) / 100,
    ultimaFecha: fechas.at(-1) ?? null,
    entidades,
  };
}

export interface RegistroBdns {
  /** Respuesta íntegra de GET /convocatorias. */
  detalle: BdnsConvocatoria;
  /** Concesiones de GET /concesiones/busqueda, con las personas físicas ya anonimizadas. */
  concesiones: BdnsConcesion[] | null;
  primeraDescarga: string;
  actualizado: string;
}

/**
 * Convierte un registro descargado de la BDNS en nuestra Convocatoria ya clasificada.
 * Con `referencias` se ubica además al organismo convocante en su municipio y provincia.
 */
export function desdeBdns(registro: RegistroBdns, referencias?: Referencias | null): Convocatoria {
  const c = registro.detalle;
  const codigo = c.codigoBDNS ?? (c.id != null ? String(c.id) : null);
  if (!codigo) throw new Error('Convocatoria de la BDNS sin código');

  const niveles = [c.organo?.nivel1, c.organo?.nivel2, c.organo?.nivel3]
    .map((x) => x?.trim())
    .filter((x): x is string => !!x);
  const administracion = administracionDesdeNivel1(c.organo?.nivel1);
  const regiones = descripciones(c.regiones);
  const ambito = ambitoDesdeRegiones(regiones);
  let ambitoNacional = regiones.length > 0 && ambito.nacional && ambito.ccaa.length === 0;
  let ccaa = ambito.ccaa;
  let provincias = ambito.provincias;

  let ubicacion: Convocatoria['ubicacion'] = null;
  if (administracion === 'autonomica') {
    const propia = ccaaDesdeNombre(c.organo?.nivel2);
    if (propia) ubicacion = { ccaa: propia, provincia: null, codigoProvincia: null, municipio: null, codigoMunicipio: null };
  } else if (administracion === 'local' && referencias && c.organo?.nivel2) {
    ubicacion = referencias.ubicarEntidadLocal(c.organo.nivel2, codigosProvinciaDe(ambito.provincias));
  }

  let ambitoDeducido = false;
  if (regiones.length === 0) {
    // Sin regiones: el Estado convoca para toda España; una comunidad o un ayuntamiento, para su territorio.
    ambitoNacional = administracion === 'estatal';
    if (ubicacion) {
      ccaa = [ubicacion.ccaa];
      provincias = ubicacion.provincia ? [ubicacion.provincia] : [];
      ambitoDeducido = true;
    }
  }

  const tiposBeneficiario = descripciones(c.tiposBeneficiarios);
  const titulo = (c.descripcion ?? c.descripcionLeng ?? '').trim() || `Convocatoria ${codigo}`;
  const anuncios = (c.anuncios ?? []).map((a) => ({
    titulo: a.titulo?.trim() ?? '',
    diario: a.desDiarioOficial?.trim() || null,
    fecha: fechaIso(a.datPublicacion),
    url: a.url?.trim() || null,
    texto: textoPlano(a.texto),
  }));
  const texto = [
    titulo,
    c.descripcionLeng,
    c.descripcionBasesReguladoras,
    ...anuncios.map((a) => `${a.titulo}\n${a.texto}`),
  ]
    .filter(Boolean)
    .join('\n');

  return {
    id: `bdns-${codigo}`,
    origen: 'bdns',
    tipo: tipoDesde(c, titulo),
    tipoConvocatoria: c.tipoConvocatoria?.trim() || null,
    codigoBdns: codigo,
    titulo,
    organo: niveles.at(-1) ?? 'Desconocido',
    organoNiveles: niveles,
    administracion,
    ambitoNacional,
    ccaa,
    ambitoDeducido,
    ubicacion,
    provincias,
    finalidad: c.descripcionFinalidad ?? null,
    sectores: descripciones(c.sectores),
    instrumentos: descripciones(c.instrumentos),
    tiposBeneficiario,
    presupuesto: typeof c.presupuestoTotal === 'number' ? c.presupuestoTotal : null,
    fechaPublicacion: fechaIso(c.fechaRecepcion),
    fechaInicioSolicitud: fechaIso(c.fechaInicioSolicitud),
    fechaFinSolicitud: fechaIso(c.fechaFinSolicitud),
    abierta: typeof c.abierto === 'boolean' ? c.abierto : null,
    urlBases: c.urlBasesReguladoras?.trim() || null,
    urlDetalle: urlFichaBdns(codigo),
    textoInicio: c.textInicio?.trim() || null,
    textoFin: c.textFin?.trim() || null,
    concesiones: registro.concesiones ? resumirConcesiones(registro.concesiones) : null,
    anuncios,
    documentos: (c.documentos ?? [])
      .filter((d) => d.id != null)
      .map((d) => ({
        id: d.id!,
        nombre: d.nombreFic?.trim() || `documento-${d.id}`,
        descripcion: d.descripcion?.trim() || null,
        fecha: fechaIso(d.datPublicacion),
        bytes: d.long ?? null,
      })),
    serie: null,
    texto,
    clasificacion: clasificar({ texto, tiposBeneficiario }),
    vistaPorPrimeraVez: registro.primeraDescarga,
    actualizada: registro.actualizado,
  };
}

/**
 * Lo que guardamos de cada concesión: sin el identificador interno de la persona y,
 * si el beneficiario es una persona física, sin su nombre ni su DNI parcial.
 */
export function anonimizarConcesion(c: BdnsConcesion): BdnsConcesion {
  const { idPersona: _idPersona, ...resto } = c;
  return beneficiarioPublico(c.beneficiario) === null ? { ...resto, beneficiario: 'PERSONA FÍSICA' } : resto;
}
