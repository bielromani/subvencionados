import { enlace } from '../ruta';
import { NOMBRE_ESTILO, type Estilo, type Festival, type FuenteDirectorio, type Programador } from '../tipos';
import { Etiqueta } from './TarjetaConvocatoria';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const mesesTexto = (ms: number[]) => ms.map((m) => MESES[m - 1]).join(', ');

/** "2017–2026 (8 años)" o los años sueltos si son pocos. */
export function aniosTexto(anios: number[]): string {
  if (!anios.length) return '—';
  if (anios.length <= 3) return anios.join(', ');
  return `${anios[0]}–${anios.at(-1)} (${anios.length} años con datos)`;
}

export function FilaProgramador({ p, estilo }: { p: Programador; estilo?: Estilo }) {
  const estilos = (Object.entries(p.estilos) as [Estilo, number][]).sort((a, b) => b[1] - a[1]);
  return (
    <li className="fila-convocatoria">
      <div className="etiquetas">
        {estilos.map(([e, n]) => (
          <Etiqueta key={e} tono={e === estilo ? 'exito' : 'neutro'}>
            {NOMBRE_ESTILO[e]}: {n}
          </Etiqueta>
        ))}
        {p.conContacto && <Etiqueta tono="exito">Contacto de cultura</Etiqueta>}
      </div>
      <a className="fila-titulo" href={enlace('programador', p.id)}>
        {p.nombre}
      </a>
      <span className="fila-detalle">
        {[p.ciudad, p.provincia !== p.ciudad ? p.provincia : null].filter(Boolean).join(', ')} · {p.contratos} contratos de música
        {p.importeHabitual != null && ` · habitual ${euros.format(p.importeHabitual)}`}
        {p.ultimo && ` · último ${new Date(`${p.ultimo}T00:00:00`).toLocaleDateString('es-ES')}`}
      </span>
      {p.meses.length > 0 && <span className="fila-motivos">Contrata sobre todo en {mesesTexto(p.meses)}</span>}
    </li>
  );
}

export function FilaFestival({ f }: { f: Festival }) {
  return (
    <li className="fila-convocatoria">
      <div className="etiquetas">
        {f.estilos.map((e) => (
          <Etiqueta key={e}>{NOMBRE_ESTILO[e]}</Etiqueta>
        ))}
        {!f.musical && <Etiqueta tono="aviso">Multidisciplinar o de fiestas</Etiqueta>}
      </div>
      <a className="fila-titulo" href={enlace('festival', f.id)}>
        {f.nombre}
      </a>
      <span className="fila-detalle">
        {[f.lugar, f.provincia !== f.lugar ? f.provincia : null].filter(Boolean).join(', ') || f.ccaa || 'Lugar no indicado'} ·{' '}
        {aniosTexto(f.anios)}
        {f.dinero > 0 && ` · ${euros.format(f.dinero)} en contratos y ayudas`}
      </span>
      <span className="fila-motivos">{f.organizadores.slice(0, 2).join(' · ')}</span>
    </li>
  );
}

const TIPO_FUENTE: Record<FuenteDirectorio['tipo'], string> = { contrato: 'Contrato', convocatoria: 'Subvención', concesion: 'Ayuda concedida' };

/** Las fuentes oficiales de una ficha del directorio, enlazadas a su contrato o convocatoria. */
export function Fuentes({ fuentes }: { fuentes: FuenteDirectorio[] }) {
  return (
    <ul className="filas">
      {fuentes.map((x, i) => (
        <li key={i} className="fila-convocatoria">
          <div className="etiquetas">
            <Etiqueta tono="apagado">{TIPO_FUENTE[x.tipo]}</Etiqueta>
            {x.fecha && <Etiqueta>{new Date(`${x.fecha}T00:00:00`).toLocaleDateString('es-ES')}</Etiqueta>}
          </div>
          <a className="fila-titulo" href={enlace(x.tipo === 'contrato' ? 'contrato' : 'convocatoria', x.id)}>
            {x.titulo}
          </a>
          <span className="fila-detalle">
            {x.beneficiario && `${x.beneficiario} · `}
            {x.importe != null && x.importe > 0 ? euros.format(x.importe) : 'Importe no indicado'}
          </span>
        </li>
      ))}
    </ul>
  );
}
