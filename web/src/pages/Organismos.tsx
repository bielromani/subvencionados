import { useEffect, useState } from 'react';
import { api } from '../api';
import { cambiarParams, enlace, type Ruta } from '../ruta';
import { NOMBRE_ADMINISTRACION, type Meta, type Organismo } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function lugar(o: Pick<Organismo, 'ubicacion'>) {
  const u = o.ubicacion;
  if (!u) return '—';
  return [u.municipio, u.provincia !== u.municipio ? u.provincia : null, u.ccaa].filter(Boolean).join(', ');
}

export function Organismos({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  const [filtros, setFiltros] = useState({
    q: p.get('q') ?? '',
    ccaa: p.get('ccaa') ?? '',
    administracion: p.get('administracion') ?? '',
    orden: p.get('orden') ?? '',
    pagina: Number(p.get('pagina')) || 1,
  });
  const [resultado, setResultado] = useState<{ total: number; porPagina: number; items: Organismo[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cambiarParams({ ...filtros, pagina: filtros.pagina > 1 ? filtros.pagina : undefined });
    const t = setTimeout(() => api.organismos(filtros).then(setResultado, (e: Error) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [filtros]);

  const cambiar = (clave: keyof typeof filtros) => (e: { target: { value: string } }) =>
    setFiltros((f) => ({ ...f, [clave]: e.target.value, pagina: 1 }));
  const paginas = resultado ? Math.ceil(resultado.total / resultado.porPagina) : 0;

  return (
    <section>
      <p className="ayuda">
        Quién convoca ayudas de música y cuánto ha concedido. Útil para saber a qué puerta llamar en cada territorio.
      </p>
      <div className="filtros">
        <input type="search" placeholder="Buscar: diputación, ayuntamiento, instituto…" value={filtros.q} onChange={cambiar('q')} aria-label="Buscar" />
        <select value={filtros.ccaa} onChange={cambiar('ccaa')} aria-label="Comunidad">
          <option value="">Todas las comunidades</option>
          {meta.ccaa.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filtros.administracion} onChange={cambiar('administracion')} aria-label="Administración">
          <option value="">Todas las administraciones</option>
          {Object.entries(NOMBRE_ADMINISTRACION).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={filtros.orden} onChange={cambiar('orden')} aria-label="Orden">
          <option value="">Más concedido</option>
          <option value="convocatorias">Más convocatorias</option>
          <option value="recientes">Activos más recientemente</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {resultado && (
        <>
          <p className="ayuda">{resultado.total.toLocaleString('es-ES')} organismos</p>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Organismo</th>
                  <th>Dónde</th>
                  <th className="num">Convocatorias</th>
                  <th className="num">Se repiten</th>
                  <th className="num">Concedido</th>
                  <th className="num">Última</th>
                </tr>
              </thead>
              <tbody>
                {resultado.items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <a href={enlace('organismo', o.id)}>{o.nombre}</a>
                      {o.entidad && o.entidad !== o.nombre && <span className="ayuda"> · {o.entidad}</span>}
                    </td>
                    <td>{lugar(o)}</td>
                    <td className="num">{o.convocatorias}</td>
                    <td className="num">{o.series}</td>
                    <td className="num">{euros.format(o.concedidoTotal)}</td>
                    <td className="num">{o.ultimoAnio ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginas > 1 && (
            <div className="paginacion">
              <button disabled={filtros.pagina <= 1} onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina - 1 }))}>
                ← Anterior
              </button>
              <span>
                Página {filtros.pagina} de {paginas}
              </span>
              <button disabled={filtros.pagina >= paginas} onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina + 1 }))}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
