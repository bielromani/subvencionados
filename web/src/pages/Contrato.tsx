import { EncajeCatalogo } from '../components/EncajeCatalogo';
import { Contacto } from '../components/Contacto';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { ESTADO_CONTRATO } from '../components/FilaContrato';
import { NOMBRE_ESTILO, type Contrato } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : '—');
const diasHasta = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
const TIPO_DOCUMENTO = { administrativo: 'Pliego de cláusulas administrativas', tecnico: 'Pliego de prescripciones técnicas', otro: 'Documento' };

export function PaginaContrato({ id }: { id: string }) {
  const [c, setC] = useState<Contrato | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.contrato(id).then(setC, (e: Error) => setError(e.message));
  }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!c) return <p className="ayuda">Cargando…</p>;

  const dias = c.abierta && c.finPlazo ? diasHasta(c.finPlazo) : null;
  return (
    <section className="pagina ficha-pagina">
      <header className="ficha-cabecera">
        <p className="migas">
          <a href="#/contratos">Licitaciones</a>
          {c.expediente && ` / ${c.expediente}`}
        </p>
        <span className="etiquetas">
          {c.abierta ? <span className="etiqueta etiqueta-exito">Se puede presentar oferta</span> : <span className="etiqueta">{ESTADO_CONTRATO[c.estado ?? ''] ?? c.estado}</span>}
          {c.menor && <span className="etiqueta">Contrato menor</span>}
          {c.estilos.map((e) => (
            <span key={e} className="etiqueta etiqueta-acento">
              {NOMBRE_ESTILO[e]}
            </span>
          ))}
          {c.ccaa && <span className="etiqueta">{c.ccaa}</span>}
        </span>
        <h1>{c.titulo}</h1>
        <p className="ficha-organo">
          {c.organo.nombre}
          {c.organo.ciudad && ` · ${c.organo.ciudad}`}
          {c.provincia && c.provincia !== c.organo.ciudad && ` (${c.provincia})`}
        </p>
        <div className="ficha-acciones">
          {c.enlace && (
            <a className={c.abierta ? 'boton' : 'accion'} href={c.enlace} target="_blank" rel="noreferrer">
              {c.abierta ? 'Presentar oferta en la Plataforma ↗' : 'Ver en la Plataforma de Contratación ↗'}
            </a>
          )}
          {c.organo.web && (
            <a className="accion" href={c.organo.web} target="_blank" rel="noreferrer">
              Web del órgano ↗
            </a>
          )}
        </div>
        <dl className="hechos">
          {c.finPlazo && (
            <div className="hecho-principal">
              <dt>Ofertas hasta</dt>
              <dd className={dias != null ? (dias <= 7 ? 'tono-ambar' : 'tono-verde') : ''}>
                {fecha(c.finPlazo)}
                {dias != null && ` · ${dias <= 0 ? 'hoy' : `${dias} ${dias === 1 ? 'día' : 'días'}`}`}
              </dd>
            </div>
          )}
          {c.importe != null && (
            <div>
              <dt>Presupuesto base</dt>
              <dd>{euros.format(c.importe)}</dd>
              <span className="ayuda">sin IVA{c.importeConIva != null && ` · ${euros.format(c.importeConIva)} con IVA`}</span>
            </div>
          )}
          {c.adjudicado != null && (
            <div>
              <dt>Adjudicado</dt>
              <dd>{euros.format(c.adjudicado)}</dd>
              <span className="ayuda">sin IVA</span>
            </div>
          )}
          {(c.ejecucion.inicio || c.ejecucion.fin) && (
            <div>
              <dt>Ejecución</dt>
              <dd>
                {fecha(c.ejecucion.inicio)} – {fecha(c.ejecucion.fin)}
              </dd>
            </div>
          )}
        </dl>
      </header>

      <div className="ficha-cuerpo">
        <div className="ficha-principal">
          {c.adjudicaciones.length > 0 && (
            <section className="bloque">
              <h3>Adjudicación</h3>
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead>
                    <tr>
                      {c.adjudicaciones.some((a) => a.lote) && <th>Lote</th>}
                      <th>Adjudicatario</th>
                      <th className="num">Importe sin IVA</th>
                      <th className="num">Ofertas</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.adjudicaciones.map((a, i) => (
                      <tr key={i}>
                        {c.adjudicaciones.some((x) => x.lote) && <td>{a.lote ?? '—'}</td>}
                        <td>{a.personaFisica ? <span className="ayuda">Persona física (no se muestra)</span> : (a.adjudicatario ?? '—')}</td>
                        <td className="num">{a.importe != null ? euros.format(a.importe) : '—'}</td>
                        <td className="num">{a.ofertas ?? '—'}</td>
                        <td>{fecha(a.fecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {c.documentos && c.documentos.length > 0 && (
            <section className="bloque">
              <h3>Pliegos y documentos</h3>
              <ul className="documentos">
                {c.documentos.map((d, i) => (
                  <li key={i}>
                    <a href={d.url} target="_blank" rel="noreferrer">
                      <span className="doc-icono" aria-hidden="true">
                        PDF
                      </span>
                      <span>
                        <strong>{TIPO_DOCUMENTO[d.tipo]}</strong>
                        {d.nombre && <span className="ayuda">{d.nombre}</span>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!c.adjudicaciones.length && !c.documentos?.length && (
            <section className="bloque">
              <h3>Pliegos</h3>
              <p className="ayuda">Los pliegos y la documentación están en la Plataforma de Contratación.</p>
            </section>
          )}
        </div>
        <aside className="ficha-lateral">
          <EncajeCatalogo tipo="contrato" id={c.id} />
          {c.contacto && <Contacto c={c.contacto} />}
          <section className="bloque">
            <h3>Datos del expediente</h3>
            <dl className="lista-datos">
              {c.expediente && (
                <div>
                  <dt>Expediente</dt>
                  <dd>{c.expediente}</dd>
                </div>
              )}
              <div>
                <dt>Códigos CPV</dt>
                <dd>{c.cpv.join(', ') || '—'}</dd>
              </div>
            </dl>
            <p className="ayuda">Datos de la Plataforma de Contratación del Sector Público. Ante cualquier duda, prevalece el anuncio oficial.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
