import { useState, type ReactNode } from 'react';

const ancho = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 701px)').matches;

/** Buscador siempre visible y el resto de filtros plegados en el móvil (abiertos en pantallas grandes). */
export function Filtros({ busqueda, children }: { busqueda?: ReactNode; children: ReactNode }) {
  const [abierto, setAbierto] = useState(ancho);
  return (
    <div className="filtros-bloque">
      {busqueda && <div className="filtros-busqueda">{busqueda}</div>}
      <details className="filtros-plegables" open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)}>
        <summary>Filtros</summary>
        <div className="filtros">{children}</div>
      </details>
    </div>
  );
}
