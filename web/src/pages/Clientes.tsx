import { useEffect, useState } from 'react';
import { api } from '../api';
import { BotonCliente, nombreCliente } from '../components/Cliente';
import { cambiarParams, enlace, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Estilo, type Meta, type Programador } from '../tipos';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const TIPOS: [string, string][] = [
  ['', 'Todos'],
  ['ayuntamiento', 'Ayuntamientos'],
  ['auditorio', 'Auditorios'],
  ['teatro', 'Teatros'],
  ['festival', 'Festivales'],
  ['otro', 'Otros'],
];

/** Un cliente en la lista: quién es, qué programa, cuánto y cuándo contrata, y a quién llamar. */
function FilaClienteNueva({ p, estilo, mesActual }: { p: Programador; estilo?: Estilo; mesActual: number }) {
  const estilos = (Object.entries(p.estilos) as [Estilo, number][]).sort((a, b) => b[1] - a[1]);
  const c = p.contactoBreve;
  const tel = c?.telefono?.split(/\s*[;/]\s*/)[0];
  const email = c?.email?.split(/;\s*/)[0];
  const pronto = p.meses.some((m) => [mesActual, (mesActual % 12) + 1].includes(m));
  return (
    <li className="fila-cli">
      <div className="fila-cli-quien">
        <a className="fila-ayuda-titulo" href={enlace('programador', p.id)}>
          {nombreCliente(p)}
        </a>
        <span className="fila-ayuda-detalle">{[p.ciudad, p.provincia !== p.ciudad ? p.provincia : null].filter(Boolean).join(', ')}</span>
        <span className="etiquetas">
          {estilos.map(([e, n]) => (
            <span key={e} className={`etiqueta${e === estilo ? ' etiqueta-acento' : ''}`}>
              {NOMBRE_ESTILO[e]} {n}
            </span>
          ))}
          {p.contratos > 0 && p.menores / p.contratos >= 0.7 && <span className="etiqueta" title="La mayoría de sus conciertos son contratos menores: lo decide el programador">Sin concurso</span>}
        </span>
      </div>
      <dl className="fila-cli-datos">
        <div>
          <dt>Conciertos</dt>
          <dd>{p.contratos}</dd>
        </div>
        <div>
          <dt>Paga</dt>
          <dd>{p.rango ? (p.rango.min === p.rango.max ? euros.format(p.rango.min) : `${euros.format(p.rango.min)}–${euros.format(p.rango.max)}`) : p.importeHabitual != null ? euros.format(p.importeHabitual) : '—'}</dd>
        </div>
        <div>
          <dt>Contrata en</dt>
          <dd className={pronto ? 'tono-verde' : ''}>{p.meses.length ? p.meses.map((m) => MES_CORTO[m - 1]).join(', ') : '—'}</dd>
        </div>
      </dl>
      <div className="fila-cli-contacto">
        {c?.nombre ? (
          <span className="contacto-nombre">
            <strong>{c.nombre}</strong>
            {c.cargo && <span>{c.cargo}</span>}
          </span>
        ) : (
          <span className="ayuda">{c ? (c.deCultura ? 'Cultura' : 'Contacto general') : 'Sin contacto directo'}</span>
        )}
        <span className="botones-contacto">
          {tel && (
            <a className="boton-icono borde" href={`tel:${tel.replace(/[^\d+]/g, '')}`} title={`Llamar: ${tel}`} aria-label={`Llamar al ${tel}`}>
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
              </svg>
            </a>
          )}
          {email && (
            <a className="boton-icono borde" href={`mailto:${email}`} title={`Escribir: ${email}`} aria-label={`Escribir a ${email}`}>
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
              </svg>
            </a>
          )}
          <BotonCliente id={p.id} nombre={p.nombre} compacto />
        </span>
      </div>
    </li>
  );
}

/** Quien contrata música en directo (ayuntamientos, diputaciones, teatros...), con a quién llamar y cuándo. */
export function Clientes({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  const [f, setF] = useState({
    q: p.get('q') ?? '',
    ccaa: p.get('ccaa') ?? '',
    estilo: p.get('estilo') ?? '',
    mes: p.get('mes') ?? '',
    contacto: p.get('contacto') ?? '',
    tipo: p.get('tipo') ?? '',
    orden: p.get('orden') ?? '',
    pagina: Number(p.get('pagina')) || 1,
  });
  const [r, setR] = useState<{ total: number; porPagina: number; items: Programador[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consulta = new URLSearchParams(Object.entries({ ...f, pagina: String(f.pagina) }).filter(([, v]) => v && v !== '1')).toString();
  const cambiar = (clave: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [clave]: e.target.value, pagina: 1 });

  useEffect(() => {
    cambiarParams({ ...f, pagina: f.pagina > 1 ? f.pagina : undefined });
    setR(null);
    const t = setTimeout(() => api.programadores(consulta).then(setR, (e: Error) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [consulta]);

  const paginas = r ? Math.ceil(r.total / r.porPagina) : 0;
  const mesActual = new Date().getMonth() + 1;
  return (
    <section className="clientes">
      <div className="pestanas-pagina" role="tablist" aria-label="Tipo de entidad">
        {TIPOS.map(([v, n]) => (
          <button key={v} type="button" role="tab" aria-selected={f.tipo === v} className={f.tipo === v ? 'activa' : ''} onClick={() => cambiar('tipo')({ target: { value: v } })}>
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
          <input type="search" placeholder="Buscar: Sevilla, auditorio, diputación…" value={f.q} onChange={cambiar('q')} aria-label="Buscar" />
        </label>
        <select value={f.ccaa} onChange={cambiar('ccaa')} aria-label="Comunidad autónoma">
          <option value="">Toda España</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={f.estilo} onChange={cambiar('estilo')} aria-label="Estilo">
          <option value="">Cualquier estilo</option>
          {meta.estilos.map((e: Estilo) => (
            <option key={e} value={e}>
              Contrata {NOMBRE_ESTILO[e].toLowerCase()}
            </option>
          ))}
        </select>
        <select value={f.mes} onChange={cambiar('mes')} aria-label="Mes">
          <option value="">Cualquier mes</option>
          {f.mes.includes(',') && <option value={f.mes}>En {f.mes.split(',').map((m) => MESES[Number(m) - 1]).join(' o ')}</option>}
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              Contrata en {m}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="cabecera-resultados">
        <p className="recuento">
          {r ? (
            <>
              <strong>{r.total.toLocaleString('es-ES')}</strong> {r.total === 1 ? 'cliente' : 'clientes'} · <a href="#/contactos">directorio de responsables de cultura</a>
            </>
          ) : (
            'Cargando…'
          )}
        </p>
        <label className="casilla">
          <input type="checkbox" checked={f.contacto === 'si'} onChange={(e) => setF({ ...f, contacto: e.target.checked ? 'si' : '', pagina: 1 })} /> Solo con contacto de cultura
        </label>
        <select value={f.orden} onChange={cambiar('orden')} aria-label="Orden">
          <option value="">Más conciertos</option>
          <option value="adjudicado">Más dinero en música</option>
          <option value="reciente">Contratación más reciente</option>
        </select>
      </div>
      {r && (
        <>
          {r.items.length === 0 ? (
            <div className="bloque vacio">
              <h2>Ningún cliente con estos filtros</h2>
              <p className="ayuda">Quita el mes, el estilo o la comunidad.</p>
            </div>
          ) : (
            <ul className="lista-ayudas lista-clientes">
              {r.items.map((x) => (
                <FilaClienteNueva key={x.id} p={x} estilo={(f.estilo || undefined) as Estilo | undefined} mesActual={mesActual} />
              ))}
            </ul>
          )}
          {paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas">
              <button className="boton-secundario" disabled={f.pagina <= 1} onClick={() => setF({ ...f, pagina: f.pagina - 1 })}>
                ← Anterior
              </button>
              <span>
                Página {f.pagina} de {paginas}
              </span>
              <button className="boton-secundario" disabled={f.pagina >= paginas} onClick={() => setF({ ...f, pagina: f.pagina + 1 })}>
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
