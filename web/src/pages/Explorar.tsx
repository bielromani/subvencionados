import { useEffect, useState } from 'react';
import { api, type Filtros } from '../api';
import { TarjetaConvocatoria } from '../components/TarjetaConvocatoria';
import { NOMBRE_ADMINISTRACION, NOMBRE_ESTILO, NOMBRE_LINEA, type Convocatoria, type Meta } from '../tipos';

export function Explorar({ meta }: { meta: Meta }) {
  const [filtros, setFiltros] = useState<Filtros>({});
  const [resultado, setResultado] = useState<{ total: number; items: Convocatoria[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pequeña espera para no lanzar una petición por cada tecla del buscador.
    const t = setTimeout(() => {
      api.convocatorias(filtros).then(setResultado, (e: Error) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [filtros]);

  const cambiar = (clave: keyof Filtros) => (e: { target: { value: string } }) =>
    setFiltros((f) => ({ ...f, [clave]: e.target.value || undefined }));

  return (
    <section>
      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar: festival, orquesta, Sevilla…"
          value={filtros.q ?? ''}
          onChange={cambiar('q')}
          aria-label="Buscar"
        />
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
        <select value={filtros.plazo ?? ''} onChange={cambiar('plazo')} aria-label="Plazo">
          <option value="">Cualquier plazo</option>
          <option value="abierta">Abiertas</option>
          <option value="cerrada">Cerradas</option>
          <option value="desconocido">Sin confirmar</option>
        </select>
        <label className="casilla">
          <input
            type="checkbox"
            checked={!!filtros.todas}
            onChange={(e) => setFiltros((f) => ({ ...f, todas: e.target.checked || undefined }))}
          />
          Incluir no clasificadas como música
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {resultado && (
        <>
          <p className="recuento">
            {resultado.total} {resultado.total === 1 ? 'convocatoria' : 'convocatorias'}
            <span className="ayuda"> · ★ = el estilo se menciona expresamente</span>
          </p>
          <div className="lista">
            {resultado.items.map((c) => (
              <TarjetaConvocatoria key={c.id} c={c} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
