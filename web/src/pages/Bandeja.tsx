import { useEffect, useRef, useState } from 'react';
import { crm, enlaceCorreo, type EstadoMensaje, type MensajeBandeja, NOMBRE_OPORTUNIDAD } from '../crm';
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
function DetalleMensaje({ m, envioConectado, alCambiar }: { m: MensajeBandeja; envioConectado: boolean; alCambiar: (texto?: string) => void }) {
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
    hacer(async () => {
      await aprobarSiHace();
      await crm.enviado(m.id);
    }, `Enviado el ${m.paso}.º correo a ${m.entidad.nombre}.${m.paso === 2 || m.paso === 4 ? ' Te avisaremos para llamar.' : ''}`);
  const llamada = m.paso === 2 || m.paso === 4;

  return (
    <>
      <article className="correo" aria-label={`Correo para ${m.entidad.nombre}`}>
        <header className="correo-barra">
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
                  Abrir en mi correo
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

/** Bandeja: seguimientos por revisar, aprobados por enviar y envíos programados. */
export function Bandeja() {
  const usuario = useCuenta().cuenta?.usuario;
  const [datos, setDatos] = useState<{ items: MensajeBandeja[]; envioConectado: boolean } | null>(null);
  const [actual, setActual] = useState<string | null>(null);
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
        <h2>Bandeja vacía</h2>
        <p className="ayuda">Los seguimientos aparecen aquí unos días después de cada envío. Los primeros correos se preparan en <a href="#/propuestas">Propuestas</a>.</p>
      </div>
    );

  return (
    <div className="bandeja">
      {aviso && (
        <p className="llamada" role="status">
          {aviso}
        </p>
      )}
      <div className="tres-paneles">
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
                    <button key={m.id} type="button" data-id={m.id} className={`item-propuesta${m.id === seleccionado?.id ? ' activa' : ''}`} onClick={() => setActual(m.id)}>
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
        {seleccionado && <DetalleMensaje key={`${seleccionado.id}-${seleccionado.estado}`} m={seleccionado} envioConectado={datos.envioConectado} alCambiar={cambiado} />}
      </div>
    </div>
  );
}
