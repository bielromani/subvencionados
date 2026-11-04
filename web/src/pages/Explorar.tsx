import { useEffect, useState } from 'react';
import { api, type Filtros } from '../api';
import { BotonesMarca } from '../components/BotonesMarca';
import { useMarcas } from '../marcas';
import { cambiarParams, enlace, type Ruta } from '../ruta';
import { NOMBRE_DESTINO, NOMBRE_ESTILO, type Convocatoria, type Meta } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const diasHasta = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
const MES = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');

/** Cuándo: cierre (exacto o aproximado), apertura próxima o solo el estado. */
function Cuando({ c }: { c: Convocatoria }) {
  const fin = c.fechaFinSolicitud ?? c.cierreAproximado ?? null;
  if (c.plazo === 'proxima' && c.fechaInicioSolicitud)
    return (
      <span className="calendario-dia tono-proxima">
        <small>abre</small>
        <b>{Number(c.fechaInicioSolicitud.slice(8, 10))}</b>
        <small>{MES(c.fechaInicioSolicitud)}</small>
      </span>
    );
  if (c.plazo === 'abierta' && fin) {
    const d = diasHasta(fin);
    return (
      <span className={`calendario-dia${d <= 7 ? ' urgente' : ''}`} title={c.fechaFinSolicitud ? 'Fecha de cierre' : 'Cierre aproximado, calculado del texto del plazo'}>
        <small>{MES(fin)}</small>
        <b>{Number(fin.slice(8, 10))}</b>
        <small>{d <= 0 ? 'hoy' : `${c.fechaFinSolicitud ? '' : '≈ '}${d} d`}</small>
      </span>
    );
  }
  return (
    <span className="calendario-dia sin-fecha">
      <small>{c.plazo === 'abierta' ? 'abierta' : c.plazo === 'cerrada' ? 'cerrada' : 'sin fecha'}</small>
      <b>—</b>
    </span>
  );
}

/** Una convocatoria en la lista: cuándo, qué, quién la da, dónde y cuánto. */
export function FilaAyuda({ c, motivo = null, mostrarOcultas = false }: { c: Convocatoria; motivo?: string | null; mostrarOcultas?: boolean }) {
  const { ocultas } = useMarcas();
  if (ocultas.includes(c.id) && !mostrarOcultas) return null;
  const organo = c.organoNiveles.slice(1).join(' · ') || c.organo;
  const ambito = c.ambitoNacional ? 'Toda España' : (c.provincias.length ? c.provincias : c.ccaa).slice(0, 3).join(', ');
  return (
    <li className="fila-ayuda">
      <Cuando c={c} />
      <div className="fila-ayuda-texto">
        <span className="etiquetas">
          {c.clasificacion.destino && <span className={`etiqueta${c.clasificacion.destino === 'grupos' ? ' etiqueta-acento' : ''}`}>{NOMBRE_DESTINO[c.clasificacion.destino]}</span>}
          {c.clasificacion.estilosExplicitos.map((e) => (
            <span key={e} className="etiqueta">
              {NOMBRE_ESTILO[e]}
            </span>
          ))}
        </span>
        <a className="fila-ayuda-titulo" href={enlace('convocatoria', c.id)}>
          {c.tituloCorto ?? c.titulo}
        </a>
        <span className="fila-ayuda-detalle">
          <a href={enlace('organismo', c.organismoId)}>{organo}</a>
          {ambito && ` · ${ambito}`}
        </span>
        {motivo && <span className="fila-aviso">{motivo}</span>}
      </div>
      <div className="fila-ayuda-lado">
        {c.presupuesto != null && (
          <span className="importe">
            {euros.format(c.presupuesto)}
            <small>presupuesto</small>
          </span>
        )}
        <BotonesMarca id={c.id} compacto={!mostrarOcultas} />
      </div>
    </li>
  );
}

interface Resultado {
  total: number;
  pagina: number;
  porPagina: number;
  items: Convocatoria[];
}

const POR_DEFECTO: Filtros = { plazo: 'vigentes', orden: 'cierre' };

/** Los filtros van en la dirección (#/explorar?estilo=jazz&ccaa=…) para poder guardarlos o compartirlos. */
function desdeRuta(ruta: Ruta): Filtros {
  if (ruta.params.size === 0) return POR_DEFECTO;
  const f: Record<string, string | number | boolean> = Object.fromEntries(ruta.params);
  if (f.pagina) f.pagina = Number(f.pagina);
  if (f.todas) f.todas = f.todas === 'true';
  return f as Filtros;
}

export function Explorar({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const [filtros, setFiltros] = useState<Filtros>(() => desdeRuta(ruta));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sin filtros también hay que dejarlo en la dirección, para no volver a los de por defecto al recargar.
    cambiarParams(Object.values(filtros).some(Boolean) ? { ...filtros } : { todo: 1 });
    // Pequeña espera para no lanzar una petición por cada tecla del buscador.
    const t = setTimeout(() => {
      api.convocatorias(filtros).then(setResultado, (e: Error) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [filtros]);

  // Cualquier cambio de filtro vuelve a la primera página.
  const cambiar = (clave: keyof Filtros) => (e: { target: { value: string } }) =>
    setFiltros((f) => ({ ...f, [clave]: e.target.value || undefined, pagina: undefined }));
  const irA = (pagina: number) => {
    setFiltros((f) => ({ ...f, pagina }));
    window.scrollTo({ top: 0 });
  };
  const paginas = resultado ? Math.ceil(resultado.total / resultado.porPagina) : 0;

  const para = filtros.para ?? '';
  return (
    <section className="ayudas">
      <div className="pestanas-pagina" role="tablist" aria-label="Para quién">
        {(
          [
            ['', 'Todas'],
            ['grupos', 'Para tus grupos'],
            ['programadores', 'Para quien te contrata'],
          ] as [string, string][]
        ).map(([v, n]) => (
          <button key={v} type="button" role="tab" aria-selected={para === v} className={para === v ? 'activa' : ''} onClick={() => cambiar('para')({ target: { value: v } })}>
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
          <input type="search" placeholder="Buscar: festival, gira, orquesta, Sevilla…" value={filtros.q ?? ''} onChange={cambiar('q')} aria-label="Buscar" />
        </label>
        <select value={filtros.plazo ?? ''} onChange={cambiar('plazo')} aria-label="Plazo">
          <option value="vigentes">Abiertas o por abrir</option>
          <option value="cerrada">Cerradas (próxima edición)</option>
          <option value="">Cualquier plazo</option>
        </select>
        <select value={filtros.estilo ?? ''} onChange={cambiar('estilo')} aria-label="Estilo">
          <option value="">Todos los estilos</option>
          {meta.estilos.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_ESTILO[e]}
            </option>
          ))}
        </select>
        <select value={filtros.ccaa ?? ''} onChange={cambiar('ccaa')} aria-label="Comunidad autónoma">
          <option value="">Toda España</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {resultado && (
        <>
          <div className="cabecera-resultados">
            <p className="recuento">
              <strong>{resultado.total.toLocaleString('es-ES')}</strong> {resultado.total === 1 ? 'convocatoria' : 'convocatorias'}
            </p>
            <label className="casilla">
              <input type="checkbox" checked={!!filtros.todas} onChange={(e) => setFiltros((f) => ({ ...f, todas: e.target.checked || undefined, pagina: undefined }))} />
              Ver también lo descartado, con el motivo
            </label>
            <select value={filtros.orden ?? ''} onChange={cambiar('orden')} aria-label="Orden">
              <option value="cierre">Cierran antes primero</option>
              <option value="">Más recientes primero</option>
            </select>
          </div>
          {resultado.items.length === 0 ? (
            <div className="bloque vacio">
              <h2>Ninguna convocatoria con estos filtros</h2>
              <p className="ayuda">Prueba con «Cualquier plazo» o quita el estilo o la comunidad.</p>
            </div>
          ) : (
            <ul className="lista-ayudas">
              {resultado.items.map((c) => (
                <FilaAyuda key={c.id} c={c} motivo={filtros.todas ? c.clasificacion.descarte ?? null : null} />
              ))}
            </ul>
          )}
          {paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas">
              <button className="boton-secundario" disabled={resultado.pagina <= 1} onClick={() => irA(resultado.pagina - 1)}>
                ← Anterior
              </button>
              <span>
                Página {resultado.pagina} de {paginas}
              </span>
              <button className="boton-secundario" disabled={resultado.pagina >= paginas} onClick={() => irA(resultado.pagina + 1)}>
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
