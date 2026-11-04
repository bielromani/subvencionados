import { useState, type ReactNode } from 'react';

const ancho = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 701px)').matches;

/** Buscador siempre visible con lupa y el resto de filtros al lado (plegados en el móvil). */
export function Filtros({ busqueda, children }: { busqueda?: ReactNode; children: ReactNode }) {
  const [abierto, setAbierto] = useState(ancho);
  return (
    <div className="filtros-bloque filtros-nuevo">
      {busqueda && (
        <label className="buscador">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          {busqueda}
        </label>
      )}
      <details className="filtros-plegables" open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)}>
        <summary>Filtros</summary>
        <div className="filtros">{children}</div>
      </details>
    </div>
  );
}
