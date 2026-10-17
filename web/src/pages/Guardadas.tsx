import { useEffect, useState } from 'react';
import { api } from '../api';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { LineaContacto, nombreCliente } from '../components/Cliente';
import { actualizarCliente, alternarCliente, NOMBRE_ESTADO, useMarcas, type EstadoCliente } from '../marcas';
import { enlace } from '../ruta';
import type { Convocatoria, Programador } from '../tipos';

const ORDEN_ESTADO: EstadoCliente[] = ['interesado', 'contactado', 'pendiente', 'cerrado', 'descartado'];

/** Clientes en seguimiento: estado (por contactar, contactado...), nota propia y contacto a mano. */
function MisClientes() {
  const { clientes } = useMarcas();
  const ids = Object.keys(clientes);
  const [datos, setDatos] = useState<Record<string, Programador>>({});
  useEffect(() => {
    const faltan = ids.filter((id) => !datos[id]);
    if (!faltan.length) return;
    api.programadores(`ids=${encodeURIComponent(faltan.join(','))}&porPagina=200`).then((r) => setDatos((d) => ({ ...d, ...Object.fromEntries(r.items.map((p) => [p.id, p])) })));
  }, [ids.join(',')]);
  const orden = [...ids].sort((a, b) => ORDEN_ESTADO.indexOf(clientes[a]!.estado) - ORDEN_ESTADO.indexOf(clientes[b]!.estado) || clientes[b]!.actualizado.localeCompare(clientes[a]!.actualizado));
  return (
    <section className="bloque">
      <h3>
        Clientes <span className="contador">{ids.length}</span>
      </h3>
      <p className="ayuda">Ayuntamientos y programadores a los que quieres vender tus grupos, con su estado y tus notas. Se guardan en este navegador.</p>
      {ids.length === 0 ? (
        <p className="ayuda">
          Aún no has añadido ninguno: en <a href="#/clientes">Clientes</a> pulsa «☆ Añadir a mi lista».
        </p>
      ) : (
        <ul className="filas">
          {orden.map((id) => {
            const s = clientes[id]!;
            const p = datos[id];
            return (
              <li key={id} className="fila-convocatoria fila-cliente">
                <a className="fila-titulo" href={enlace('programador', id)}>
                  {p ? nombreCliente(p) : s.nombre}
                </a>
                {p && (
                  <span className="fila-detalle">
                    {[p.ciudad, p.provincia].filter(Boolean).join(', ')} · {p.contratos} conciertos
                    {p.meses.length > 0 && ` · contrata en ${p.meses.map((m) => ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1]).join(', ')}`}
                  </span>
                )}
                {p?.contactoBreve && <LineaContacto c={p.contactoBreve} />}
                <div className="seguimiento">
                  <select value={s.estado} onChange={(e) => actualizarCliente(id, { estado: e.target.value as EstadoCliente })} aria-label="Estado">
                    {ORDEN_ESTADO.map((e) => (
                      <option key={e} value={e}>
                        {NOMBRE_ESTADO[e]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    defaultValue={s.nota}
                    placeholder="Nota: con quién hablaste, qué grupo le ofreciste, cuándo volver a llamar…"
                    onBlur={(e) => e.target.value !== s.nota && actualizarCliente(id, { nota: e.target.value })}
                    aria-label="Nota"
                  />
                  <button type="button" className="marca" onClick={() => alternarCliente(id, s.nombre)}>
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

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
      <MisClientes />
      <section className="bloque">
        <h3>
          Ayudas guardadas <span className="contador">{guardadas.length}</span>
        </h3>
        <p className="ayuda">Las que te interesan de verdad.</p>
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
          Ayudas que no me interesan <span className="contador">{ocultas.length}</span>
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
