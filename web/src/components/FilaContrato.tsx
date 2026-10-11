import { enlace } from '../ruta';
import { NOMBRE_ESTILO, type Contrato } from '../tipos';
import { Etiqueta } from './TarjetaConvocatoria';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export const ESTADO_CONTRATO: Record<string, string> = {
  PRE: 'Anuncio previo',
  PUB: 'En plazo',
  EV: 'En evaluación',
  ADJ: 'Adjudicado',
  RES: 'Resuelto',
  ANUL: 'Anulado',
};

/** Quién se lo llevó: empresas por su nombre; las personas físicas no se muestran. */
export function adjudicatarios(c: Contrato): string | null {
  if (!c.adjudicaciones.length) return null;
  const nombres = [...new Set(c.adjudicaciones.map((a) => a.adjudicatario ?? 'persona física'))];
  return nombres.length > 3 ? `${nombres.slice(0, 3).join(', ')} y ${nombres.length - 3} más` : nombres.join(', ');
}

export function FilaContrato({ c }: { c: Contrato }) {
  const quien = adjudicatarios(c);
  return (
    <li className="fila-convocatoria">
      <div className="etiquetas">
        {c.abierta ? (
          <Etiqueta tono="exito">Ofertas hasta el {fecha(c.finPlazo!)}</Etiqueta>
        ) : (
          <Etiqueta tono="apagado">{ESTADO_CONTRATO[c.estado ?? ''] ?? c.estado ?? 'Sin estado'}</Etiqueta>
        )}
        {c.menor && <Etiqueta>Contrato menor</Etiqueta>}
        {c.estilos.map((e) => (
          <Etiqueta key={e}>{NOMBRE_ESTILO[e]}</Etiqueta>
        ))}
      </div>
      <a className="fila-titulo" href={enlace('contrato', c.id)}>
        {c.titulo}
      </a>
      <span className="fila-detalle">
        {c.organo.nombre}
        {c.organo.ciudad && ` · ${c.organo.ciudad}`}
        {c.provincia && c.provincia !== c.organo.ciudad && ` (${c.provincia})`}
        {c.adjudicado != null
          ? ` · adjudicado por ${euros.format(c.adjudicado)} sin IVA`
          : c.importe != null && ` · presupuesto ${euros.format(c.importe)} sin IVA`}
      </span>
      {quien && (
        <span className="fila-motivos">
          Adjudicado a {quien}
          {c.fechaAdjudicacion && ` el ${fecha(c.fechaAdjudicacion)}`}
        </span>
      )}
    </li>
  );
}
