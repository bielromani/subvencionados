import { useEffect, useRef, useState } from 'react';
import { crm, enlaceCorreo, type EstadoMensaje, type MensajeBandeja, NOMBRE_OPORTUNIDAD } from '../crm';
import { CopiarCorreo, confirmarEnviado } from '../components/CopiarCorreo';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';

const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fichaDe = (m: MensajeBandeja) => (m.entidad.ref ? enlace('programador', m.entidad.ref) : enlace('entidad', m.entidad.id));

/** Grupos de la lista, en el orden en que hay que atenderlos. */
const GRUPOS: [EstadoMensaje, string, string][] = [
  ['aprobado', 'Aprobados, falta enviarlos', 'tono-verde'],
  ['borrador', 'Por revisar', 'tono-azul'],
  ['programado', 'Programados', 'tono-ambar'],
];

/** El correo de un paso de la secuencia, editable mientras es borrador, con las acciones de su estado. */
function DetalleMensaje({ m, envioConectado, alCambiar, alVolver }: { m: MensajeBandeja; envioConectado: boolean; alCambiar: (texto?: string) => void; alVolver: () => void }) {
  const [asunto, setAsunto] = useState(m.asunto);
  const [cuerpo, setCuerpo] = useState(m.cuerpo);
  const [programar, setProgramar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const editable = m.estado === 'borrador';
  const editado = asunto !== m.asunto || cuerpo !== m.cuerpo;

  const hacer = async (fn: () => Promise<unknown>, texto?: string) => {
    setError(null);
    setOcupado(true);
    try {
      if (editado && editable) await crm.editar(m.id, asunto, cuerpo);
      await fn();
      alCambiar(texto);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };
  // Un borrador se aprueba al abrirlo en el correo o al marcarlo como enviado: un clic menos.
  const aprobarSiHace = async () => {
    if (editable) await crm.aprobar(m.id);
  };
  const abrirCorreo = () =>
    hacer(async () => {
      await aprobarSiHace();
      window.location.href = enlaceCorreo(m.destinatario, asunto, cuerpo);
    });
  const enviado = () =>
    confirmarEnviado() &&
    hacer(async () => {
      await aprobarSiHace();
      await crm.enviado(m.id);
    }, `Enviado el ${m.paso}.º correo a ${m.entidad.nombre}.${m.paso === 2 || m.paso === 4 ? ' Te avisaremos para llamar.' : ''}`);
  const llamada = m.paso === 2 || m.paso === 4;

  return (
    <>
      <article className="correo" aria-label={`Correo para ${m.entidad.nombre}`}>
        <header className="correo-barra">
          <button type="button" className="volver-movil" onClick={alVolver}>
            ← Volver a la lista
          </button>
          <div className="correo-titulo">
            <span className="ayuda">
              {m.paso === 1 ? 'Primer correo' : `Seguimiento · ${m.paso}.º de 5`}
            </span>
            <h2>
              <a href={fichaDe(m)}>{m.entidad.nombre}</a>
            </h2>
          </div>
          <div className="correo-acciones">
            {m.estado === 'programado' ? (
              <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(() => crm.cancelar(m.id), 'Envío programado cancelado: vuelve a ser borrador.')}>
                Cancelar el envío programado
              </button>
            ) : (
              <>
                {editable ? (
                  <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(() => crm.descartar(m.id), `Descartado el correo a ${m.entidad.nombre}.`)}>
                    Descartar
                  </button>
                ) : (
                  <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(() => crm.cancelar(m.id))}>
                    Volver a borrador
                  </button>
                )}
                <button type="button" className="accion" disabled={ocupado} onClick={() => void abrirCorreo()}>
                  <span className="solo-escritorio">Abrir en mi correo</span>
                  <span className="solo-movil">Abrir correo</span>
                </button>
                <button type="button" className="boton" disabled={ocupado} onClick={() => void enviado()}>
                  Ya lo he enviado
                </button>
              </>
            )}
          </div>
        </header>
        <div className="correo-hoja">
          <div className="correo-campo">
            <span>Para</span>
            <span className="correo-valor">{m.destinatario}</span>
          </div>
          <label className="correo-campo">
            <span>Asunto</span>
            <input className="correo-asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} disabled={!editable} />
          </label>
          <textarea className="correo-cuerpo" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={Math.max(12, cuerpo.split('\n').length + 2)} aria-label="Texto del correo" disabled={!editable} />
          <footer className="correo-pie">
            {m.estado === 'programado' && m.programadoPara ? (
              <span>Saldrá el {fechaHora(m.programadoPara)}. Puedes cancelarlo hasta entonces.</span>
            ) : m.estado === 'aprobado' ? (
              <span>Aprobado. Envíalo desde tu correo y pulsa «Ya lo he enviado»: desde ese momento cuentan los días hasta el siguiente.</span>
            ) : editado ? (
              <>
                <span>Has cambiado el correo.</span>
                <button type="button" className="enlace-boton" disabled={ocupado} onClick={() => void hacer(async () => undefined, 'Cambios guardados.')}>
                  Guardar cambios
                </button>
              </>
            ) : (
              <span>Haz clic en el texto para editarlo. Nada se envía sin ti.</span>
            )}
          </footer>
        </div>
        {m.estado !== 'programado' && <CopiarCorreo para={m.destinatario} asunto={asunto} cuerpo={cuerpo} />}
        {error && <p className="error">{error}</p>}
        {envioConectado && editable && (
          <div className="programar-envio">
            <label>
              Programar el envío
              <input type="datetime-local" value={programar} onChange={(e) => setProgramar(e.target.value)} />
            </label>
            <button type="button" className="accion" disabled={ocupado || !programar} onClick={() => void hacer(() => crm.aprobar(m.id, new Date(programar).toISOString()), 'Envío programado.')}>
              Aprobar y programar
            </button>
          </div>
        )}
      </article>

      <aside className="por-que" aria-label="Secuencia">
        <section>
          <h3>Secuencia</h3>
          <ol className="pasos-mini" aria-label={`Paso ${m.paso} de 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n} className={n < m.paso ? 'hecho' : n === m.paso ? 'actual' : ''}>
                <span>{n}</span>
              </li>
            ))}
          </ol>
          <p className="ayuda">
            {m.paso === 1 ? 'Primer contacto.' : `Han pasado al menos los días pactados desde el ${m.paso - 1}.º correo sin respuesta.`}
            {llamada && ' Después de este, toca llamar.'}
            {m.paso === 5 && ' Es el último: si no responden, la secuencia se archiva.'}
          </p>
        </section>
        <section>
          <h4 className="titulo-pequeno">Oportunidad</h4>
          <p className="contacto-breve">
            <strong>{m.oportunidad.titulo}</strong>
            <span className="ayuda">{NOMBRE_OPORTUNIDAD[m.oportunidad.tipo]}</span>
          </p>
        </section>
        <section>
          <h4 className="titulo-pequeno">Contacto</h4>
          <p className="contacto-breve">
            {m.entidad.persona && <strong>{m.entidad.persona}</strong>}
            <span>{m.destinatario}</span>
            {m.entidad.telefono && <a href={`tel:${m.entidad.telefono.replace(/\s/g, '')}`}>{m.entidad.telefono}</a>}
          </p>
        </section>
        <p className="nota-suave">
          Si te han contestado, anótalo en <a href={fichaDe(m)}>su ficha</a>: la secuencia se detiene sola.
        </p>
      </aside>
    </>
  );
}

const ESTADO_SECUENCIA: Record<string, string> = {
  activa: 'Seguimiento en marcha',
  pausada: 'Seguimiento en pausa',
  respondida: 'Han respondido',
  sin_respuesta: 'Sin respuesta tras 5 correos',
  anulada: 'Seguimiento cancelado',
  sustituida: 'Sustituido por otro seguimiento',
};

/** Lo enviado: cada correo marcado como enviado, con fecha, destinatario y texto, para tener constancia. */
function Enviados() {
  const [items, setItems] = useState<MensajeBandeja[] | null>(null);
  const [actual, setActual] = useState<string | null>(null);
  const [detalleMovil, setDetalleMovil] = useState(false);
  const [busca, setBusca] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    crm.enviados().then((r) => setItems(r.items), (e: Error) => setError(e.message));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!items) return <p className="ayuda">Cargando…</p>;
  if (!items.length)
    return (
      <div className="bloque vacio">
        <h2>Aún no has marcado ningún correo como enviado</h2>
        <p className="ayuda">Cuando envíes un correo desde tu programa de correo y pulses «Ya lo he enviado», quedará aquí con su fecha y su texto.</p>
      </div>
    );
  const q = busca.trim().toLowerCase();
  const visibles = items.filter((m) => !q || `${m.entidad.nombre} ${m.destinatario} ${m.asunto}`.toLowerCase().includes(q));
  const m = visibles.find((x) => x.id === actual) ?? visibles[0] ?? null;
  return (
    <div className={`tres-paneles enviados${detalleMovil ? ' ver-detalle' : ''}`}>
      <section className="lista-propuestas" aria-label="Correos enviados">
        <label className="buscador buscador-lista">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input type="search" placeholder="Buscar sitio o email…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar en enviados" />
        </label>
        <div className="lista-desplazable">
          {visibles.map((x) => (
            <button key={x.id} type="button" className={`item-propuesta${x.id === m?.id ? ' activa' : ''}`} onClick={() => (setActual(x.id), setDetalleMovil(true), window.scrollTo({ top: 0 }))}>
              <span className="item-cabecera">
                <strong>{x.entidad.nombre}</strong>
                <span>{x.enviadoEn ? new Date(x.enviadoEn).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}</span>
              </span>
              <span className="item-asunto">
                {x.paso}.º correo · {x.destinatario}
              </span>
            </button>
          ))}
        </div>
      </section>
      {m && (
        <article className="correo" aria-label={`Correo enviado a ${m.entidad.nombre}`}>
          <header className="correo-barra">
            <button type="button" className="volver-movil" onClick={() => setDetalleMovil(false)}>
              ← Volver a la lista
            </button>
            <div className="correo-titulo">
              <span className="ayuda">
                {m.paso}.º correo de 5 · marcado como enviado el {m.enviadoEn ? fechaHora(m.enviadoEn) : '—'}
              </span>
              <h2>
                <a href={fichaDe(m)}>{m.entidad.nombre}</a>
              </h2>
            </div>
            <span className="etiqueta">{ESTADO_SECUENCIA[m.secuenciaEstado ?? ''] ?? ''}</span>
          </header>
          <div className="correo-hoja">
            <div className="correo-campo">
              <span>Para</span>
              <span className="correo-valor">{m.destinatario}</span>
            </div>
            <div className="correo-campo">
              <span>Asunto</span>
              <span className="correo-valor correo-asunto">{m.asunto}</span>
            </div>
            <div className="correo-cuerpo correo-leido">{m.cuerpo}</div>
          </div>
          <CopiarCorreo para={m.destinatario} asunto={m.asunto} cuerpo={m.cuerpo} />
        </article>
      )}
    </div>
  );
}

/** Bandeja: lo pendiente de enviar (seguimientos, aprobados, programados) y lo ya enviado. */
export function Bandeja() {
  const usuario = useCuenta().cuenta?.usuario;
  const [vista, setVista] = useState<'pendientes' | 'enviados'>('pendientes');
  if (!usuario) return <p className="llamada">La bandeja es de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;
  return (
    <>
      <div className="pestanas-pagina" role="tablist" aria-label="Bandeja">
        <button type="button" role="tab" aria-selected={vista === 'pendientes'} className={vista === 'pendientes' ? 'activa' : ''} onClick={() => setVista('pendientes')}>
          Por enviar
        </button>
        <button type="button" role="tab" aria-selected={vista === 'enviados'} className={vista === 'enviados' ? 'activa' : ''} onClick={() => setVista('enviados')}>
          Enviados
        </button>
      </div>
      {vista === 'pendientes' ? <PorEnviar /> : <Enviados />}
    </>
  );
}

/** Seguimientos por revisar, aprobados por enviar y envíos programados. */
function PorEnviar() {
  const usuario = useCuenta().cuenta?.usuario;
  const [datos, setDatos] = useState<{ items: MensajeBandeja[]; envioConectado: boolean; automatico?: boolean } | null>(null);
  const [actual, setActual] = useState<string | null>(null);
  // En el móvil: la lista o el correo a pantalla completa.
  const [detalleMovil, setDetalleMovil] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const cargar = () => crm.bandeja().then(setDatos, (e: Error) => setError(e.message));
  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario?.email]);

  const ordenados = GRUPOS.flatMap(([estado]) => (datos?.items ?? []).filter((m) => m.estado === estado));
  const indice = Math.max(0, ordenados.findIndex((m) => m.id === actual));
  const seleccionado = ordenados[indice] ?? null;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      const paso = e.key === 'j' ? 1 : e.key === 'k' ? -1 : 0;
      if (!paso || !ordenados.length) return;
      const s = ordenados[Math.min(ordenados.length - 1, Math.max(0, indice + paso))];
      setActual(s.id);
      lista.current?.querySelector(`[data-id="${s.id}"]`)?.scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ordenados, indice]);

  if (!usuario) return <p className="llamada">La bandeja es de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  const cambiado = (texto?: string) => {
    if (texto) setAviso(texto);
    void cargar();
  };

  if (datos.items.length === 0)
    return (
      <div className="bloque vacio">
        <h2>Nada pendiente de enviar</h2>
        <p className="ayuda">
          Los seguimientos aparecen aquí unos diez días después de cada envío. Los primeros correos se preparan en <a href="#/propuestas">Propuestas</a>. Lo que ya has enviado está en la pestaña «Enviados».
        </p>
      </div>
    );

  return (
    <div className="bandeja">
      {datos.automatico && (
        <p className="llamada" role="note">
          El envío automático está activado: los seguimientos y los primeros correos aceptados salen solos desde tu correo, de lunes a viernes de 9 a 18 h. No hace falta enviarlos a mano; si
          quieres que uno no salga, descártalo o pausa su seguimiento en la ficha.
        </p>
      )}
      {aviso && (
        <p className="llamada" role="status">
          {aviso}
        </p>
      )}
      <div className={`tres-paneles${detalleMovil ? ' ver-detalle' : ''}`}>
        <section className="lista-propuestas" aria-label="Correos de la bandeja">
          <div className="lista-desplazable" ref={lista}>
            {GRUPOS.map(([estado, nombre, tono]) => {
              const xs = datos.items.filter((m) => m.estado === estado);
              if (!xs.length) return null;
              return (
                <div key={estado}>
                  <p className={`grupo-bandeja ${tono}`}>
                    {nombre} <span className="contador">{xs.length}</span>
                  </p>
                  {xs.map((m) => (
                    <button key={m.id} type="button" data-id={m.id} className={`item-propuesta${m.id === seleccionado?.id ? ' activa' : ''}`} onClick={() => (setActual(m.id), setDetalleMovil(true), window.scrollTo({ top: 0 }))}>
                      <span className="item-cabecera">
                        <strong>{m.entidad.nombre}</strong>
                        <span>{m.paso}.º de 5</span>
                      </span>
                      <span className="item-asunto">{m.asunto}</span>
                      {m.estado === 'programado' && m.programadoPara && <span className="item-asunto tono-ambar">Sale el {fechaHora(m.programadoPara)}</span>}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
        {seleccionado && <DetalleMensaje key={`${seleccionado.id}-${seleccionado.estado}`} m={seleccionado} envioConectado={datos.envioConectado} alCambiar={cambiado} alVolver={() => setDetalleMovil(false)} />}
      </div>
    </div>
  );
}
