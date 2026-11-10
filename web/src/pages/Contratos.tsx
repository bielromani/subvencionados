import { useEffect, useState } from 'react';
import { api } from '../api';
import { adjudicatarios, ESTADO_CONTRATO } from '../components/FilaContrato';
import { cambiarParams, enlace, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Contrato, type Meta } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fechaLarga = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const mes = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
const diasHasta = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);

/** Fecha clave del contrato: fin de ofertas si está abierto; si no, la adjudicación. */
function FechaContrato({ c }: { c: Contrato }) {
  if (c.abierta && c.finPlazo) {
    const d = diasHasta(c.finPlazo);
    return (
      <span className={`calendario-dia${d <= 7 ? ' urgente' : ''}`} title={`Ofertas hasta el ${fechaLarga(c.finPlazo)}`}>
        <small>{mes(c.finPlazo)}</small>
        <b>{Number(c.finPlazo.slice(8, 10))}</b>
        <small>{d <= 0 ? 'hoy' : `${d} d`}</small>
      </span>
    );
  }
  if (c.fechaAdjudicacion)
    return (
      <span className="calendario-dia sin-fecha" title={`Adjudicado el ${fechaLarga(c.fechaAdjudicacion)}`}>
        <small>{mes(c.fechaAdjudicacion)}</small>
        <b>{c.fechaAdjudicacion.slice(2, 4)}</b>
        <small>adj.</small>
      </span>
    );
  return (
    <span className="calendario-dia sin-fecha">
      <small>{(ESTADO_CONTRATO[c.estado ?? ''] ?? 'sin fecha').toLowerCase().slice(0, 9)}</small>
      <b>—</b>
    </span>
  );
}

/** Un contrato en la lista: cuándo, qué, quién lo convoca, cuánto y a quién se adjudicó. */
function FilaLicitacion({ c }: { c: Contrato }) {
  const quien = adjudicatarios(c);
  const importe = c.adjudicado ?? c.importe;
  return (
    <li className="fila-ayuda">
      <FechaContrato c={c} />
      <div className="fila-ayuda-texto">
        <span className="etiquetas">
          {c.abierta ? <span className="etiqueta etiqueta-exito">Se puede presentar oferta</span> : <span className="etiqueta">{ESTADO_CONTRATO[c.estado ?? ''] ?? c.estado ?? 'Sin estado'}</span>}
          {c.menor && (
            <span className="etiqueta" title="Contrato menor: lo adjudica directamente el organismo, sin concurso">
              Contrato menor
            </span>
          )}
          {c.estilos.map((e) => (
            <span key={e} className="etiqueta etiqueta-acento">
              {NOMBRE_ESTILO[e]}
            </span>
          ))}
        </span>
        <a className="fila-ayuda-titulo" href={enlace('contrato', c.id)}>
          {c.titulo}
        </a>
        <span className="fila-ayuda-detalle">
          {c.organo.nombre}
          {c.organo.ciudad && ` · ${c.organo.ciudad}`}
          {c.provincia && c.provincia !== c.organo.ciudad && ` (${c.provincia})`}
        </span>
        {quien && <span className="fila-ayuda-detalle">Adjudicado a {quien}</span>}
      </div>
      <div className="fila-ayuda-lado">
        {importe != null && (
          <span className="importe">
            {euros.format(importe)}
            <small>{c.adjudicado != null ? 'adjudicado, sin IVA' : 'presupuesto, sin IVA'}</small>
          </span>
        )}
      </div>
    </li>
  );
}

const ESTADOS: [string, string][] = [
  ['abiertas', 'Abiertas'],
  ['adjudicadas', 'Adjudicadas (precedentes)'],
  ['', 'Todas'],
];

/** Contratos públicos de música: licitaciones abiertas a las que presentarse y adjudicaciones anteriores. */
export function Contratos({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  const [filtros, setFiltros] = useState({
    q: p.get('q') ?? '',
    estado: p.get('estado') ?? 'abiertas',
    ccaa: p.get('ccaa') ?? '',
    estilo: p.get('estilo') ?? '',
    menor: p.get('menor') ?? '',
    todos: p.get('todos') ?? '',
    orden: p.get('orden') ?? '',
    pagina: Number(p.get('pagina')) || 1,
  });
  const [r, setR] = useState<{ total: number; ocultos?: number; porPagina: number; items: Contrato[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consulta = new URLSearchParams(
    Object.entries({ ...filtros, orden: filtros.orden || (filtros.estado === 'abiertas' ? 'cierre' : ''), pagina: String(filtros.pagina) }).filter(([, v]) => v && v !== '1'),
  ).toString();

  useEffect(() => {
    cambiarParams({ ...filtros, pagina: filtros.pagina > 1 ? filtros.pagina : undefined });
    setR(null);
    const t = setTimeout(() => api.contratos(consulta).then(setR, (e: Error) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [consulta]);

  const cambiar = (clave: keyof typeof filtros) => (e: { target: { value: string } }) => setFiltros((f) => ({ ...f, [clave]: e.target.value, pagina: 1 }));
  const paginas = r ? Math.ceil(r.total / r.porPagina) : 0;

  return (
    <section className="licitaciones">
      <div className="pestanas-pagina" role="tablist" aria-label="Estado">
        {ESTADOS.map(([v, n]) => (
          <button key={v} type="button" role="tab" aria-selected={filtros.estado === v} className={filtros.estado === v ? 'activa' : ''} onClick={() => cambiar('estado')({ target: { value: v } })}>
            {n}
          </button>
        ))}
      </div>
      <div className="buscador-filtros">
        <label className="buscador">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input type="search" placeholder="Buscar: orquesta, fiestas, Lugo, empresa…" value={filtros.q} onChange={cambiar('q')} aria-label="Buscar" />
        </label>
        <select value={filtros.ccaa} onChange={cambiar('ccaa')} aria-label="Comunidad">
          <option value="">Toda España</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={filtros.estilo} onChange={cambiar('estilo')} aria-label="Estilo">
          <option value="">Cualquier música</option>
          {meta.estilos.map((e) => (
            <option key={e} value={e}>
              Menciona {NOMBRE_ESTILO[e].toLowerCase()}
            </option>
          ))}
        </select>
        <select value={filtros.menor} onChange={cambiar('menor')} aria-label="Tipo de contrato">
          <option value="">Licitaciones y menores</option>
          <option value="no">Solo licitaciones</option>
          <option value="si">Solo contratos menores</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="cabecera-resultados">
        <p className="recuento">{r ? <><strong>{r.total.toLocaleString('es-ES')}</strong> {r.total === 1 ? 'contrato' : 'contratos'}</> : 'Cargando…'}</p>
        {(filtros.todos === 'si' || (r?.ocultos ?? 0) > 0) && (
          <label className="casilla">
            <input type="checkbox" checked={filtros.todos === 'si'} onChange={(e) => setFiltros((f) => ({ ...f, todos: e.target.checked ? 'si' : '', pagina: 1 }))} />
            Mostrar también pirotecnia, animación infantil, verbenas…{filtros.todos !== 'si' && r?.ocultos ? ` (${r.ocultos})` : ''}
          </label>
        )}
        <select value={filtros.orden} onChange={cambiar('orden')} aria-label="Orden">
          <option value="">{filtros.estado === 'abiertas' ? 'Cierran antes primero' : 'Más recientes primero'}</option>
          <option value="importe">Mayor importe</option>
        </select>
      </div>
      {r && (
        <>
          {r.items.length === 0 ? (
            <div className="bloque vacio">
              <h2>Ningún contrato con estos filtros</h2>
              <p className="ayuda">{filtros.estado === 'abiertas' ? 'Ahora mismo no hay licitaciones abiertas así. Mira las adjudicadas para ver quién contrata y a qué precio.' : 'Quita algún filtro.'}</p>
            </div>
          ) : (
            <ul className="lista-ayudas">
              {r.items.map((c) => (
                <FilaLicitacion key={c.id} c={c} />
              ))}
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
          <p className="nota-fuente">
            Fuente: Plataforma de Contratación del Sector Público, con las plataformas autonómicas agregadas y los contratos menores, y el Registre públic de contractes de Catalunya (Generalitat). Las adjudicaciones muestran quién contrata
            música, a qué precio y qué empresas se los llevan; las personas físicas no se muestran.
          </p>
        </>
      )}
    </section>
  );
}
