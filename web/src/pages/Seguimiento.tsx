import { useEffect, useState } from 'react';
import { EntidadCrm } from '../components/EntidadCrm';
import { crm, type Entidad, NOMBRE_RELACION } from '../crm';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';

const fichaDe = (e: Entidad) => (e.ref ? enlace('programador', e.ref) : enlace('entidad', e.id));

/** Entidades en seguimiento, por estado de la relación; y alta manual de las que no están en el directorio. */
export function Seguimiento() {
  const usuario = useCuenta().cuenta?.usuario;
  const [items, setItems] = useState<Entidad[] | null>(null);
  const [alta, setAlta] = useState({ nombre: '', tipo: 'auditorio', municipio: '', ccaa: '', email: '', persona: '' });
  const [error, setError] = useState<string | null>(null);
  const cargar = () => crm.entidades().then((r) => setItems(r.items), (e: Error) => setError(e.message));
  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario?.email]);
  if (!usuario) return <p className="llamada">El seguimiento es de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;
  if (!items) return <p className="ayuda">Cargando…</p>;
  return (
    <section>
      <section className="bloque">
        <h3>
          Mis entidades <span className="contador">{items.length}</span>
        </h3>
        <p className="ayuda">
          Ayuntamientos, auditorios, teatros y festivales en seguimiento. Se añaden desde su ficha en <a href="#/clientes">Clientes</a>, o aquí a mano si no están en el directorio.
        </p>
        {error && <p className="error">{error}</p>}
        <ul className="filas">
          {items.map((e) => (
            <li key={e.id} className="fila-convocatoria">
              <a className="fila-titulo" href={fichaDe(e)}>
                {e.nombre}
              </a>
              <span className="fila-detalle">
                {NOMBRE_RELACION[e.estadoRelacion]}
                {e.noContactar && ' · no contactar'}
                {e.municipio && ` · ${e.municipio}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <details className="bloque">
        <summary>Añadir una entidad a mano</summary>
        <div className="formulario formulario-ancho">
          <label>
            Nombre
            <input value={alta.nombre} onChange={(x) => setAlta({ ...alta, nombre: x.target.value })} />
          </label>
          <label>
            Tipo
            <select value={alta.tipo} onChange={(x) => setAlta({ ...alta, tipo: x.target.value })}>
              <option value="ayuntamiento">Ayuntamiento</option>
              <option value="auditorio">Auditorio</option>
              <option value="teatro">Teatro</option>
              <option value="festival">Festival</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label>
            Municipio
            <input value={alta.municipio} onChange={(x) => setAlta({ ...alta, municipio: x.target.value })} />
          </label>
          <label>
            Comunidad autónoma
            <input value={alta.ccaa} onChange={(x) => setAlta({ ...alta, ccaa: x.target.value })} />
          </label>
          <label>
            Persona de contacto
            <input value={alta.persona} onChange={(x) => setAlta({ ...alta, persona: x.target.value })} />
          </label>
          <label>
            Email
            <input type="email" value={alta.email} onChange={(x) => setAlta({ ...alta, email: x.target.value })} />
          </label>
          <p className="acciones">
            <button
              type="button"
              className="boton"
              onClick={() => void crm.crearEntidad(alta as Partial<Entidad>).then((e) => (window.location.hash = enlace('entidad', e.id)), (x: Error) => setError(x.message))}
            >
              Añadir
            </button>
          </p>
        </div>
      </details>
    </section>
  );
}

/** Ficha de una entidad añadida a mano (las del directorio usan la ficha del programador). */
export function PaginaEntidad({ id }: { id: string }) {
  return (
    <section className="pagina">
      <p className="migas">
        <a href="#/seguimiento">← Mis entidades</a>
      </p>
      <EntidadCrm id={id} />
    </section>
  );
}
