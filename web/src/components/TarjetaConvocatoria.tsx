import type { ReactNode } from 'react';
import { enlace } from '../ruta';
import { FichaPlegable } from './FichaConvocatoria';
import { NOMBRE_ADMINISTRACION, NOMBRE_ESTILO, NOMBRE_LINEA, type Convocatoria, type Plazo } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : null);

const TEXTO_PLAZO: Record<Plazo, string> = {
  abierta: 'Plazo abierto',
  proxima: 'Por abrir',
  cerrada: 'Plazo cerrado',
  desconocido: 'Plazo sin fechas',
};
const TONO_PLAZO: Record<Plazo, string> = { abierta: 'exito', proxima: 'aviso', cerrada: 'apagado', desconocido: 'apagado' };

export function Etiqueta({ children, tono = 'neutro' }: { children: ReactNode; tono?: string }) {
  return <span className={`etiqueta etiqueta-${tono}`}>{children}</span>;
}

/** La BDNS a veces da la URL de las bases sin esquema ("www.ejemplo.org") o con texto libre. */
function enlaceBases(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^www\.[^\s]+$/i.test(url)) return `https://${url}`;
  return null;
}

function ambito(c: Convocatoria): string {
  if (c.ambitoNacional) return 'Sin restricción territorial';
  if (c.provincias.length > 0) return c.provincias.join(', ');
  if (c.ccaa.length > 0) return c.ccaa.join(', ');
  return 'Ámbito no indicado';
}

/** En los listados el título lleva a su página; en la página (`pagina`) la ficha va aparte y no se pliega. */
export function TarjetaConvocatoria({ c, children, pagina = false }: { c: Convocatoria; children?: ReactNode; pagina?: boolean }) {
  const cl = c.clasificacion;
  const organo = c.organoNiveles.slice(1).join(' · ') || c.organo;

  return (
    <article className="tarjeta">
      <header className="tarjeta-cabecera">
        <div className="etiquetas">
          {c.tipo === 'directa' ? (
            <Etiqueta tono="aviso">Concesión directa</Etiqueta>
          ) : (
            <Etiqueta tono={TONO_PLAZO[c.plazo]}>{TEXTO_PLAZO[c.plazo]}</Etiqueta>
          )}
          {!cl.musical && cl.culturaGeneral && <Etiqueta tono="aviso">Cultura general</Etiqueta>}
          <Etiqueta>{NOMBRE_ADMINISTRACION[c.administracion]}</Etiqueta>
          <Etiqueta>{ambito(c)}</Etiqueta>
        </div>
        {pagina ? <h2>{c.titulo}</h2> : <h3><a href={enlace('convocatoria', c.id)}>{c.titulo}</a></h3>}
        <p className="organo">
          <a href={enlace('organismo', c.organismoId)}>{organo}</a>
          {c.ubicacion?.municipio && ` · ${c.ubicacion.municipio}`}
          {!c.ubicacion?.municipio && c.ubicacion?.provincia && ` · ${c.ubicacion.provincia}`}
        </p>
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
            <dt>Registrada</dt>
            <dd>{fecha(c.fechaPublicacion)}</dd>
          </div>
        )}
        {c.tipo === 'concurrencia' && (c.fechaInicioSolicitud || c.textoInicio) && (
          <div>
            <dt>Solicitudes desde</dt>
            <dd>{fecha(c.fechaInicioSolicitud) ?? c.textoInicio}</dd>
          </div>
        )}
        {c.tipo === 'concurrencia' && (c.fechaFinSolicitud || c.textoFin) && (
          <div>
            <dt>Solicitudes hasta</dt>
            <dd>{fecha(c.fechaFinSolicitud) ?? c.textoFin}</dd>
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

      {c.concesiones && c.concesiones.numero > 0 && (
        <details className="concesiones">
          <summary>
            Concedido: {euros.format(c.concesiones.importeTotal)} en {c.concesiones.numero}{' '}
            {c.concesiones.numero === 1 ? 'concesión' : 'concesiones'}
          </summary>
          <ul>
            {c.concesiones.entidades.slice(0, pagina ? undefined : 10).map((e, i) => (
              <li key={i}>
                {e.nombre} · {euros.format(e.importe)}
                {e.fecha && ` · ${fecha(e.fecha)}`}
              </li>
            ))}
            {!pagina && c.concesiones.entidades.length > 10 && (
              <li className="ayuda">
                <a href={enlace('convocatoria', c.id)}>Ver las {c.concesiones.entidades.length} entidades</a>
              </li>
            )}
            {c.concesiones.entidades.length < c.concesiones.numero && (
              <li className="ayuda">
                {c.concesiones.numero - c.concesiones.entidades.length} a personas físicas (no se muestran)
              </li>
            )}
          </ul>
        </details>
      )}

      {!pagina && <FichaPlegable id={c.id} leida={c.tieneFicha ?? false} />}

      {children}

      <footer className="enlaces">
        <a href={c.urlDetalle} target="_blank" rel="noreferrer">
          Ficha BDNS {c.codigoBdns} ↗
        </a>
        {enlaceBases(c.urlBases) && (
          <a href={enlaceBases(c.urlBases)!} target="_blank" rel="noreferrer">
            Bases reguladoras ↗
          </a>
        )}
      </footer>
    </article>
  );
}
