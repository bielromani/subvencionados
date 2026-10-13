import { useEffect, useState } from 'react';
import { api } from '../api';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { useMarcas } from '../marcas';
import type { Convocatoria } from '../tipos';

const fila = (c: Convocatoria) => ({ convocatoria: c, plazo: c.plazo, puntuacion: 0, encaje: 'directo' as const, motivos: [], avisos: [] });
// Primero las que se pueden pedir (por fecha de cierre o apertura), luego el resto por fecha de publicación.
const orden = (c: Convocatoria) =>
  c.plazo === 'abierta' ? `0${c.fechaFinSolicitud ?? '9999'}` : c.plazo === 'proxima' ? `1${c.fechaInicioSolicitud ?? '9999'}` : `2${9999 - Number(c.fechaPublicacion?.slice(0, 4) ?? 0)}`;

/** Las convocatorias que el usuario ha guardado y las que ha ocultado (para poder recuperarlas). */
export function Guardadas() {
  const { guardadas, ocultas } = useMarcas();
  const [datos, setDatos] = useState<Record<string, Convocatoria>>({});
  const [error, setError] = useState<string | null>(null);
  const ids = [...guardadas, ...ocultas];
  const clave = ids.join(',');

  useEffect(() => {
    const faltan = ids.filter((id) => !datos[id]);
    if (!faltan.length) return;
    api
      .convocatorias({ ids: faltan.join(','), porPagina: 500 } as never)
      .then((r) => setDatos((d) => ({ ...d, ...Object.fromEntries(r.items.map((c) => [c.id, c])) })), (e: Error) => setError(e.message));
  }, [clave]);

  const lista = (xs: string[]) => xs.map((id) => datos[id]).filter((c): c is Convocatoria => !!c).sort((a, b) => orden(a).localeCompare(orden(b)));

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <section className="bloque">
        <h3>
          Guardadas <span className="contador">{guardadas.length}</span>
        </h3>
        <p className="ayuda">Las que te interesan de verdad. Se guardan en este navegador.</p>
        {guardadas.length === 0 ? (
          <p className="ayuda">Aún no has guardado ninguna: pulsa «☆ Guardar» en cualquier subvención.</p>
        ) : (
          <ul className="filas">
            {lista(guardadas).map((c) => (
              <FilaConvocatoria key={c.id} m={fila(c)} destino />
            ))}
          </ul>
        )}
      </section>
      <section className="bloque">
        <h3>
          No me interesan <span className="contador">{ocultas.length}</span>
        </h3>
        <p className="ayuda">Ya no te aparecen en ninguna lista. Pulsa «recuperar» para que vuelvan.</p>
        {ocultas.length > 0 && (
          <ul className="filas">
            {lista(ocultas).map((c) => (
              <FilaConvocatoria key={c.id} m={fila(c)} destino mostrarOcultas />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
