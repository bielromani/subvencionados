import type { ReactNode } from 'react';
import { NOMBRE_ADMINISTRACION, NOMBRE_ESTILO, NOMBRE_LINEA, type Convocatoria, type Plazo } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : null);

const TEXTO_PLAZO: Record<Plazo, string> = {
  abierta: 'Plazo abierto',
  cerrada: 'Plazo cerrado',
  desconocido: 'Plazo sin confirmar',
};

export function Etiqueta({ children, tono = 'neutro' }: { children: ReactNode; tono?: string }) {
  return <span className={`etiqueta etiqueta-${tono}`}>{children}</span>;
}

export function TarjetaConvocatoria({ c, children }: { c: Convocatoria; children?: ReactNode }) {
  const ambito = c.ccaa.length === 0 ? 'Toda España' : (c.provincias.length > 0 ? c.provincias : c.ccaa).join(', ');
  const cl = c.clasificacion;

  return (
    <article className="tarjeta">
      <header className="tarjeta-cabecera">
        <div className="etiquetas">
          <Etiqueta tono={c.plazo === 'abierta' ? 'exito' : c.plazo === 'cerrada' ? 'apagado' : 'aviso'}>
            {TEXTO_PLAZO[c.plazo]}
          </Etiqueta>
          <Etiqueta>{NOMBRE_ADMINISTRACION[c.administracion]}</Etiqueta>
          <Etiqueta>{ambito}</Etiqueta>
          {c.tipo !== 'convocatoria' && <Etiqueta tono="aviso">{c.tipo === 'nominativa' ? 'Nominativa' : 'Convenio'}</Etiqueta>}
          {c.origen === 'demo' && <Etiqueta tono="apagado">Ejemplo</Etiqueta>}
        </div>
        <h3>{c.titulo}</h3>
        <p className="organo">{c.organo}</p>
      </header>

      <dl className="datos">
        {c.presupuesto != null && (
          <div>
            <dt>Presupuesto</dt>
            <dd>{euros.format(c.presupuesto)}</dd>
          </div>
        )}
        {c.fechaPublicacion && (
          <div>
            <dt>Publicada</dt>
            <dd>{fecha(c.fechaPublicacion)}</dd>
          </div>
        )}
        {c.fechaFinSolicitud && (
          <div>
            <dt>Solicitudes hasta</dt>
            <dd>{fecha(c.fechaFinSolicitud)}</dd>
          </div>
        )}
        {cl.musical && (
          <div>
            <dt>Estilos</dt>
            <dd>
              {cl.estilosCompatibles.length === 0
                ? `Otros géneros (${cl.otrosGeneros.join(', ')})`
                : cl.estilosCompatibles
                    .map((e) => NOMBRE_ESTILO[e] + (cl.estilosExplicitos.includes(e) ? ' ★' : ''))
                    .join(' · ')}
            </dd>
          </div>
        )}
        {cl.lineas.length > 0 && (
          <div>
            <dt>Financia</dt>
            <dd>{cl.lineas.map((l) => NOMBRE_LINEA[l]).join(' · ')}</dd>
          </div>
        )}
      </dl>

      {children}

      <footer className="enlaces">
        {c.urlDetalle && (
          <a href={c.urlDetalle} target="_blank" rel="noreferrer">
            {c.origen === 'bdns' ? 'Ficha en la BDNS' : 'Ver fuente'} ↗
          </a>
        )}
        {c.urlBases && (
          <a href={c.urlBases} target="_blank" rel="noreferrer">
            Bases reguladoras ↗
          </a>
        )}
      </footer>
    </article>
  );
}
