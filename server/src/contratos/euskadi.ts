import { normalizar } from '../clasificacion/musica.js';
import { type Contrato, pareceEntidad } from './placsp.js';

/**
 * Contratos del sector público vasco (API de datos abiertos de la Plataforma de Contratación de Euskadi), menores
 * incluidos: ahí publican los ayuntamientos vascos, que no llegan a la Plataforma del Estado.
 * La API no filtra y da 10 contratos por página: se recorre entera y se guardan solo los de música.
 */
export const API_EUSKADI = 'https://api.euskadi.eus/procurements';
export const PREFIJO_EUSKADI = 'eus-';

export interface ContratoEuskadi {
  id: string;
  object?: string;
  contractProcedureStatus?: { name?: string };
  contractProcedureType?: { name?: string };
  CIF?: string;
  socialReason?: string;
  awardDate?: string;
  awardAmount?: number;
  awardAmountWithoutVAT?: number;
  CPV?: string;
  minorContract?: boolean;
  mainEntityOfPage?: string;
  _links?: { contractingAuthority?: { href?: string } };
}

export interface PoderEuskadi {
  id: number;
  identificationNumber?: string;
  name: string;
  address?: string;
  webPage?: string;
  codNUTS?: string;
}

/** Id del poder adjudicador de un contrato (del enlace contracting-authorities/597). */
export const idPoder = (c: ContratoEuskadi) => c._links?.contractingAuthority?.href?.match(/contracting-authorities\/(\d+)/)?.[1] ?? null;

/** Fecha aaaa-mm-dd razonable (la API trae erratas como 2926-09-24). */
function fecha(x: string | undefined, hoy: Date): string | null {
  const f = x?.slice(0, 10);
  if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return null;
  const limite = new Date(hoy.getTime() + 366 * 86_400_000).toISOString().slice(0, 10);
  return f >= '2000-01-01' && f <= limite ? f : null;
}

/** NIF de persona o enmascarado (XXXXX112F): no se guarda ni el NIF ni el nombre, salvo que sea claramente una entidad. */
const nifOculto = (nif: string | undefined) => !nif || /[x*]/i.test(nif) || /^[0-9XYZ]\d{7}[A-Z]$/i.test(nif);

export function contratoDeEuskadi(c: ContratoEuskadi, poder: PoderEuskadi | undefined, hoy = new Date()): Contrato | null {
  const titulo = c.object?.replace(/\s+/g, ' ').trim();
  const f = fecha(c.awardDate, hoy);
  if (!titulo || !f || !poder) return null;
  const direccion = poder.address ?? '';
  const cp = direccion.match(/\b(0[1-9]|[1-4]\d|5[0-2])\d{3}\b/)?.[0] ?? null;
  const ciudad = cp ? (direccion.split(cp)[1]?.replace(/\(.*$/, '').replace(/^[\s,.-]+/, '').trim() || null) : null;
  const persona = nifOculto(c.CIF) && !pareceEntidad(c.socialReason ?? null);
  return {
    id: `${PREFIJO_EUSKADI}${normalizar(c.id).replace(/[^a-z0-9_-]+/g, '-')}`,
    expediente: c.id,
    titulo,
    estado: 'ADJ',
    menor: !!c.minorContract || /menor/i.test(c.contractProcedureType?.name ?? ''),
    actualizado: f,
    enlace: c.mainEntityOfPage ?? null,
    organo: {
      nombre: poder.name.trim(),
      dir3: null,
      nif: poder.identificationNumber && !nifOculto(poder.identificationNumber) ? poder.identificationNumber : null,
      ciudad,
      codigoPostal: cp,
      web: poder.webPage ?? null,
      jerarquia: ['País Vasco'],
    },
    tipoContrato: null,
    procedimiento: null,
    importe: null,
    importeConIva: null,
    cpv: c.CPV ? [c.CPV.replace(/-.*$/, '')] : [],
    lugar: { nuts: poder.codNUTS ?? 'ES21', nombre: null },
    finPlazo: null,
    ejecucion: { inicio: null, fin: null },
    adjudicaciones: [
      {
        adjudicatario: persona ? null : (c.socialReason?.trim() ?? null),
        nif: persona || nifOculto(c.CIF) ? null : (c.CIF ?? null),
        personaFisica: persona,
        importe: c.awardAmountWithoutVAT ?? null,
        importeConIva: c.awardAmount ?? null,
        fecha: f,
        ofertas: null,
        lote: null,
      },
    ],
    documentos: [],
  };
}
