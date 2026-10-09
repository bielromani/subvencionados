// Comprobaciones del formato de las respuestas de la BDNS. Si la API cambia, mejor fallar
// (GitHub avisa del fallo del workflow) que guardar datos incompletos sin enterarse.
import type { BdnsConvocatoria } from './tipos.js';

export class ErrorFormato extends Error {}

const FECHA = /^\d{4}-\d{2}-\d{2}/;

/** Problemas del detalle de una convocatoria; lista vacía si está bien. */
export function problemasDetalle(d: BdnsConvocatoria, numero: string): string[] {
  const problemas: string[] = [];
  if (d.codigoBDNS !== numero) problemas.push(`codigoBDNS ${JSON.stringify(d.codigoBDNS)} no es ${numero}`);
  if (typeof d.descripcion !== 'string' || !d.descripcion.trim()) problemas.push('sin descripcion');
  if (typeof d.organo?.nivel1 !== 'string') problemas.push('sin organo.nivel1');
  if (!FECHA.test(d.fechaRecepcion ?? '')) problemas.push(`fechaRecepcion ${JSON.stringify(d.fechaRecepcion)}`);
  for (const campo of ['regiones', 'tiposBeneficiarios', 'documentos', 'anuncios'] as const) {
    if (d[campo] !== undefined && !Array.isArray(d[campo])) problemas.push(`${campo} no es una lista`);
  }
  return problemas;
}

/** Lleva la cuenta y lanza ErrorFormato si fallan demasiadas respuestas seguidas o en proporción. */
export class VigilanteFormato {
  private revisadas = 0;
  private malas = 0;
  readonly ejemplos: string[] = [];

  constructor(
    private readonly minimo = 20,
    private readonly proporcionMaxima = 0.2,
  ) {}

  /** Devuelve true si el detalle es válido. */
  revisar(d: BdnsConvocatoria, numero: string): boolean {
    this.revisadas++;
    const problemas = problemasDetalle(d, numero);
    if (problemas.length === 0) return true;
    this.malas++;
    if (this.ejemplos.length < 5) this.ejemplos.push(`${numero}: ${problemas.join(', ')}`);
    if (this.revisadas >= this.minimo && this.malas / this.revisadas > this.proporcionMaxima) {
      throw new ErrorFormato(
        `La BDNS devuelve un formato inesperado en ${this.malas} de ${this.revisadas} convocatorias. ` +
          `Ejemplos:\n  ${this.ejemplos.join('\n  ')}`,
      );
    }
    return false;
  }
}
