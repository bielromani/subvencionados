import { useState } from 'react';

/**
 * Gráficos de una sola serie hechos con HTML: barras finas en el color de la serie, valor en la punta,
 * detalle al pasar el ratón (o al enfocar con el teclado) y la tabla con los datos debajo.
 */
export interface Punto {
  etiqueta: string;
  valor: number;
  /** Texto del detalle (por defecto, el valor formateado). */
  detalle?: string;
}

const compacto = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });
export const eurosCompactos = (v: number) => `${compacto.format(v)} €`;

function Tabla({ puntos, columna, formato }: { puntos: Punto[]; columna: string; formato: (v: number) => string }) {
  return (
    <details className="ver-tabla">
      <summary>Ver los datos en tabla</summary>
      <div className="tabla-scroll">
      <table className="tabla">
        <thead>
          <tr>
            <th />
            <th className="num">{columna}</th>
          </tr>
        </thead>
        <tbody>
          {puntos.map((p) => (
            <tr key={p.etiqueta}>
              <td>{p.etiqueta}</td>
              <td className="num">{p.detalle ?? formato(p.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </details>
  );
}

/** Barras horizontales, de mayor a menor tal como vengan. */
export function Barras({ puntos, columna, formato = eurosCompactos }: { puntos: Punto[]; columna: string; formato?: (v: number) => string }) {
  const max = Math.max(...puntos.map((p) => p.valor), 1);
  return (
    <figure className="grafico">
      <div className="barras" role="list">
        {puntos.map((p) => (
          <div className="barra-fila" role="listitem" key={p.etiqueta} tabIndex={0} title={p.detalle ?? `${p.etiqueta}: ${formato(p.valor)}`}>
            <span className="barra-etiqueta">{p.etiqueta}</span>
            <span className="barra-pista">
              <span className="barra" style={{ width: `${(p.valor / max) * 100}%` }} />
              <span className="barra-valor">{formato(p.valor)}</span>
            </span>
          </div>
        ))}
      </div>
      <Tabla puntos={puntos} columna={columna} formato={formato} />
    </figure>
  );
}

/** Columnas por año; el detalle sale al pasar el ratón o al enfocar la columna. */
export function Columnas({ puntos, columna, formato = eurosCompactos }: { puntos: Punto[]; columna: string; formato?: (v: number) => string }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(...puntos.map((p) => p.valor), 1);
  const ultimo = puntos.length - 1;
  return (
    <figure className="grafico">
      <div className="columnas" onMouseLeave={() => setActivo(null)}>
        {puntos.map((p, i) => (
          <div
            className={`columna${activo === i ? ' activa' : ''}`}
            key={p.etiqueta}
            tabIndex={0}
            aria-label={p.detalle ?? `${p.etiqueta}: ${formato(p.valor)}`}
            onMouseEnter={() => setActivo(i)}
            onFocus={() => setActivo(i)}
            onBlur={() => setActivo(null)}
          >
            {/* Valor solo en la columna activa, la mayor y la última: nunca un número en cada una. */}
            <span className="columna-valor">
              {(activo === i || p.valor === max || i === ultimo) && formato(p.valor)}
            </span>
            <span className="columna-barra" style={{ height: `${(p.valor / max) * 100}%` }} />
            <span className="columna-etiqueta">{p.etiqueta}</span>
            {activo === i && p.detalle && <span className="columna-detalle">{p.detalle}</span>}
          </div>
        ))}
      </div>
      <Tabla puntos={puntos} columna={columna} formato={formato} />
    </figure>
  );
}

export function Cifra({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="cifra">
      <span className="cifra-etiqueta">{etiqueta}</span>
      <span className="cifra-valor">{valor}</span>
      {nota && <span className="cifra-nota">{nota}</span>}
    </div>
  );
}
