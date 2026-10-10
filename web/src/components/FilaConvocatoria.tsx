import { enlace } from '../ruta';
import { NOMBRE_ESTILO, type Coincidencia } from '../tipos';
import { Etiqueta } from './TarjetaConvocatoria';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const mes = (aaaamm: string) => new Date(`${aaaamm}-01T00:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

function diasHasta(iso: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - hoy.getTime()) / 86_400_000);
}

/** Fila compacta para las listas de la portada y de los grupos: qué es, cuándo y por qué encaja. */
export function FilaConvocatoria({ m, prevista, motivos = true }: { m: Coincidencia; prevista?: string; motivos?: boolean }) {
  const c = m.convocatoria;
  const organo = c.organoNiveles.slice(1).join(' · ') || c.organo;
  let cuando: { texto: string; tono: string } | null = null;
  if (prevista) cuando = { texto: `Prevista: ${mes(prevista)}`, tono: 'apagado' };
  else if (m.plazo === 'proxima' && c.fechaInicioSolicitud) cuando = { texto: `Abre el ${fecha(c.fechaInicioSolicitud)}`, tono: 'exito' };
  else if (m.plazo === 'abierta' && c.fechaFinSolicitud) {
    const dias = diasHasta(c.fechaFinSolicitud);
    cuando = { texto: dias <= 0 ? 'Cierra hoy' : `Cierra el ${fecha(c.fechaFinSolicitud)} (${dias} ${dias === 1 ? 'día' : 'días'})`, tono: dias <= 7 ? 'aviso' : 'exito' };
  } else if (m.plazo === 'abierta') cuando = { texto: 'Plazo abierto', tono: 'exito' };
  const estilos = c.clasificacion.estilosExplicitos;

  return (
    <li className="fila-convocatoria">
      <div className="etiquetas">
        {cuando && <Etiqueta tono={cuando.tono}>{cuando.texto}</Etiqueta>}
        {!c.clasificacion.musical && c.clasificacion.culturaGeneral && <Etiqueta tono="aviso">Cultura general</Etiqueta>}
        {estilos.map((e) => (
          <Etiqueta key={e}>{NOMBRE_ESTILO[e]}</Etiqueta>
        ))}
      </div>
      <a className="fila-titulo" href={enlace('convocatoria', c.id)}>
        {c.titulo}
      </a>
      <span className="fila-detalle">
        <a href={enlace('organismo', c.organismoId)}>{organo}</a>
        {c.presupuesto != null && ` · ${euros.format(c.presupuesto)}`}
        {prevista && c.fechaPublicacion && ` · última: ${c.fechaPublicacion.slice(0, 4)}`}
      </span>
      {motivos && (m.motivos.length > 0 || m.avisos.length > 0) && (
        <span className="fila-motivos">
          {m.motivos.join(' · ')}
          {m.avisos.length > 0 && <span className="fila-aviso"> · {m.avisos[0]}</span>}
        </span>
      )}
    </li>
  );
}
