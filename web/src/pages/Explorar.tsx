import { useEffect, useState } from 'react';
import { api, type Filtros } from '../api';
import { TarjetaConvocatoria } from '../components/TarjetaConvocatoria';
import { NOMBRE_ADMINISTRACION, NOMBRE_ESTILO, NOMBRE_LINEA, type Convocatoria, type Meta } from '../tipos';

interface Resultado {
  total: number;
  pagina: number;
  porPagina: number;
  items: Convocatoria[];
}

export function Explorar({ meta }: { meta: Meta }) {
  const [filtros, setFiltros] = useState<Filtros>({ tipo: 'concurrencia', plazo: 'abierta', orden: 'cierre' });
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  return (
    <section>
      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar: festival, orquesta, Sevilla, ayuntamiento…"
          value={filtros.q ?? ''}
          onChange={cambiar('q')}
          aria-label="Buscar"
        />
        <select value={filtros.tipo ?? ''} onChange={cambiar('tipo')} aria-label="Tipo">
          <option value="">Concursos y concesiones directas</option>
          <option value="concurrencia">Concursos (se pueden pedir)</option>
          <option value="directa">Concesiones directas (precedentes)</option>
        </select>
        <select value={filtros.plazo ?? ''} onChange={cambiar('plazo')} aria-label="Plazo">
          <option value="">Cualquier plazo (histórico)</option>
          <option value="abierta">Abiertas ahora</option>
          <option value="proxima">Por abrir</option>
          <option value="cerrada">Cerradas</option>
          <option value="desconocido">Sin fechas</option>
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
        <select value={filtros.administracion ?? ''} onChange={cambiar('administracion')} aria-label="Administración">
          <option value="">Cualquier administración</option>
          {Object.entries(NOMBRE_ADMINISTRACION).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={filtros.linea ?? ''} onChange={cambiar('linea')} aria-label="Qué financia">
          <option value="">Cualquier actividad</option>
          {meta.lineas.map((l) => (
            <option key={l} value={l}>
              {NOMBRE_LINEA[l]}
            </option>
          ))}
        </select>
        <select value={filtros.orden ?? ''} onChange={cambiar('orden')} aria-label="Orden">
          <option value="">Más recientes primero</option>
          <option value="cierre">Las que cierran antes primero</option>
        </select>
        <label className="casilla">
          <input
            type="checkbox"
            checked={!!filtros.todas}
            onChange={(e) => setFiltros((f) => ({ ...f, todas: e.target.checked || undefined, pagina: undefined }))}
          />
          Incluir las descargadas que no se han clasificado como música
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {resultado && (
        <>
          <p className="recuento">
            {resultado.total.toLocaleString('es-ES')} {resultado.total === 1 ? 'convocatoria' : 'convocatorias'}
            <span className="ayuda"> · ★ = el estilo se menciona expresamente</span>
          </p>
          <div className="lista">
            {resultado.items.map((c) => (
              <TarjetaConvocatoria key={c.id} c={c} />
            ))}
          </div>
          {paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas">
              <button className="boton-secundario" disabled={resultado.pagina <= 1} onClick={() => irA(resultado.pagina - 1)}>
                ← Anterior
              </button>
              <span>
                Página {resultado.pagina} de {paginas}
              </span>
              <button
                className="boton-secundario"
                disabled={resultado.pagina >= paginas}
                onClick={() => irA(resultado.pagina + 1)}
              >
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
