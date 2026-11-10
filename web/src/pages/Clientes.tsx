import { useEffect, useState } from 'react';
import { api } from '../api';
import { FilaClienteNueva } from '../components/Cliente';
import { CopiarEmails } from '../components/CopiarEmails';
import { cambiarParams, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Estilo, type Meta, type Programador } from '../tipos';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TIPOS: [string, string][] = [
  ['', 'Todos'],
  ['ayuntamiento', 'Ayuntamientos'],
  ['auditorio', 'Auditorios'],
  ['teatro', 'Teatros'],
  ['festival', 'Festivales'],
  ['pedania', 'Pedanías'],
  ['otro', 'Otros'],
];

export function Clientes({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  const [f, setF] = useState({
    q: p.get('q') ?? '',
    ccaa: p.get('ccaa') ?? '',
    estilo: p.get('estilo') ?? '',
    mes: p.get('mes') ?? '',
    contacto: p.get('contacto') ?? '',
    subvenciones: p.get('subvenciones') ?? '',
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
      <CopiarEmails consulta={consulta} cargar={api.emailsClientes} />
      <div className="cabecera-resultados">
        <p className="recuento">
          {r ? (
            <>
              <strong>{r.total.toLocaleString('es-ES')}</strong> {r.total === 1 ? 'cliente' : 'clientes'}
            </>
          ) : (
            'Cargando…'
          )}
        </p>
        <label className="casilla">
          <input type="checkbox" checked={f.contacto === 'si'} onChange={(e) => setF({ ...f, contacto: e.target.checked ? 'si' : '', pagina: 1 })} /> Solo con contacto de cultura
        </label>
        <label className="casilla" title="Ayuntamientos, pedanías y entidades del municipio que reciben ayudas de cultura o música">
          <input type="checkbox" checked={f.subvenciones === 'si'} onChange={(e) => setF({ ...f, subvenciones: e.target.checked ? 'si' : '', pagina: 1 })} /> Solo con ayudas recibidas
        </label>
        <select value={f.orden} onChange={cambiar('orden')} aria-label="Orden">
          <option value="">Más conciertos</option>
          <option value="adjudicado">Más dinero en música</option>
          <option value="reciente">Contratación más reciente</option>
          <option value="subvenciones">Más ayudas recibidas</option>
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
