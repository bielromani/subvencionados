import { Filtros } from '../components/Filtros';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { FilaContrato } from '../components/FilaContrato';
import { cambiarParams, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Contrato, type Meta } from '../tipos';

/** Contratos públicos de música: licitaciones abiertas a las que presentarse y adjudicaciones anteriores. */
export function Contratos({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  const [filtros, setFiltros] = useState({
    q: p.get('q') ?? '',
    estado: p.get('estado') ?? 'abiertas',
    ccaa: p.get('ccaa') ?? '',
    estilo: p.get('estilo') ?? '',
    menor: p.get('menor') ?? '',
    orden: p.get('orden') ?? '',
    pagina: Number(p.get('pagina')) || 1,
  });
  const [r, setR] = useState<{ total: number; porPagina: number; items: Contrato[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consulta = new URLSearchParams(
    Object.entries({ ...filtros, orden: filtros.orden || (filtros.estado === 'abiertas' ? 'cierre' : ''), pagina: String(filtros.pagina) }).filter(([, v]) => v && v !== '1'),
  ).toString();

  useEffect(() => {
    cambiarParams({ ...filtros, pagina: filtros.pagina > 1 ? filtros.pagina : undefined });
    const t = setTimeout(() => api.contratos(consulta).then(setR, (e: Error) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [consulta]);

  const cambiar = (clave: keyof typeof filtros) => (e: { target: { value: string } }) =>
    setFiltros((f) => ({ ...f, [clave]: e.target.value, pagina: 1 }));
  const paginas = r ? Math.ceil(r.total / r.porPagina) : 0;

  return (
    <section>
      <p className="ayuda">
        Contratos públicos de conciertos y actuaciones musicales de la Plataforma de Contratación del Sector Público (incluye
        las plataformas autonómicas agregadas y los contratos menores). Las adjudicaciones anteriores muestran quién contrata
        música, a qué precio y qué empresas se los llevan.
      </p>
      <Filtros busqueda={<input type="search" placeholder="Buscar: orquesta, fiestas, Lugo, nombre de empresa…" value={filtros.q} onChange={cambiar('q')} aria-label="Buscar" />}>
        
        <select value={filtros.estado} onChange={cambiar('estado')} aria-label="Estado">
          <option value="abiertas">Abiertas: se puede presentar oferta</option>
          <option value="adjudicadas">Adjudicadas (precedentes)</option>
          <option value="">Todas</option>
        </select>
        <select value={filtros.ccaa} onChange={cambiar('ccaa')} aria-label="Comunidad">
          <option value="">Todas las comunidades</option>
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
        <select value={filtros.menor} onChange={cambiar('menor')} aria-label="Tipo">
          <option value="">Licitaciones y contratos menores</option>
          <option value="no">Solo licitaciones</option>
          <option value="si">Solo contratos menores</option>
        </select>
        <select value={filtros.orden} onChange={cambiar('orden')} aria-label="Orden">
          <option value="">{filtros.estado === 'abiertas' ? 'Cierran antes' : 'Más recientes'}</option>
          <option value="importe">Mayor importe</option>
        </select>
      </Filtros>
      {error && <p className="error">{error}</p>}
      {r && (
        <>
          <p className="ayuda">{r.total.toLocaleString('es-ES')} contratos</p>
          {r.items.length === 0 ? (
            <p className="ayuda">Ninguno con estos filtros.</p>
          ) : (
            <ul className="filas bloque">
              {r.items.map((c) => (
                <FilaContrato key={c.id} c={c} />
              ))}
            </ul>
          )}
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
