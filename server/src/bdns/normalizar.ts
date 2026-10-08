import { clasificar } from '../clasificacion/musica.js';
import { ambitoDesdeRegiones } from '../regiones.js';
import type { Administracion, Convocatoria } from '../tipos.js';
import { urlFichaBdns } from './cliente.js';
import type { BdnsConvocatoria } from './tipos.js';

function administracionDesdeNivel1(nivel1: string | undefined): Administracion {
  const n = (nivel1 ?? '').trim().toUpperCase();
  if (!n) return 'otra';
  if (n === 'ESTADO') return 'estatal';
  if (n === 'LOCAL') return 'local';
  if (n === 'OTROS') return 'otra';
  // El resto de valores de nivel1 son los nombres de las comunidades autónomas.
  return 'autonomica';
}

/** Fechas de la BDNS ("2026-03-26" o "2026-03-26T00:00:00") a ISO aaaa-mm-dd. */
function fechaIso(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(valor) ?? null;
  if (m) return m[1]!;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(valor);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : null;
}

const descripciones = (xs: { descripcion?: string }[] | undefined) =>
  (xs ?? []).map((x) => x.descripcion?.trim()).filter((x): x is string => !!x);

/** Convierte el detalle de la BDNS en nuestra Convocatoria ya clasificada. */
export function desdeBdns(c: BdnsConvocatoria, ahora = new Date()): Convocatoria {
  const codigo = c.codigoBDNS ?? (c.id != null ? String(c.id) : null);
  if (!codigo) throw new Error('Convocatoria de la BDNS sin código');

  const niveles = [c.organo?.nivel1, c.organo?.nivel2, c.organo?.nivel3]
    .map((x) => x?.trim())
    .filter((x): x is string => !!x);
  const ambito = ambitoDesdeRegiones(descripciones(c.regiones));
  const tiposBeneficiario = descripciones(c.tiposBeneficiarios);
  const titulo = (c.descripcion ?? c.descripcionLeng ?? '').trim() || `Convocatoria ${codigo}`;

  const texto = [
    titulo,
    c.descripcionLeng,
    c.descripcionFinalidad,
    c.descripcionBasesReguladoras,
    ...descripciones(c.sectores),
    ...(c.anuncios ?? []).map((a) => [a.titulo, a.texto].filter(Boolean).join(' ')),
  ]
    .filter(Boolean)
    .join('\n');

  const marca = ahora.toISOString();
  return {
    id: `bdns-${codigo}`,
    origen: 'bdns',
    tipo: 'convocatoria',
    codigoBdns: codigo,
    titulo,
    organo: niveles.at(-1) ?? 'Desconocido',
    organoNiveles: niveles,
    administracion: administracionDesdeNivel1(c.organo?.nivel1),
    ccaa: ambito.nacional ? [] : ambito.ccaa,
    provincias: ambito.nacional ? [] : ambito.provincias,
    finalidad: c.descripcionFinalidad ?? null,
    tiposBeneficiario,
    presupuesto: typeof c.presupuestoTotal === 'number' ? c.presupuestoTotal : null,
    fechaPublicacion: fechaIso(c.fechaRecepcion),
    fechaInicioSolicitud: fechaIso(c.fechaInicioSolicitud),
    fechaFinSolicitud: fechaIso(c.fechaFinSolicitud),
    abierta: typeof c.abierto === 'boolean' ? c.abierto : null,
    urlBases: c.urlBasesReguladoras ?? null,
    urlDetalle: urlFichaBdns(codigo),
    texto,
    clasificacion: clasificar({ texto, tiposBeneficiario }),
    vistaPorPrimeraVez: marca,
    actualizada: marca,
  };
}
