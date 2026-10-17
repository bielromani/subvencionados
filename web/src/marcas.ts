// Guardadas («me interesa») y ocultas («no me interesa»): las decide cada usuario y viven en su navegador.
// Las ocultas viajan en la cabecera X-Ocultas para que el servidor no las vuelva a enseñar.
import { useEffect, useState } from 'react';

export type EstadoCliente = 'pendiente' | 'contactado' | 'interesado' | 'cerrado' | 'descartado';
export const NOMBRE_ESTADO: Record<EstadoCliente, string> = {
  pendiente: 'Por contactar',
  contactado: 'Contactado',
  interesado: 'Interesado',
  cerrado: 'Concierto cerrado',
  descartado: 'Descartado',
};

/** Seguimiento de un cliente (ayuntamiento, festival...): en qué punto está y notas propias. */
export interface SeguimientoCliente {
  nombre: string;
  estado: EstadoCliente;
  nota: string;
  actualizado: string;
}

export interface Marcas {
  guardadas: string[];
  ocultas: string[];
  clientes: Record<string, SeguimientoCliente>;
}

const CLAVE = 'subvencionados:marcas';
const EVENTO = 'subvencionados:marcas';

export function leerMarcas(): Marcas {
  try {
    const m = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Partial<Marcas>;
    return { guardadas: m.guardadas ?? [], ocultas: m.ocultas ?? [], clientes: m.clientes ?? {} };
  } catch {
    return { guardadas: [], ocultas: [], clientes: {} };
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

/** Añade un cliente a la lista (por contactar) o lo quita. */
export function alternarCliente(id: string, nombre: string) {
  const m = leerMarcas();
  const clientes = { ...m.clientes };
  if (clientes[id]) delete clientes[id];
  else clientes[id] = { nombre, estado: 'pendiente', nota: '', actualizado: new Date().toISOString().slice(0, 10) };
  escribir({ ...m, clientes });
}

export function actualizarCliente(id: string, cambios: Partial<Pick<SeguimientoCliente, 'estado' | 'nota'>>) {
  const m = leerMarcas();
  if (!m.clientes[id]) return;
  escribir({ ...m, clientes: { ...m.clientes, [id]: { ...m.clientes[id]!, ...cambios, actualizado: new Date().toISOString().slice(0, 10) } } });
}

/** Guardar quita de ocultas y al revés: una convocatoria no puede estar en las dos listas. */
export function alternar(lista: 'guardadas' | 'ocultas', id: string) {
  const m = leerMarcas();
  const otra = lista === 'guardadas' ? 'ocultas' : 'guardadas';
  const ya = m[lista].includes(id);
  escribir({
    ...m,
    [lista]: ya ? m[lista].filter((x) => x !== id) : [id, ...m[lista]],
    [otra]: m[otra].filter((x) => x !== id),
  });
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
