// Utilidades compartidas por los tests: construyen registros a partir de las respuestas reales.
import type { RegistroBdns } from '../src/bdns/normalizar.js';
import type { BdnsConcesion, BdnsConvocatoria } from '../src/bdns/tipos.js';
import concesiones932065 from './fixtures/bdns-concesiones-932065.json' with { type: 'json' };
import detalle934378 from './fixtures/bdns-detalle-934378.json' with { type: 'json' };

export const DETALLE_NATURAJAZZ = detalle934378 as BdnsConvocatoria;
export const CONCESIONES_FIGUERES = concesiones932065.content as BdnsConcesion[];

export function registro(detalle: BdnsConvocatoria, concesiones: BdnsConcesion[] | null = null): RegistroBdns {
  return { detalle, concesiones, primeraDescarga: '2026-10-08T10:00:00.000Z', actualizado: '2026-10-08T10:00:00.000Z' };
}

/**
 * Variante del detalle real con otro código y los cambios indicados. Si cambia el título,
 * se vacía la descripción de las bases (la real habla del concurso de fotografía).
 */
export function detalle(codigo: string, cambios: Partial<BdnsConvocatoria>): BdnsConvocatoria {
  const base = 'descripcion' in cambios ? { ...DETALLE_NATURAJAZZ, descripcionBasesReguladoras: null } : DETALLE_NATURAJAZZ;
  return { ...base, id: Number(codigo), codigoBDNS: codigo, ...cambios };
}
