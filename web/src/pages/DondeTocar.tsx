import { GestionIntegral } from '../components/GestionIntegral';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { aniosTexto, FilaProgramador, Fuentes } from '../components/Directorio';
import { cambiarParams, enlace, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Circuito, type Festival, type Meta, type Programador } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** Un festival en la lista: cuántos años hay datos, dónde es, quién lo organiza y cuánto mueve. */
function FilaFestivalNueva({ f }: { f: Festival }) {
  const ultimo = f.anios.at(-1);
  return (
    <li className="fila-ayuda">
      <span className="calendario-dia sin-fecha" title={aniosTexto(f.anios)}>
        <small>años</small>
        <b>{f.anios.length}</b>
        <small>{ultimo ?? '—'}</small>
      </span>
      <div className="fila-ayuda-texto">
        <span className="etiquetas">
          {f.estilos.map((e) => (
            <span key={e} className="etiqueta etiqueta-acento">
              {NOMBRE_ESTILO[e]}
            </span>
          ))}
          {!f.musical && <span className="etiqueta etiqueta-aviso">Multidisciplinar o de fiestas</span>}
        </span>
        <a className="fila-ayuda-titulo" href={enlace('festival', f.id)}>
          {f.nombre}
        </a>
        <span className="fila-ayuda-detalle">
          {[f.lugar, f.provincia !== f.lugar ? f.provincia : null].filter(Boolean).join(', ') || f.ccaa || 'Lugar no indicado'} · {aniosTexto(f.anios)}
        </span>
        {f.organizadores.length > 0 && <span className="fila-ayuda-detalle">Organiza: {f.organizadores.slice(0, 2).join(' · ')}</span>}
      </div>
      <div className="fila-ayuda-lado">
        {f.dinero > 0 && (
          <span className="importe">
            {euros.format(f.dinero)}
            <small>en contratos y ayudas</small>
          </span>
        )}
      </div>
    </li>
  );
}

type Pestana = 'festivales' | 'programadores' | 'circuitos' | 'gestion';

/** Dónde colocar a los grupos: festivales y ciclos, programadores públicos y circuitos, con sus fuentes. */
export function DondeTocar({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  // Los programadores tienen ahora su propia sección (Clientes): los enlaces antiguos llevan allí.
  if (p.get('ver') === 'programadores') window.location.hash = '#/clientes';
  const [pestana, setPestana] = useState<Pestana>(p.get('ver') === 'circuitos' ? 'circuitos' : p.get('ver') === 'gestion' ? 'gestion' : 'festivales');
  const [filtros, setFiltros] = useState({ q: p.get('q') ?? '', ccaa: p.get('ccaa') ?? '', estilo: p.get('estilo') ?? '', orden: p.get('orden') ?? '', todos: p.get('todos') ?? '', contacto: p.get('contacto') ?? '', pagina: Number(p.get('pagina')) || 1 });
  const [r, setR] = useState<{ total: number; porPagina: number; items: (Festival | Programador)[] } | null>(null);
  const [circuitos, setCircuitos] = useState<Circuito[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consulta = new URLSearchParams(Object.entries({ ...filtros, pagina: String(filtros.pagina) }).filter(([, v]) => v && v !== '1')).toString();

  useEffect(() => {
    cambiarParams({ ver: pestana, ...filtros, pagina: filtros.pagina > 1 ? filtros.pagina : undefined });
    if (pestana === 'gestion') return;
    if (pestana === 'circuitos') {
      if (!circuitos) api.circuitos().then((x) => setCircuitos(x.items), (e: Error) => setError(e.message));
      return;
    }
    setR(null);
    const t = setTimeout(() => (pestana === 'festivales' ? api.festivales(consulta) : api.programadores(consulta)).then(setR, (e: Error) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [pestana, consulta]);

  const cambiar = (clave: keyof typeof filtros) => (e: { target: { value: string } }) => setFiltros((f) => ({ ...f, [clave]: e.target.value, pagina: 1 }));
  const paginas = r ? Math.ceil(r.total / r.porPagina) : 0;

  const PESTANAS: [Pestana, string, string][] = [
    ['festivales', 'Festivales y ciclos', 'Festivales y ciclos que aparecen en contratos públicos y subvenciones: dónde son, desde cuándo hay datos, quién los organiza y cuánto mueven. Cada ficha enlaza sus fuentes.'],
    ['gestion', 'Gestión integral', 'Dónde ofrecer el diseño, la producción y la gestión completa de un festival o ciclo: quien ya licita su organización, quien monta un ciclo concierto a concierto y quien organiza festivales propios.'],
    ['circuitos', 'Circuitos', 'Redes públicas de programación que aparecen en los contratos y convocatorias, con sus apariciones en los datos oficiales.'],
  ];
  return (
    <section className="festivales">
      <div className="pestanas-pagina" role="tablist" aria-label="Secciones">
        {PESTANAS.map(([id, nombre]) => (
          <button key={id} type="button" role="tab" aria-selected={id === pestana} className={id === pestana ? 'activa' : ''} onClick={() => setPestana(id)}>
            {nombre}
          </button>
        ))}
      </div>
      <p className="intro-pestana">{PESTANAS.find(([id]) => id === pestana)?.[2]}</p>

      {pestana === 'gestion' && <GestionIntegral meta={meta} />}

      {pestana !== 'circuitos' && pestana !== 'gestion' && (
        <>
          <div className="buscador-filtros">
            <label className="buscador">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
              <input type="search" placeholder="Buscar por nombre, ciudad u organizador…" value={filtros.q} onChange={cambiar('q')} aria-label="Buscar" />
            </label>
            <select value={filtros.ccaa} onChange={cambiar('ccaa')} aria-label="Comunidad">
              <option value="">Toda España</option>
              {meta.ccaa.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={filtros.estilo} onChange={cambiar('estilo')} aria-label="Estilo">
              <option value="">Cualquier estilo</option>
              {meta.estilos.map((e) => (
                <option key={e} value={e}>
                  {NOMBRE_ESTILO[e]}
                </option>
              ))}
            </select>
            <select value={filtros.orden} onChange={cambiar('orden')} aria-label="Orden">
              <option value="">{pestana === 'festivales' ? 'Más años con datos' : 'Más contratos'}</option>
              <option value="reciente">Más recientes</option>
              <option value={pestana === 'festivales' ? 'dinero' : 'adjudicado'}>Más dinero</option>
            </select>
          </div>
          <div className="cabecera-resultados">
            <p className="recuento">{r ? <><strong>{r.total.toLocaleString('es-ES')}</strong> {pestana === 'festivales' ? 'festivales y ciclos' : 'resultados'}</> : 'Cargando…'}</p>
            {pestana === 'festivales' && (
              <label className="casilla">
                <input type="checkbox" checked={filtros.todos === 'true'} onChange={(e) => setFiltros((f) => ({ ...f, todos: e.target.checked ? 'true' : '', pagina: 1 }))} /> Incluir multidisciplinares y de fiestas
              </label>
            )}
            {pestana === 'programadores' && (
              <label className="casilla">
                <input type="checkbox" checked={filtros.contacto === 'si'} onChange={(e) => setFiltros((f) => ({ ...f, contacto: e.target.checked ? 'si' : '', pagina: 1 }))} /> Solo con contacto de cultura
              </label>
            )}
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}

      {pestana !== 'circuitos' && pestana !== 'gestion' && r && (
        <>
          {r.items.length === 0 ? (
            <div className="bloque vacio">
              <h2>Ningún resultado con estos filtros</h2>
              <p className="ayuda">Quita el estilo o la comunidad.</p>
            </div>
          ) : (
            <ul className={pestana === 'festivales' ? 'lista-ayudas' : 'filas bloque'}>
              {r.items.map((x) => (pestana === 'festivales' ? <FilaFestivalNueva key={x.id} f={x as Festival} /> : <FilaProgramador key={x.id} p={x as Programador} />))}
            </ul>
          )}
          {paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas">
              <button className="boton-secundario" disabled={filtros.pagina <= 1} onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina - 1 }))}>
                ← Anterior
              </button>
              <span>
                Página {filtros.pagina} de {paginas}
              </span>
              <button className="boton-secundario" disabled={filtros.pagina >= paginas} onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina + 1 }))}>
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}

      {pestana === 'circuitos' && !circuitos && !error && <p className="ayuda">Cargando…</p>}
      {pestana === 'circuitos' && circuitos && (
        <div className="rejilla-circuitos">
          {circuitos.map((c) => (
            <section className="circuito" key={c.id}>
              <header>
                <h3>{c.nombre}</h3>
                <span className="etiqueta">{c.ambito}</span>
              </header>
              <dl className="produccion-datos">
                <div>
                  <dt>Apariciones</dt>
                  <dd>{c.menciones}</dd>
                </div>
                <div>
                  <dt>Datos</dt>
                  <dd>{aniosTexto(c.anios)}</dd>
                </div>
              </dl>
              {c.organismos.length > 0 && (
                <p className="ayuda">
                  {c.organismos
                    .slice(0, 3)
                    .map((o) => o.nombre)
                    .join(' · ')}
                </p>
              )}
              <details className="concesiones">
                <summary>Ver las {Math.min(c.fuentes.length, 20)} apariciones más recientes</summary>
                <Fuentes fuentes={c.fuentes} />
              </details>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
