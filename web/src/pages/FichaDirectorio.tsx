import { EntidadCrm } from '../components/EntidadCrm';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { BotonCliente } from '../components/Cliente';
import { Contacto } from '../components/Contacto';
import { FilaContrato } from '../components/FilaContrato';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { aniosTexto, Fuentes, mesesTexto } from '../components/Directorio';
import { Etiqueta } from '../components/TarjetaConvocatoria';
import { enlace } from '../ruta';
import { type ConcesionRecibida, NOMBRE_ESTILO, type Estilo, type Festival, type Programador, type SubvencionesRecibidas } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : '—');

/** Contratos menores (hasta 15.000 € sin IVA en servicios): se adjudican sin concurso, basta con convencer al programador. */
function comoContrata(p: Programador): string {
  if (!p.contratos) return 'No publica contratos de música, pero recibe ayudas de cultura o fiestas (abajo): suele contratar directamente con factura o a través de las entidades del pueblo. Llama y envía propuesta.';
  const pct = p.contratos ? Math.round((p.menores / p.contratos) * 100) : 0;
  if (pct >= 70) return `El ${pct} % de sus conciertos son contratos menores (sin concurso): lo decide el programador, así que llamar y enviar propuesta funciona.`;
  if (pct >= 30) return `El ${pct} % son contratos menores (sin concurso) y el resto, licitaciones: llama para lo pequeño y vigila sus contratos abiertos.`;
  return `Contrata sobre todo por licitación (solo el ${pct} % son contratos menores): vigila sus contratos abiertos y presenta oferta.`;
}

/** Ayudas de cultura y música que llegan al municipio: dinero para programar, y a quién ofrecer un concierto. */
function SubvencionesRecibidasBloque({ s, pedania }: { s: SubvencionesRecibidas; pedania: boolean }) {
  const fechaCorta = (x: string | null) => (x ? new Date(`${x}T12:00:00`).toLocaleDateString('es-ES') : '');
  const lista = (cs: ConcesionRecibida[]) => (
    <ul className="lista-concesiones">
      {cs.map((c, i) => (
        <li key={`${c.convocatoria}-${i}`}>
          <a href={enlace('convocatoria', c.convocatoria)}>{c.titulo}</a>
          <span className="ayuda">
            {' '}
            · {c.convocante} · {euros.format(c.importe)}
            {c.fecha && ` · ${fechaCorta(c.fecha)}`}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="bloque">
      <h3>Subvenciones recibidas</h3>
      <p className="ayuda">
        Ayudas de cultura, música y fiestas concedidas (BDNS). Quien recibe dinero para su programación, su festa major o su ciclo
        de conciertos tiene presupuesto para contratar: es a quien ofrecer el concierto.
      </p>
      {s.ayuntamiento.numero > 0 && (
        <>
          <h4>
            {pedania ? 'La pedanía' : 'El ayuntamiento'}: {euros.format(s.ayuntamiento.importe)} en {s.ayuntamiento.numero} {s.ayuntamiento.numero === 1 ? 'ayuda' : 'ayudas'}
          </h4>
          {lista(s.ayuntamiento.concesiones)}
        </>
      )}
      {s.entidades.length > 0 && (
        <>
          <h4>Entidades del municipio (asociaciones, comisiones de fiestas, pedanías…)</h4>
          <ul className="lista-entidades-subvencionadas">
            {s.entidades.slice(0, 20).map((e) => (
              <li key={e.nombre}>
                <details>
                  <summary>
                    <strong>{e.nombre}</strong>
                    {e.pedania && ' (pedanía)'} · {euros.format(e.importe)} en {e.numero} {e.numero === 1 ? 'ayuda' : 'ayudas'}
                    {e.ultima && ` · última ${fechaCorta(e.ultima)}`}
                  </summary>
                  {lista(e.concesiones)}
                </details>
              </li>
            ))}
          </ul>
          <p className="ayuda">Entidades que subvenciona el propio ayuntamiento o que llevan el nombre del municipio. Pueden faltar o colarse algunas.</p>
        </>
      )}
    </section>
  );
}

export function PaginaProgramador({ id }: { id: string }) {
  const [p, setP] = useState<Programador | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.programador(id).then(setP, (e: Error) => setError(e.message));
  }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p className="ayuda">Cargando…</p>;
  const estilos = (Object.entries(p.estilos) as [Estilo, number][]).sort((a, b) => b[1] - a[1]);
  const nombre = p.contacto && /ayuntamiento|ajuntament|concello|junta de gobierno|alcald/i.test(p.nombre) && !/instituto|patronato|fundaci|consorcio|organismo/i.test(p.nombre) ? `Ayuntamiento de ${p.contacto.municipio}` : p.nombre;
  return (
    <section className="pagina">
      <p className="migas">
        <a href="#/clientes">← Clientes</a>
      </p>
      <article className="tarjeta">
        <h2>{nombre}</h2>
        <p className="organo">
          {[p.ciudad, p.provincia !== p.ciudad ? p.provincia : null].filter(Boolean).join(', ')}
          {nombre !== p.nombre && ` · órgano de contratación: ${p.nombre}`}
        </p>
        <dl className="datos datos-grandes">
          <div>
            <dt>Conciertos contratados</dt>
            <dd>
              {p.contratos} <span className="ayuda">desde {fecha(p.primero)}</span>
            </dd>
          </div>
          {p.rango ? (
            <div>
              <dt>Paga normalmente{p.rango.deEstilo ? ' (jazz, clásica, ópera)' : ''}</dt>
              <dd>{p.rango.min === p.rango.max ? euros.format(p.rango.min) : `${euros.format(p.rango.min)} – ${euros.format(p.rango.max)}`}</dd>
            </div>
          ) : (
            p.importeHabitual != null && (
              <div>
                <dt>Suele pagar</dt>
                <dd>{euros.format(p.importeHabitual)}</dd>
              </div>
            )
          )}
          {p.meses.length > 0 && (
            <div>
              <dt>Contrata sobre todo en</dt>
              <dd>{mesesTexto(p.meses)}</dd>
            </div>
          )}
          <div>
            <dt>Estilos</dt>
            <dd>{estilos.length ? estilos.map(([e, n]) => `${NOMBRE_ESTILO[e]} (${n})`).join(', ') : 'Otros géneros'}</dd>
          </div>
          <div>
            <dt>Grupos distintos contratados</dt>
            <dd>{p.empresas}</dd>
          </div>
          <div>
            <dt>Total en música</dt>
            <dd>{euros.format(p.adjudicado)}</dd>
          </div>
        </dl>
        <p className="llamada">{comoContrata(p)}</p>
        <div className="botones-marca">
          <BotonCliente id={p.id} nombre={p.nombre} />
        </div>
        <footer className="enlaces">
          {p.web && (
            <a href={p.web} target="_blank" rel="noreferrer">
              Web ↗
            </a>
          )}
          <a href={`#/contratos?estado=adjudicadas&q=${encodeURIComponent(p.nombre)}`}>Todos sus contratos</a>
        </footer>
      </article>
      <EntidadCrm refId={p.id} />
      {p.contacto ? (
        <Contacto c={p.contacto} />
      ) : (
        <section className="bloque">
          <h3>A quién contactar</h3>
          <p className="ayuda">No tenemos un contacto directo de este organismo: escribe por su web o por la sede electrónica.</p>
        </section>
      )}
      {(p.abiertos?.length ?? 0) > 0 && (
        <section className="bloque">
          <h3>
            Contratos abiertos ahora <span className="contador">{p.abiertos!.length}</span>
          </h3>
          <p className="ayuda">Licitaciones de conciertos en las que se puede presentar oferta.</p>
          <ul className="filas">
            {p.abiertos!.map((c) => (
              <FilaContrato key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}
      {(p.proveedores?.length ?? 0) > 0 && (
        <section className="bloque">
          <h3>Quién le vende conciertos</h3>
          <p className="ayuda">Agencias, productoras y empresas que más contratos le han ganado (sin artistas que facturan como personas físicas).</p>
          <ul className="lista-simple">
            {p.proveedores!.map((x) => (
              <li key={x.nombre}>
                <strong>{x.nombre}</strong>
                <span className="ayuda">
                  {' '}
                  · {x.contratos} {x.contratos === 1 ? 'contrato' : 'contratos'} · {euros.format(x.importe)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {p.subvencionesRecibidas && (p.subvencionesRecibidas.ayuntamiento.numero > 0 || p.subvencionesRecibidas.entidades.length > 0) && (
        <SubvencionesRecibidasBloque s={p.subvencionesRecibidas} pedania={p.id.startsWith('p-ped-')} />
      )}
      {(p.ayudas?.length ?? 0) > 0 && (
        <section className="bloque">
          <h3>Ayudas de su ayuntamiento</h3>
          <p className="ayuda">Ayudas para música o programación que convoca: indican presupuesto y qué tipo de propuestas apoya.</p>
          <ul className="filas">
            {p.ayudas!.map((c) => (
              <FilaConvocatoria key={c.id} m={{ convocatoria: c, plazo: c.plazo, puntuacion: 0, encaje: 'directo', motivos: [], avisos: [] }} destino />
            ))}
          </ul>
        </section>
      )}
      {(p.recientesEstilo?.length ?? 0) > 0 && (
        <section className="bloque">
          <h3>Sus conciertos de jazz, clásica y ópera</h3>
          <p className="ayuda">Qué programa, por cuánto (sin IVA) y a quién: la mejor pista de qué propuesta le encaja.</p>
          <Fuentes fuentes={p.recientesEstilo!} />
        </section>
      )}
      <details className="bloque">
        <summary>
          <strong>Todo lo último que ha contratado</strong> <span className="ayuda">(incluye orquestas de fiestas, bandas…)</span>
        </summary>
        <Fuentes fuentes={p.recientes ?? []} />
      </details>
      <p className="ayuda">Datos de la Plataforma de Contratación del Sector Público.</p>
    </section>
  );
}

export function PaginaFestival({ id }: { id: string }) {
  const [f, setF] = useState<Festival | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.festival(id).then(setF, (e: Error) => setError(e.message));
  }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!f) return <p className="ayuda">Cargando…</p>;
  return (
    <section className="pagina">
      <p className="migas">
        <a href="#/donde-tocar?ver=festivales">← Festivales y ciclos</a>
      </p>
      <article className="tarjeta">
        <div className="etiquetas">
          {f.estilos.map((e) => (
            <Etiqueta key={e}>{NOMBRE_ESTILO[e]}</Etiqueta>
          ))}
          {!f.musical && <Etiqueta tono="aviso">Multidisciplinar o de fiestas</Etiqueta>}
          {f.ccaa && <Etiqueta>{f.ccaa}</Etiqueta>}
        </div>
        <h2>{f.nombre}</h2>
        <p className="organo">{[f.lugar, f.provincia !== f.lugar ? f.provincia : null].filter(Boolean).join(', ')}</p>
        <dl className="datos">
          <div>
            <dt>Años con datos</dt>
            <dd>{aniosTexto(f.anios)}</dd>
          </div>
          {f.dinero > 0 && (
            <div>
              <dt>En contratos y ayudas</dt>
              <dd>{euros.format(f.dinero)}</dd>
            </div>
          )}
          <div>
            <dt>Organiza o financia</dt>
            <dd>{f.organizadores.join(' · ')}</dd>
          </div>
        </dl>
      </article>
      {!!f.directorios?.length && (
        <section className="bloque">
          <h3>Contacto</h3>
          {f.directorios.map((d) => (
            <div key={d.url} className="ficha-directorio-externo">
              <dl className="datos">
                {d.organizador && (
                  <div>
                    <dt>Entidad organizadora</dt>
                    <dd>{d.organizador}</dd>
                  </div>
                )}
                {d.web && (
                  <div>
                    <dt>Web</dt>
                    <dd>
                      <a href={d.web} target="_blank" rel="noreferrer">
                        {d.web.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} ↗
                      </a>
                    </dd>
                  </div>
                )}
                {d.email && (
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${d.email}`}>{d.email}</a>
                    </dd>
                  </div>
                )}
                {d.telefono && (
                  <div>
                    <dt>Teléfono</dt>
                    <dd>{d.telefono}</dd>
                  </div>
                )}
                {d.inicio && (
                  <div>
                    <dt>Última edición publicada</dt>
                    <dd>{[d.inicio, d.fin].filter(Boolean).map((x) => new Date(`${x}T12:00:00`).toLocaleDateString('es-ES')).join(' – ')}</dd>
                  </div>
                )}
              </dl>
              {d.descripcion && <p>{d.descripcion}</p>}
              <p className="ayuda">
                Ficha en{' '}
                <a href={d.url} target="_blank" rel="noreferrer">
                  {d.directorio} ↗
                </a>
                . Solo datos de la entidad, no de personas.
              </p>
            </div>
          ))}
        </section>
      )}
      {!!f.fuentes?.length && (
        <section className="bloque">
          <h3>Fuentes</h3>
          <p className="ayuda">Contratos y subvenciones donde aparece este festival o ciclo, de lo más reciente a lo más antiguo.</p>
          <Fuentes fuentes={f.fuentes ?? []} />
        </section>
      )}
      <p className="ayuda">
        Ficha construida automáticamente a partir de los títulos oficiales: puede juntar ediciones con nombres algo distintos o
        separar un mismo festival si cambia de nombre.
      </p>
    </section>
  );
}
