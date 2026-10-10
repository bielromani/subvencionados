import { useEffect, useState } from 'react';

/**
 * Rutas con el hash (#/convocatoria/bdns-123): cada página tiene su dirección, se puede compartir y funciona
 * el botón atrás, sin configurar nada en el servidor.
 */
export interface Ruta {
  partes: string[];
  params: URLSearchParams;
}

function leer(): Ruta {
  const [camino = '', consulta = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  return { partes: camino.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(consulta) };
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState(leer);
  useEffect(() => {
    const alCambiar = () => {
      setRuta(leer());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return ruta;
}

export const enlace = (...partes: string[]) => `#/${partes.map(encodeURIComponent).join('/')}`;

/** Cambia los parámetros de la página actual sin añadir una entrada al historial por cada tecla. */
export function cambiarParams(params: Record<string, string | number | boolean | undefined>) {
  const [camino = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== false) p.set(k, String(v));
  const consulta = p.toString();
  history.replaceState(null, '', `#/${camino}${consulta ? `?${consulta}` : ''}`);
}
