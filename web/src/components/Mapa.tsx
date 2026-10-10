import { useState } from 'react';
import mapa from '../datos/provincias.json';

/**
 * Mapa de provincias coloreado por magnitud: un solo tono de claro a oscuro, en cinco tramos por cuantiles
 * (los importes están muy concentrados). Sin datos, gris. Detalle al pasar el ratón o al enfocar.
 */
export interface DatoProvincia {
  codigo: string;
  valor: number;
  detalle: string;
}

const TRAMOS = 5;

function cortes(valores: number[]): number[] {
  const ordenados = valores.filter((v) => v > 0).sort((a, b) => a - b);
  if (ordenados.length === 0) return [];
  return Array.from({ length: TRAMOS - 1 }, (_, i) => ordenados[Math.floor(((i + 1) * ordenados.length) / TRAMOS)]!);
}

export function MapaProvincias({ datos, formato }: { datos: DatoProvincia[]; formato: (v: number) => string }) {
  const [activa, setActiva] = useState<string | null>(null);
  const porCodigo = new Map(datos.map((d) => [d.codigo, d]));
  const limites = cortes(datos.map((d) => d.valor));
  const tramo = (v: number) => (v > 0 ? limites.filter((l) => v >= l).length + 1 : 0);
  const [x0, y0, x1, y1] = mapa.recuadroCanarias;
  const elegida = activa ? mapa.provincias.find((p) => p.codigo === activa) : null;
  const datoElegido = activa ? porCodigo.get(activa) : null;

  return (
    <figure className="grafico mapa">
      <div className="mapa-lienzo">
        <svg viewBox={`0 0 ${mapa.ancho} ${mapa.alto}`} role="img" aria-label="Mapa de España por provincias">
          <rect className="mapa-recuadro" x={x0} y={y0} width={x1! - x0!} height={y1! - y0!} rx="4" />
          {mapa.provincias.map((p) => {
            const d = porCodigo.get(p.codigo);
            return (
              <path
                key={p.codigo}
                d={p.d}
                className={`mapa-provincia tramo-${tramo(d?.valor ?? 0)}${activa === p.codigo ? ' activa' : ''}`}
                tabIndex={0}
                aria-label={d?.detalle ?? `${p.nombre}: sin datos`}
                onMouseEnter={() => setActiva(p.codigo)}
                onMouseLeave={() => setActiva(null)}
                onFocus={() => setActiva(p.codigo)}
                onBlur={() => setActiva(null)}
              />
            );
          })}
        </svg>
        <p className="mapa-detalle" aria-live="polite">
          {elegida ? (datoElegido?.detalle ?? `${elegida.nombre}: sin datos`) : 'Pasa el ratón por una provincia'}
        </p>
      </div>
      {limites.length > 0 && (
        <ul className="mapa-leyenda">
          <li>
            <span className="muestra tramo-0" /> Sin datos
          </li>
          {Array.from({ length: TRAMOS }, (_, i) => (
            <li key={i}>
              <span className={`muestra tramo-${i + 1}`} />
              {i === 0 ? `Menos de ${formato(limites[0]!)}` : i === TRAMOS - 1 ? `${formato(limites[i - 1]!)} o más` : `${formato(limites[i - 1]!)} – ${formato(limites[i]!)}`}
            </li>
          ))}
        </ul>
      )}
      <figcaption className="ayuda">Límites provinciales: © Instituto Geográfico Nacional (CC BY 4.0), vía es-atlas.</figcaption>
    </figure>
  );
}
