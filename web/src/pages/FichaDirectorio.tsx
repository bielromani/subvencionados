import { useEffect, useState } from 'react';
import { api } from '../api';
import { aniosTexto, Fuentes, mesesTexto } from '../components/Directorio';
import { Etiqueta } from '../components/TarjetaConvocatoria';
import { NOMBRE_ESTILO, type Estilo, type Festival, type Programador } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : '—');

export function PaginaProgramador({ id }: { id: string }) {
  const [p, setP] = useState<Programador | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.programador(id).then(setP, (e: Error) => setError(e.message));
  }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p className="ayuda">Cargando…</p>;
  return (
    <section className="pagina">
      <p className="migas">
        <a href="#/donde-tocar?ver=programadores">← Programadores</a>
      </p>
      <article className="tarjeta">
        <div className="etiquetas">
          {(Object.entries(p.estilos) as [Estilo, number][]).map(([e, n]) => (
            <Etiqueta key={e}>
              {NOMBRE_ESTILO[e]}: {n}
            </Etiqueta>
          ))}
          {p.ccaa && <Etiqueta>{p.ccaa}</Etiqueta>}
        </div>
        <h2>{p.nombre}</h2>
        <p className="organo">{[p.ciudad, p.provincia !== p.ciudad ? p.provincia : null].filter(Boolean).join(', ')}</p>
        <dl className="datos">
          <div>
            <dt>Contratos de música</dt>
            <dd>
              {p.contratos} ({p.menores} menores)
            </dd>
          </div>
          <div>
            <dt>Adjudicado</dt>
            <dd>{euros.format(p.adjudicado)} sin IVA</dd>
          </div>
          {p.importeHabitual != null && (
            <div>
              <dt>Importe habitual</dt>
              <dd>{euros.format(p.importeHabitual)}</dd>
            </div>
          )}
          <div>
            <dt>Empresas distintas</dt>
            <dd>{p.empresas}</dd>
          </div>
          <div>
            <dt>Periodo</dt>
            <dd>
              {fecha(p.primero)} – {fecha(p.ultimo)}
            </dd>
          </div>
          {p.meses.length > 0 && (
            <div>
              <dt>Meses con más contratos</dt>
              <dd>{mesesTexto(p.meses)}</dd>
            </div>
          )}
        </dl>
        {p.web && (
          <footer className="enlaces">
            <a href={p.web} target="_blank" rel="noreferrer">
              Web del organismo ↗
            </a>
            <a href={`#/contratos?estado=adjudicadas&q=${encodeURIComponent(p.nombre)}`}>Todos sus contratos</a>
          </footer>
        )}
      </article>
      <section className="bloque">
        <h3>Últimos contratos</h3>
        <Fuentes fuentes={p.recientes ?? []} />
      </section>
      <p className="ayuda">Datos de la Plataforma de Contratación del Sector Público (importes sin IVA).</p>
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
