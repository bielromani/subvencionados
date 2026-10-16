import { Contacto } from '../components/Contacto';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { ESTADO_CONTRATO } from '../components/FilaContrato';
import { Etiqueta } from '../components/TarjetaConvocatoria';
import type { Contrato } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : '—');
const TIPO_DOCUMENTO = { administrativo: 'Pliego de cláusulas administrativas', tecnico: 'Pliego de prescripciones técnicas', otro: 'Documento' };

export function PaginaContrato({ id }: { id: string }) {
  const [c, setC] = useState<Contrato | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.contrato(id).then(setC, (e: Error) => setError(e.message));
  }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!c) return <p className="ayuda">Cargando…</p>;

  return (
    <section className="pagina">
      <p className="migas">
        <a href="#/contratos">← Contratos</a>
      </p>
      <article className="tarjeta">
        <div className="etiquetas">
          {c.abierta ? <Etiqueta tono="exito">Se puede presentar oferta</Etiqueta> : <Etiqueta tono="apagado">{ESTADO_CONTRATO[c.estado ?? ''] ?? c.estado}</Etiqueta>}
          {c.menor && <Etiqueta>Contrato menor</Etiqueta>}
          {c.ccaa && <Etiqueta>{c.ccaa}</Etiqueta>}
        </div>
        <h2>{c.titulo}</h2>
        <p className="organo">
          {c.organo.nombre}
          {c.organo.ciudad && ` · ${c.organo.ciudad}`}
          {c.provincia && c.provincia !== c.organo.ciudad && ` (${c.provincia})`}
        </p>
        <dl className="datos">
          {c.expediente && (
            <div>
              <dt>Expediente</dt>
              <dd>{c.expediente}</dd>
            </div>
          )}
          {c.importe != null && (
            <div>
              <dt>Presupuesto base</dt>
              <dd>
                {euros.format(c.importe)} sin IVA{c.importeConIva != null && ` (${euros.format(c.importeConIva)} con IVA)`}
              </dd>
            </div>
          )}
          {c.finPlazo && (
            <div>
              <dt>Ofertas hasta</dt>
              <dd>{fecha(c.finPlazo)}</dd>
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
          <div>
            <dt>Códigos CPV</dt>
            <dd>{c.cpv.join(', ') || '—'}</dd>
          </div>
        </dl>
        <footer className="enlaces">
          {c.enlace && (
            <a href={c.enlace} target="_blank" rel="noreferrer">
              Ver en la Plataforma de Contratación ↗
            </a>
          )}
          {c.organo.web && (
            <a href={c.organo.web} target="_blank" rel="noreferrer">
              Web del órgano ↗
            </a>
          )}
        </footer>
      </article>

      {c.contacto && <Contacto c={c.contacto} />}

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
          <ul>
            {c.documentos.map((d, i) => (
              <li key={i}>
                <a href={d.url} target="_blank" rel="noreferrer">
                  {TIPO_DOCUMENTO[d.tipo]}
                  {d.nombre && ` (${d.nombre})`} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="ayuda">Datos de la Plataforma de Contratación del Sector Público. Ante cualquier duda, prevalece el anuncio oficial.</p>
    </section>
  );
}
