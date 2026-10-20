import { useEffect, useState } from 'react';
import { api } from '../api';
import { BotonCliente } from '../components/Cliente';
import { Contacto } from '../components/Contacto';
import { FilaContrato } from '../components/FilaContrato';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { aniosTexto, Fuentes, mesesTexto } from '../components/Directorio';
import { Etiqueta } from '../components/TarjetaConvocatoria';
import { NOMBRE_ESTILO, type Estilo, type Festival, type Programador } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : '—');

/** Contratos menores (hasta 15.000 € sin IVA en servicios): se adjudican sin concurso, basta con convencer al programador. */
function comoContrata(p: Programador): string {
  const pct = p.contratos ? Math.round((p.menores / p.contratos) * 100) : 0;
  if (pct >= 70) return `El ${pct} % de sus conciertos son contratos menores (sin concurso): lo decide el programador, así que llamar y enviar propuesta funciona.`;
  if (pct >= 30) return `El ${pct} % son contratos menores (sin concurso) y el resto, licitaciones: llama para lo pequeño y vigila sus contratos abiertos.`;
  return `Contrata sobre todo por licitación (solo el ${pct} % son contratos menores): vigila sus contratos abiertos y presenta oferta.`;
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
      <section className="bloque">
        <h3>Fuentes</h3>
        <p className="ayuda">Contratos y subvenciones donde aparece este festival o ciclo, de lo más reciente a lo más antiguo.</p>
        <Fuentes fuentes={f.fuentes ?? []} />
      </section>
      <p className="ayuda">
        Ficha construida automáticamente a partir de los títulos oficiales: puede juntar ediciones con nombres algo distintos o
        separar un mismo festival si cambia de nombre.
      </p>
    </section>
  );
}
