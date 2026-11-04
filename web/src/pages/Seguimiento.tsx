import { useEffect, useState } from 'react';
import { EntidadCrm } from '../components/EntidadCrm';
import { crm, type Entidad, type EstadoRelacion, NOMBRE_RELACION } from '../crm';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';

const TONO_RELACION: Partial<Record<EstadoRelacion, string>> = {
  respondio: 'etiqueta-exito',
  interesado: 'etiqueta-exito',
  reunion: 'etiqueta-exito',
  llamada: 'etiqueta-aviso',
  recontactar: 'etiqueta-aviso',
  en_secuencia: 'etiqueta-acento',
};
const FILTROS: [string, string, (e: Entidad) => boolean][] = [
  ['todas', 'Todas', () => true],
  ['activas', 'En curso', (e) => ['en_secuencia', 'llamada', 'recontactar'].includes(e.estadoRelacion)],
  ['respuesta', 'Con respuesta', (e) => ['respondio', 'reunion', 'interesado'].includes(e.estadoRelacion)],
  ['nuevas', 'Sin contactar', (e) => e.estadoRelacion === 'nueva'],
  ['cerradas', 'Archivadas', (e) => ['no_interesado', 'sin_respuesta'].includes(e.estadoRelacion) || e.noContactar],
];
const fichaDe = (e: Entidad) => (e.ref ? enlace('programador', e.ref) : enlace('entidad', e.id));

/** Entidades en seguimiento, por estado de la relación; y alta manual de las que no están en el directorio. */
export function Seguimiento() {
  const usuario = useCuenta().cuenta?.usuario;
  const [items, setItems] = useState<Entidad[] | null>(null);
  const [alta, setAlta] = useState({ nombre: '', tipo: 'auditorio', municipio: '', ccaa: '', email: '', persona: '' });
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [altaAbierta, setAltaAbierta] = useState(false);
  const cargar = () => crm.entidades().then((r) => setItems(r.items), (e: Error) => setError(e.message));
  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario?.email]);
  if (!usuario) return <p className="llamada">El seguimiento es de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;
  if (!items) return <p className="ayuda">Cargando…</p>;
  const filtroActual = FILTROS.find(([v]) => v === filtro) ?? FILTROS[0];
  const q = busca.trim().toLowerCase();
  const visibles = items.filter((e) => filtroActual[2](e) && (!q || `${e.nombre} ${e.municipio ?? ''} ${e.persona ?? ''}`.toLowerCase().includes(q)));
  return (
    <section className="mis-entidades">
      <div className="pestanas-pagina" role="tablist" aria-label="Estado">
        {FILTROS.map(([v, n, f]) => (
          <button key={v} type="button" role="tab" aria-selected={filtro === v} className={filtro === v ? 'activa' : ''} onClick={() => setFiltro(v)}>
            {n} · {items.filter(f).length}
          </button>
        ))}
      </div>
      <div className="barra-herramientas">
        <label className="buscador buscador-flexible">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input type="search" placeholder="Buscar entidad, municipio o persona…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
        </label>
        <button type="button" className="accion" onClick={() => setAltaAbierta((x) => !x)} aria-expanded={altaAbierta}>
          + Añadir a mano
        </button>
        <a className="boton" href="#/clientes">
          Buscar en Clientes
        </a>
      </div>
      {error && <p className="error">{error}</p>}
      {items.length === 0 ? (
        <div className="bloque vacio">
          <h2>Aún no sigues a ninguna entidad</h2>
          <p className="ayuda">
            Entran solas al enviar un correo desde <a href="#/propuestas">Propuestas</a>, o desde su ficha en <a href="#/clientes">Clientes</a>. Si no está en el directorio, añádela a mano.
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <p className="vacio-suave">Ninguna con este filtro.</p>
      ) : (
        <ul className="lista-ayudas">
          {visibles.map((e) => (
            <li key={e.id} className="fila-ayuda">
              <span className="sigla tono-azul" aria-hidden="true">
                {e.nombre
                  .replace(/^(ayuntamiento|ajuntament|concello|teatro|auditorio)\s+(de\s+|d')?/i, '')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="fila-ayuda-texto">
                <a className="fila-ayuda-titulo" href={fichaDe(e)}>
                  {e.nombre}
                </a>
                <span className="fila-ayuda-detalle">
                  {[e.municipio, e.provincia !== e.municipio ? e.provincia : null].filter(Boolean).join(', ')}
                  {e.persona && ` · ${e.persona}`}
                  {e.email && ` · ${e.email}`}
                </span>
              </div>
              <div className="fila-ayuda-lado">
                <span className={`etiqueta ${TONO_RELACION[e.estadoRelacion] ?? ''}`}>{NOMBRE_RELACION[e.estadoRelacion]}</span>
                {e.noContactar && <span className="etiqueta">No contactar</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {altaAbierta && (
      <section className="grupo-ajustes alta-entidad">
        <h2>Añadir una entidad a mano</h2>
        <p className="ayuda">Para las que no están en el directorio de Clientes.</p>
        <div className="campos-rejilla">
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
      </section>
      )}
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
