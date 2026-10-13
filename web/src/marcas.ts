// Guardadas («me interesa») y ocultas («no me interesa»): las decide cada usuario y viven en su navegador.
// Las ocultas viajan en la cabecera X-Ocultas para que el servidor no las vuelva a enseñar.
import { useEffect, useState } from 'react';

export interface Marcas {
  guardadas: string[];
  ocultas: string[];
}

const CLAVE = 'subvencionados:marcas';
const EVENTO = 'subvencionados:marcas';

export function leerMarcas(): Marcas {
  try {
    const m = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Partial<Marcas>;
    return { guardadas: m.guardadas ?? [], ocultas: m.ocultas ?? [] };
  } catch {
    return { guardadas: [], ocultas: [] };
  }
}

function escribir(m: Marcas) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(m));
  } catch {
    // Sin almacenamiento (modo privado): las marcas duran lo que la página abierta.
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Guardar quita de ocultas y al revés: una convocatoria no puede estar en las dos listas. */
export function alternar(lista: keyof Marcas, id: string) {
  const m = leerMarcas();
  const otra: keyof Marcas = lista === 'guardadas' ? 'ocultas' : 'guardadas';
  const ya = m[lista].includes(id);
  escribir({
    ...m,
    [lista]: ya ? m[lista].filter((x) => x !== id) : [id, ...m[lista]],
    [otra]: m[otra].filter((x) => x !== id),
  } as Marcas);
}

export function useMarcas(): Marcas {
  const [m, setM] = useState(leerMarcas);
  useEffect(() => {
    const actualizar = () => setM(leerMarcas());
    window.addEventListener(EVENTO, actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener(EVENTO, actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);
  return m;
}
