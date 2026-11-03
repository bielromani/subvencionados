import { useEffect, useState } from 'react';
import { type AjustesCrm, crm, type Espectaculo, NOMBRE_TIPO, type TipoEspectaculo } from '../crm';
import { useCuenta } from '../sincronizar';

const VACIO: Omit<Espectaculo, 'id'> = {
  nombre: '',
  tipo: 'sinfonico_coral',
  formato: '',
  requisitos: '',
  precioMin: null,
  precioMax: null,
  disponibilidad: '',
  fechasCerradas: '',
  ambito: '',
  enlace: '',
  estadoInfo: 'pendiente',
  revisado: null,
};
const hoy = () => new Date().toLocaleDateString('sv-SE');
const euros = (n: number) => `${n.toLocaleString('es-ES')} €`;

function FormEspectaculo({ inicial, id, alGuardar, alCancelar }: { inicial: Omit<Espectaculo, 'id'>; id?: string; alGuardar: () => void; alCancelar: () => void }) {
  const [e, setE] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const campo = <K extends keyof typeof e>(k: K, v: (typeof e)[K]) => setE((x) => ({ ...x, [k]: v }));
  const numero = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v)));
  const guardar = async () => {
    try {
      await crm.guardarEspectaculo(e, id);
      alGuardar();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <div className="formulario formulario-ancho">
      <label>
        Nombre del espectáculo
        <input value={e.nombre} onChange={(x) => campo('nombre', x.target.value)} />
      </label>
      <label>
        Tipo de programación
        <select value={e.tipo} onChange={(x) => campo('tipo', x.target.value as TipoEspectaculo)}>
          {(Object.keys(NOMBRE_TIPO) as TipoEspectaculo[]).map((t) => (
            <option key={t} value={t}>
              {NOMBRE_TIPO[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Formato artístico y técnico
        <textarea rows={2} value={e.formato} onChange={(x) => campo('formato', x.target.value)} placeholder="Solistas, orquesta, coro, duración…" />
      </label>
      <label>
        Requisitos técnicos y logísticos
        <textarea rows={2} value={e.requisitos} onChange={(x) => campo('requisitos', x.target.value)} placeholder="Escenario mínimo, sonido, camerinos…" />
      </label>
      <div className="fila-campos">
        <label>
          Precio orientativo desde (€)
          <input type="number" min={0} value={e.precioMin ?? ''} onChange={(x) => campo('precioMin', numero(x.target.value))} />
        </label>
        <label>
          hasta (€)
          <input type="number" min={0} value={e.precioMax ?? ''} onChange={(x) => campo('precioMax', numero(x.target.value))} />
        </label>
      </div>
      <label>
        Disponibilidad temporal
        <input value={e.disponibilidad} onChange={(x) => campo('disponibilidad', x.target.value)} placeholder="Temporada 2026-2027, todo el año…" />
      </label>
      <label>
        Fechas cerradas
        <input value={e.fechasCerradas} onChange={(x) => campo('fechasCerradas', x.target.value)} />
      </label>
      <label>
        Ámbito territorial
        <input value={e.ambito} onChange={(x) => campo('ambito', x.target.value)} placeholder="Toda España" />
      </label>
      <label>
        Enlace al dosier o a la página
        <input type="url" value={e.enlace} onChange={(x) => campo('enlace', x.target.value)} placeholder="https://arsvia.org/…" />
      </label>
      <label>
        Estado de la información
        <select value={e.estadoInfo} onChange={(x) => campo('estadoInfo', x.target.value as Espectaculo['estadoInfo'])}>
          <option value="vigente">Vigente</option>
          <option value="pendiente">Pendiente de actualización</option>
        </select>
      </label>
      <label className="casilla">
        <input type="checkbox" checked={e.revisado === hoy()} onChange={(x) => campo('revisado', x.target.checked ? hoy() : inicial.revisado)} />
        He revisado hoy estos datos
      </label>
      {error && <p className="error">{error}</p>}
      <p className="acciones">
        <button type="button" className="boton" onClick={() => void guardar()}>
          Guardar
        </button>
        <button type="button" className="accion" onClick={alCancelar}>
          Cancelar
        </button>
      </p>
    </div>
  );
}

function Ajustes() {
  const [a, setA] = useState<AjustesCrm | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    void crm.ajustes().then((r) => setA(r.ajustes));
  }, []);
  if (!a) return null;
  const campo = (k: keyof AjustesCrm, etiqueta: string, tipo = 'text') => (
    <label>
      {etiqueta}
      <input type={tipo} value={String(a[k])} onChange={(e) => setA({ ...a, [k]: tipo === 'number' ? Number(e.target.value) : e.target.value })} />
    </label>
  );
  return (
    <details className="bloque">
      <summary>Remitente, firma y pauta de la secuencia</summary>
      <div className="formulario formulario-ancho">
        {campo('remitente', 'Tu nombre')}
        {campo('organizacion', 'Organización')}
        {campo('email', 'Email')}
        {campo('telefono', 'Teléfono')}
        {campo('web', 'Web')}
        <label>
          Firma (si la dejas vacía se usan los datos de arriba)
          <textarea rows={4} value={a.firma} onChange={(e) => setA({ ...a, firma: e.target.value })} />
        </label>
        {campo('diasEntreEnvios', 'Días entre envíos (desde el envío efectivo del anterior)', 'number')}
        <p className="acciones">
          <button type="button" className="boton" onClick={() => void crm.guardarAjustes(a).then(() => setAviso('Guardado.'))}>
            Guardar
          </button>
        </p>
        {aviso && <p className="ayuda">{aviso}</p>}
      </div>
    </details>
  );
}

/** Catálogo de espectáculos de la cuenta: lo que se ofrece a las entidades, con su vigencia. */
export function Catalogo() {
  const usuario = useCuenta().cuenta?.usuario;
  const [items, setItems] = useState<Espectaculo[] | null>(null);
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null);
  const cargar = () => crm.catalogo().then((r) => setItems(r.items));
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const importar = async () => {
    setImportando(true);
    setResultado(null);
    try {
      const r = await crm.importarCatalogo();
      setResultado(
        `${r.nuevos} nuevas, ${r.actualizados} actualizadas, ${r.retirados} que ya no están en la web, ${r.sinCambios} sin cambios. La web no publica precios: revisa cada ficha y márcala como vigente.`,
      );
      await cargar();
    } catch (e) {
      setResultado((e as Error).message);
    } finally {
      setImportando(false);
    }
  };
  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario?.email]);
  if (!usuario) return <p className="llamada">El catálogo es de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;
  if (!items) return <p className="ayuda">Cargando…</p>;
  const terminado = () => {
    setEditando(null);
    void cargar();
  };
  return (
    <section>
      <Ajustes />
      <section className="bloque">
        <h3>
          Catálogo <span className="contador">{items.length}</span>
        </h3>
        <p className="ayuda">
          Lo que ofreces. El sistema lo usa para proponer espectáculos a cada entidad y para las cartas. Lo que esté «pendiente de actualización» o sin revisar en 6 meses se propone, pero nunca con precio ni fechas cerrados.
        </p>
        {editando === 'nuevo' ? (
          <FormEspectaculo inicial={VACIO} alGuardar={terminado} alCancelar={() => setEditando(null)} />
        ) : (
          <p className="acciones">
            <button type="button" className="boton" onClick={() => setEditando('nuevo')}>
              + Añadir espectáculo
            </button>
            <button type="button" className="accion" disabled={importando} onClick={() => void importar()}>
              {importando ? 'Importando…' : '⤓ Importar de arsvia.org'}
            </button>
          </p>
        )}
        {resultado && <p className="llamada">{resultado}</p>}
      </section>
      {items.map((e) =>
        editando === e.id ? (
          <section key={e.id} className="bloque">
            <FormEspectaculo inicial={e} id={e.id} alGuardar={terminado} alCancelar={() => setEditando(null)} />
          </section>
        ) : (
          <section key={e.id} className="bloque">
            <h3>{e.nombre}</h3>
            <p className="etiquetas">
              <span className="etiqueta etiqueta-neutro">{NOMBRE_TIPO[e.tipo]}</span>
              <span className={`etiqueta etiqueta-${e.estadoInfo === 'vigente' ? 'exito' : 'aviso'}`}>{e.estadoInfo === 'vigente' ? 'Vigente' : 'Pendiente de actualización'}</span>
              {e.enWeb === false && <span className="etiqueta etiqueta-apagado">Ya no está en la web</span>}
              {e.origen && <span className="ayuda">De arsvia.org</span>}
              {e.revisado && <span className="ayuda">Revisado el {new Date(`${e.revisado}T00:00:00`).toLocaleDateString('es-ES')}</span>}
            </p>
            {e.formato && <p className="texto-lineas">{e.formato}</p>}
            {e.disponibilidad && <p className="texto-lineas ayuda">{e.disponibilidad}</p>}
            <dl className="datos">
              <div>
                <dt>Precio orientativo</dt>
                <dd>{e.precioMin != null || e.precioMax != null ? [e.precioMin, e.precioMax].filter((x) => x != null).map((x) => euros(x!)).join(' – ') : 'Sin precio'}</dd>
              </div>
              {e.ambito && (
                <div>
                  <dt>Ámbito</dt>
                  <dd>{e.ambito}</dd>
                </div>
              )}
              <div>
                <dt>Requisitos</dt>
                <dd>{e.requisitos || 'Sin confirmar'}</dd>
              </div>
            </dl>
            <p className="acciones">
              {e.enlace && (
                <a className="accion" href={e.enlace} target="_blank" rel="noreferrer">
                  {/\.pdf($|\?)/i.test(e.enlace) ? 'Dosier' : 'Web'} ↗
                </a>
              )}
              <button type="button" className="accion" onClick={() => setEditando(e.id)}>
                Editar
              </button>
              <button type="button" className="accion" onClick={() => window.confirm(`¿Borrar «${e.nombre}» del catálogo?`) && void crm.borrarEspectaculo(e.id).then(cargar)}>
                Borrar
              </button>
            </p>
          </section>
        ),
      )}
    </section>
  );
}
