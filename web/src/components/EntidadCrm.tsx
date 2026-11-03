import { useEffect, useState } from 'react';
import {
  type Certeza,
  crm,
  type Entidad,
  ErrorCrm,
  type FichaEntidad,
  NOMBRE_CERTEZA,
  NOMBRE_HISTORIAL,
  NOMBRE_MENSAJE,
  NOMBRE_OPORTUNIDAD,
  NOMBRE_RELACION,
  NOMBRE_SECUENCIA,
  NOMBRE_TIPO,
  type Oportunidad,
  type Secuencia,
  type TipoHistorial,
  type TipoOportunidad,
} from '../crm';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';

const TONO_CERTEZA: Record<Certeza, string> = { potencial: 'neutro', revisada: 'aviso', confirmada: 'exito' };
const fecha = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export function EtiquetaCerteza({ c }: { c: Certeza }) {
  return <span className={`etiqueta etiqueta-${TONO_CERTEZA[c]}`}>{NOMBRE_CERTEZA[c]}</span>;
}

const ESTADOS_MANUALES: [TipoHistorial, string][] = [
  ['respuesta', 'Respuesta recibida'],
  ['llamada', 'Llamada hecha'],
  ['reunion', 'Reunión prevista'],
  ['interesado', 'Interesado'],
  ['no_interesado', 'No interesado'],
  ['recontactar', 'Volver a contactar más adelante'],
  ['nota', 'Nota'],
  ['optout', 'No quiere recibir más comunicaciones'],
];

/** Anotar lo que pasa fuera del correo; respuesta, reunión, interés o rechazo detienen la secuencia. */
function Anotar({ e, alCambiar }: { e: Entidad; alCambiar: () => void }) {
  const [tipo, setTipo] = useState<TipoHistorial>('respuesta');
  const [texto, setTexto] = useState('');
  const [vence, setVence] = useState('');
  const [error, setError] = useState<string | null>(null);
  const enviar = async () => {
    if (tipo === 'optout' && !window.confirm(`Se anularán todas las secuencias con ${e.nombre} y no se le podrá volver a escribir. ¿Seguro?`)) return;
    try {
      await crm.anotar(e.id, { tipo, texto, vence: vence || null });
      setTexto('');
      setVence('');
      alCambiar();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <div className="anotar">
      <select value={tipo} onChange={(x) => setTipo(x.target.value as TipoHistorial)} aria-label="Qué ha pasado">
        {ESTADOS_MANUALES.map(([t, n]) => (
          <option key={t} value={t}>
            {n}
          </option>
        ))}
      </select>
      {(tipo === 'recontactar' || tipo === 'reunion') && <input type="date" value={vence} onChange={(x) => setVence(x.target.value)} aria-label="Fecha" />}
      <input type="text" value={texto} onChange={(x) => setTexto(x.target.value)} placeholder="Detalle (opcional)" aria-label="Detalle" />
      <button type="button" className="boton" onClick={() => void enviar()}>
        Anotar
      </button>
      {error && <p className="error">{error}</p>}
      {['respuesta', 'reunion', 'interesado', 'no_interesado'].includes(tipo) && <p className="ayuda">Detiene las secuencias activas con esta entidad y cancela lo que no se haya enviado.</p>}
    </div>
  );
}

function Contacto({ e, alCambiar }: { e: Entidad; alCambiar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [d, setD] = useState({ persona: e.persona ?? '', email: e.email ?? '', telefono: e.telefono ?? '', idioma: e.idioma, tipo: e.tipo });
  if (!editando) {
    return (
      <p>
        {[e.persona, e.email, e.telefono].filter(Boolean).join(' · ') || 'Sin contacto'} · cartas en {e.idioma === 'ca' ? 'catalán' : 'castellano'}{' '}
        <button type="button" className="enlace-boton" onClick={() => setEditando(true)}>
          editar
        </button>
      </p>
    );
  }
  return (
    <div className="formulario formulario-ancho">
      <label>
        Persona de contacto
        <input value={d.persona} onChange={(x) => setD({ ...d, persona: x.target.value })} />
      </label>
      <label>
        Email (destinatario de las cartas)
        <input type="email" value={d.email} onChange={(x) => setD({ ...d, email: x.target.value })} />
      </label>
      <label>
        Teléfono
        <input value={d.telefono} onChange={(x) => setD({ ...d, telefono: x.target.value })} />
      </label>
      <label>
        Tipo de entidad
        <select value={d.tipo} onChange={(x) => setD({ ...d, tipo: x.target.value as Entidad['tipo'] })}>
          <option value="ayuntamiento">Ayuntamiento</option>
          <option value="auditorio">Auditorio</option>
          <option value="teatro">Teatro</option>
          <option value="festival">Festival</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label>
        Idioma de las cartas
        <select value={d.idioma} onChange={(x) => setD({ ...d, idioma: x.target.value as 'es' | 'ca' })}>
          <option value="es">Castellano</option>
          <option value="ca">Catalán</option>
        </select>
      </label>
      <p className="acciones">
        <button type="button" className="boton" onClick={() => void crm.guardarEntidad(e.id, d).then(() => (setEditando(false), alCambiar()))}>
          Guardar
        </button>
        <button type="button" className="accion" onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </p>
    </div>
  );
}

/** Nueva oportunidad: tipo, título y propuestas del catálogo (preseleccionadas las que mejor encajan). */
function NuevaOportunidad({ f, inicial, alCrear, alCancelar }: { f: FichaEntidad; inicial: { tipo: TipoOportunidad; titulo: string; ref: string | null }; alCrear: () => void; alCancelar: () => void }) {
  const [tipo, setTipo] = useState(inicial.tipo);
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [elegidos, setElegidos] = useState<string[]>(f.encaje.propuestas.slice(0, 3).map((p) => p.espectaculo.id));
  const [error, setError] = useState<string | null>(null);
  const crear = async () => {
    try {
      await crm.crearOportunidad({ entidad: f.entidad!.id, tipo, titulo, ref: inicial.ref, espectaculos: elegidos });
      alCrear();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <div className="formulario formulario-ancho">
      <label>
        Tipo de oportunidad
        <select value={tipo} onChange={(x) => setTipo(x.target.value as TipoOportunidad)}>
          {(Object.keys(NOMBRE_OPORTUNIDAD) as TipoOportunidad[]).map((t) => (
            <option key={t} value={t}>
              {NOMBRE_OPORTUNIDAD[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Título
        <input value={titulo} onChange={(x) => setTitulo(x.target.value)} placeholder="Temporada de primavera 2027, Nadal 2026…" />
      </label>
      <fieldset>
        <legend>Propuestas que se ofrecen</legend>
        {f.encaje.propuestas.length === 0 && <p className="ayuda">Aún no hay catálogo: <a href="#/catalogo">añade tus espectáculos</a>.</p>}
        {f.encaje.propuestas.map((p) => (
          <label key={p.espectaculo.id} className="casilla">
            <input type="checkbox" checked={elegidos.includes(p.espectaculo.id)} onChange={(x) => setElegidos(x.target.checked ? [...elegidos, p.espectaculo.id] : elegidos.filter((i) => i !== p.espectaculo.id))} />
            {p.espectaculo.nombre} <span className="ayuda">({NOMBRE_TIPO[p.espectaculo.tipo]})</span>
          </label>
        ))}
      </fieldset>
      {error && <p className="error">{error}</p>}
      <p className="acciones">
        <button type="button" className="boton" onClick={() => void crear()}>
          Crear oportunidad
        </button>
        <button type="button" className="accion" onClick={alCancelar}>
          Cancelar
        </button>
      </p>
    </div>
  );
}

/** Abrir la secuencia de una oportunidad; si la entidad ya tiene otra activa, decide el usuario. */
function IniciarSecuencia({ o, e, alCambiar }: { o: Oportunidad; e: Entidad; alCambiar: () => void }) {
  const [destinatario, setDestinatario] = useState(e.email ?? '');
  const [conflicto, setConflicto] = useState<Secuencia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abrir = async (decision?: 'sustituir' | 'nueva') => {
    setError(null);
    try {
      await crm.abrirSecuencia(o.id, destinatario, decision);
      if (!e.email) await crm.guardarEntidad(e.id, { email: destinatario });
      setConflicto(null);
      alCambiar();
    } catch (err) {
      if (err instanceof ErrorCrm && err.detalle?.conflicto) setConflicto(err.detalle.secuencias ?? []);
      setError((err as Error).message);
    }
  };
  if (e.noContactar) return <p className="error">No se puede escribir: pidió no recibir más comunicaciones.</p>;
  return (
    <div className="iniciar-secuencia">
      <input type="email" value={destinatario} onChange={(x) => setDestinatario(x.target.value)} placeholder="Email del destinatario" aria-label="Destinatario" />
      <button type="button" className="boton" onClick={() => void abrir()}>
        Preparar la primera carta
      </button>
      {!e.email && <p className="ayuda">No tenemos su email: escríbelo (o pídelo por teléfono). Se guardará para las siguientes cartas.</p>}
      {error && <p className="error">{error}</p>}
      {conflicto && (
        <p className="acciones">
          <button type="button" className="accion" onClick={() => (setConflicto(null), setError(null))}>
            Esperar
          </button>
          <button type="button" className="accion" onClick={() => void abrir('sustituir')}>
            Sustituir la activa por esta
          </button>
          <button type="button" className="accion" onClick={() => void abrir('nueva')}>
            Iniciar también esta
          </button>
        </p>
      )}
    </div>
  );
}

function Certezas({ o, alCambiar }: { o: Oportunidad; alCambiar: () => void }) {
  const [enlaceOficial, setEnlace] = useState(o.enlaceConfirmacion ?? '');
  const [error, setError] = useState<string | null>(null);
  const cambiar = (certeza: Certeza) =>
    void crm.actualizarOportunidad(o.id, { certeza, ...(certeza === 'confirmada' && { enlaceConfirmacion: enlaceOficial }) }).then(alCambiar, (e: Error) => setError(e.message));
  return (
    <div className="certezas">
      <EtiquetaCerteza c={o.certeza} />
      {o.certeza === 'potencial' && (
        <button type="button" className="enlace-boton" onClick={() => cambiar('revisada')}>
          He revisado los requisitos
        </button>
      )}
      {o.certeza !== 'confirmada' && (
        <span className="confirmar">
          <input type="url" value={enlaceOficial} onChange={(x) => setEnlace(x.target.value)} placeholder="Enlace a la resolución oficial" aria-label="Enlace oficial" />
          <button type="button" className="enlace-boton" disabled={!enlaceOficial} onClick={() => cambiar('confirmada')}>
            Marcar financiación confirmada
          </button>
        </span>
      )}
      {o.enlaceConfirmacion && (
        <a href={o.enlaceConfirmacion} target="_blank" rel="noreferrer">
          Resolución ↗
        </a>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/** Ficha dinámica de una entidad en el seguimiento de la cuenta (o lo que se le podría ofrecer, si aún no está). */
export function EntidadCrm({ refId, id }: { refId?: string; id?: string }) {
  const usuario = useCuenta().cuenta?.usuario;
  const activo = useCuenta().cuenta?.activo;
  const [f, setF] = useState<FichaEntidad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState<{ tipo: TipoOportunidad; titulo: string; ref: string | null } | null>(null);
  const cargar = () => (id ? crm.ficha(id) : crm.fichaRef(refId!)).then(setF, (e: Error) => setError(e.message));
  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario?.email, refId, id]);

  if (!activo) return null;
  if (!usuario) {
    return (
      <section className="bloque">
        <h3>Seguimiento</h3>
        <p className="ayuda">
          Con tu cuenta verás qué propuestas de tu catálogo encajan aquí y podrás preparar cartas con tu visto bueno. <a href="#/cuenta">Entra o crea una cuenta</a>.
        </p>
      </section>
    );
  }
  if (error) return <p className="error">{error}</p>;
  if (!f) return <p className="ayuda">Cargando seguimiento…</p>;
  const e = f.entidad;
  const nombreEsp = (i: string) => f.encaje.propuestas.find((p) => p.espectaculo.id === i)?.espectaculo.nombre ?? 'Espectáculo borrado';

  return (
    <>
      <section className="bloque seguimiento-crm">
        <h3>Seguimiento</h3>
        {!e ? (
          <>
            <p className="ayuda">Aún no está en tu seguimiento.</p>
            <button type="button" className="boton" onClick={() => void crm.crearEntidad({ ref: refId }).then(cargar, (x: Error) => setError(x.message))}>
              + Añadir a mi seguimiento
            </button>
          </>
        ) : (
          <>
            <p className="etiquetas">
              <span className="etiqueta etiqueta-acento">{NOMBRE_RELACION[e.estadoRelacion]}</span>
              {e.noContactar && <span className="etiqueta etiqueta-apagado">No contactar{e.motivoNoContactar ? `: ${e.motivoNoContactar}` : ''}</span>}
            </p>
            {e.noContactar && (
              <button type="button" className="enlace-boton" onClick={() => window.confirm('¿Quitar el «no contactar»? Hazlo solo si te lo han pedido.') && void crm.corregirEstado(e.id, { noContactar: false }).then(cargar)}>
                Quitar «no contactar»
              </button>
            )}
            <Contacto e={e} alCambiar={() => void cargar()} />
            <Anotar e={e} alCambiar={() => void cargar()} />
          </>
        )}
      </section>

      <section className="bloque">
        <h3>Propuestas de tu catálogo que podrían encajar</h3>
        {f.encaje.amplio && f.encaje.propuestas.length > 0 && <p className="ayuda">Sin historial conocido de sus gustos: abanico amplio del catálogo.</p>}
        {f.encaje.propuestas.length === 0 ? (
          <p className="ayuda">
            Tu catálogo está vacío. <a href="#/catalogo">Añade tus espectáculos</a>.
          </p>
        ) : (
          <ul className="lista-simple">
            {f.encaje.propuestas.map((p) => (
              <li key={p.espectaculo.id}>
                <strong>{p.espectaculo.nombre}</strong> <span className="ayuda">{NOMBRE_TIPO[p.espectaculo.tipo]}</span>
                {p.motivos.map((m) => (
                  <span key={m} className="fila-motivos">
                    {m}
                  </span>
                ))}
                {p.avisos.map((m) => (
                  <span key={m} className="fila-aviso">
                    ⚠ {m}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      {e && (
        <section className="bloque">
          <h3>
            Oportunidades <span className="contador">{f.oportunidades.length}</span>
          </h3>
          <p className="ayuda">Cada propuesta concreta (una ayuda, una licitación, un ciclo…) va aparte: la misma entidad puede tener varias a lo largo del tiempo.</p>
          {nueva ? (
            <NuevaOportunidad f={f} inicial={nueva} alCrear={() => (setNueva(null), void cargar())} alCancelar={() => setNueva(null)} />
          ) : (
            <button type="button" className="boton" onClick={() => setNueva({ tipo: 'propuesta', titulo: '', ref: null })}>
              + Nueva oportunidad
            </button>
          )}
          {f.oportunidades.map((o) => {
            const secs = f.secuencias.filter((s) => s.oportunidad === o.id);
            const abierta = secs.find((s) => s.estado === 'activa' || s.estado === 'pausada');
            return (
              <div key={o.id} className="oportunidad">
                <h4>
                  {NOMBRE_OPORTUNIDAD[o.tipo]}: {o.titulo}
                </h4>
                {o.ref?.startsWith('bdns-') && <a href={enlace('convocatoria', o.ref)}>Ver la convocatoria →</a>}
                <Certezas o={o} alCambiar={() => void cargar()} />
                {o.espectaculos.length > 0 && <p className="ayuda">Propuestas: {o.espectaculos.map(nombreEsp).join(', ')}</p>}
                {secs.map((s) => (
                  <div key={s.id} className="secuencia">
                    <p>
                      <span className="etiqueta etiqueta-neutro">{NOMBRE_SECUENCIA[s.estado]}</span> con {s.destinatario}
                      {s.motivoCierre && <span className="ayuda"> · {s.motivoCierre}</span>}
                    </p>
                    <ol className="pasos-secuencia">
                      {[1, 2, 3, 4, 5].map((paso) => {
                        const m = [...s.mensajes].reverse().find((x) => x.paso === paso);
                        return (
                          <li key={paso} className={m?.estado === 'enviado' ? 'hecho' : ''}>
                            {m ? `${NOMBRE_MENSAJE[m.estado]}${m.enviadoEn ? ` el ${fecha(m.enviadoEn)}` : m.estado === 'borrador' && m.disponibleDesde ? ` (desde el ${fecha(m.disponibleDesde)})` : ''}` : 'Pendiente'}
                            {(paso === 2 || paso === 4) && <span className="ayuda"> + llamada</span>}
                          </li>
                        );
                      })}
                    </ol>
                    <p className="acciones">
                      {s.mensajes.some((m) => ['borrador', 'aprobado', 'programado'].includes(m.estado)) && s.estado === 'activa' && (
                        <a className="accion" href="#/bandeja">
                          Revisar en la bandeja
                        </a>
                      )}
                      {s.estado === 'activa' && (
                        <button type="button" className="accion" onClick={() => void crm.pausar(s.id).then(cargar)}>
                          Pausar
                        </button>
                      )}
                      {s.estado === 'pausada' && (
                        <button type="button" className="accion" onClick={() => void crm.reanudar(s.id).then(cargar)}>
                          Reanudar
                        </button>
                      )}
                    </p>
                  </div>
                ))}
                {!abierta && o.estado === 'abierta' && <IniciarSecuencia o={o} e={e} alCambiar={() => void cargar()} />}
              </div>
            );
          })}
        </section>
      )}

      <section className="bloque">
        <h3>Ayudas relacionadas</h3>
        <p className="ayuda">Encaje potencial: parece pertinente, falta verificar. Revisada: has comprobado los requisitos. Confirmada: solo con resolución oficial.</p>
        {f.ayudas.length === 0 ? (
          <p className="ayuda">No hay ayudas vigentes para quien contrata en su territorio.</p>
        ) : (
          <ul className="lista-simple">
            {f.ayudas.map((a) => (
              <li key={a.convocatoria.id}>
                <a href={enlace('convocatoria', a.convocatoria.id)}>{a.convocatoria.tituloCorto ?? a.convocatoria.titulo}</a> <EtiquetaCerteza c={a.certeza} />
                <span className="fila-motivos">{a.motivo}</span>
                {a.espectaculos.length > 0 && <span className="fila-motivos">Podría financiar: {a.espectaculos.map((x) => x.nombre).join(', ')}</span>}
                {e && !f.oportunidades.some((o) => o.ref === a.convocatoria.id) && (
                  <button type="button" className="enlace-boton" onClick={() => setNueva({ tipo: 'subvencion', titulo: a.convocatoria.tituloCorto ?? a.convocatoria.titulo, ref: a.convocatoria.id })}>
                    Crear oportunidad con esta ayuda
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {f.licitaciones.length > 0 && (
        <section className="bloque">
          <h3>Sus licitaciones abiertas</h3>
          <ul className="lista-simple">
            {f.licitaciones.map((l) => (
              <li key={l.contrato.id}>
                <a href={enlace('contrato', l.contrato.id)}>{l.contrato.titulo}</a>
                {l.espectaculos.map((x) => (
                  <span key={x.id} className="fila-motivos">
                    {x.nombre}: {x.viabilidad === 'pendiente' ? 'Pendiente de valorar' : x.viabilidad === 'viable' ? 'Viable a priori' : 'Ajustada'} · {x.motivo}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {e && f.historial.length > 0 && (
        <section className="bloque">
          <h3>Historial</h3>
          <ul className="historial">
            {f.historial.map((h) => (
              <li key={h.id} className={h.hecho ? 'hecho' : ''}>
                <span className="ayuda">{fecha(h.fecha)}</span> <strong>{NOMBRE_HISTORIAL[h.tipo]}</strong>
                {h.texto && ` · ${h.texto}`}
                {h.vence && ` · ${fecha(h.vence)}`}
                {(h.tipo === 'alerta_llamada' || h.tipo === 'recontactar') && !h.hecho && (
                  <button type="button" className="enlace-boton" onClick={() => void crm.hecho(h.id).then(cargar)}>
                    hecho
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
