import { useEffect, useRef, useState } from 'react';
import { crm, enlaceCorreo, type Mensaje, NOMBRE_TIPO, type PropuestaPreparada } from '../crm';
import { CopiarCorreo, confirmarEnviado } from '../components/CopiarCorreo';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';
import type { Meta } from '../tipos';

const fecha = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : null);
type Filtro = 'todas' | 'ayuda' | 'licitacion';

/** Etiquetas de una propuesta en la lista: estilos que se ofrecen, ayuda, licitación e idioma. */
function Chips({ p }: { p: PropuestaPreparada }) {
  const tipos = [...new Set(p.espectaculos.map((e) => NOMBRE_TIPO[e.tipo]))].slice(0, 2);
  return (
    <span className="etiquetas">
      {tipos.map((t) => (
        <span key={t} className="etiqueta etiqueta-acento">
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </span>
      ))}
      {p.ayudas.length > 0 && <span className="etiqueta etiqueta-aviso">Ayuda abierta</span>}
      {p.licitaciones.length > 0 && <span className="etiqueta etiqueta-exito">Licitación</span>}
      {p.idioma === 'ca' && <span className="etiqueta">En catalán</span>}
    </span>
  );
}

/** El correo de una propuesta, editable, con las acciones: descartar, abrir en el correo y marcar como enviado. */
function DetallePropuesta({ p, posicion, automatico, alTerminar, alVolver }: { p: PropuestaPreparada; posicion: string; automatico: boolean; alTerminar: (texto: string) => void; alVolver: () => void }) {
  const [asunto, setAsunto] = useState(p.asunto);
  const [cuerpo, setCuerpo] = useState(p.cuerpo);
  const [destinatario, setDestinatario] = useState(p.destinatario);
  const [aprobado, setAprobado] = useState<Mensaje | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const editado = asunto !== p.asunto || cuerpo !== p.cuerpo || destinatario !== p.destinatario;
  const hacer = async (fn: () => Promise<unknown>) => {
    setError(null);
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };
  // Al aceptar se crea la secuencia con este primer correo; los días de seguimiento cuentan desde «Ya lo he enviado».
  const asegurarAprobado = async (): Promise<Mensaje> => {
    if (aprobado) return aprobado;
    const { mensaje } = await crm.aceptarPropuesta(p.id, { asunto, cuerpo, destinatario });
    if (!mensaje) throw new Error('No se ha podido preparar el envío. Vuelve a intentarlo.');
    setAprobado(mensaje);
    return mensaje;
  };
  const abrirCorreo = () =>
    hacer(async () => {
      const m = await asegurarAprobado();
      window.location.href = enlaceCorreo(destinatario, m.asunto, m.cuerpo);
    });
  const enviado = () =>
    confirmarEnviado() &&
    hacer(async () => {
      const m = await asegurarAprobado();
      await crm.enviado(m.id);
      alTerminar(`Enviado a ${p.nombre}. Queda en seguimiento: el próximo correo aparecerá en la Bandeja y te avisaremos de cuándo llamar.`);
    });
  // Con el envío automático: el visto bueno basta, la web lo envía desde el correo de la cuenta.
  const aceptar = () =>
    hacer(async () => {
      await asegurarAprobado();
      alTerminar(`Aceptada. El correo a ${p.nombre} saldrá solo en el próximo envío (de lunes a viernes, de 9 a 18 h).`);
    });
  const descartar = () => hacer(async () => (await crm.descartarPropuesta(p.id), alTerminar(`Descartada la propuesta a ${p.nombre}.`)));

  return (
    <>
      <article className="correo" aria-label={`Correo para ${p.nombre}`}>
        <header className="correo-barra">
          <button type="button" className="volver-movil" onClick={alVolver}>
            ← Volver a la lista
          </button>
          <div className="correo-titulo">
            <span className="ayuda">{posicion}</span>
            <h2>
              <a href={enlace('programador', p.ref)}>{p.nombre}</a>
            </h2>
          </div>
          <div className="correo-acciones">
            <button type="button" className="accion" disabled={ocupado || !!aprobado} onClick={() => void descartar()}>
              Descartar
            </button>
            {automatico ? (
              <button type="button" className="boton" disabled={ocupado} onClick={() => void aceptar()}>
                Aceptar y enviar
              </button>
            ) : (
              <>
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
          <label className="correo-campo">
            <span>Para</span>
            <input type="email" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} disabled={!!aprobado} />
            {!p.revisarEmail && <span className="etiqueta etiqueta-exito">Contacto de cultura</span>}
          </label>
          <label className="correo-campo">
            <span>Asunto</span>
            <input className="correo-asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} disabled={!!aprobado} />
          </label>
          <textarea
            className="correo-cuerpo"
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            rows={Math.max(14, cuerpo.split('\n').length + 2)}
            aria-label="Texto del correo"
            disabled={!!aprobado}
          />
          <footer className="correo-pie">
            {aprobado ? (
              <span>Correo abierto en tu programa de correo. Cuando lo envíes, pulsa «Ya lo he enviado».</span>
            ) : editado ? (
              <>
                <span>Has cambiado el correo.</span>
                <button
                  type="button"
                  className="enlace-boton"
                  disabled={ocupado}
                  onClick={() => void hacer(async () => (await crm.guardarPropuesta(p.id, { asunto, cuerpo, destinatario }), setGuardado(true)))}
                >
                  Guardar cambios
                </button>
              </>
            ) : (
              <span>{guardado ? 'Cambios guardados.' : automatico ? 'Haz clic en el texto para editarlo. Solo sale lo que aceptas.' : 'Haz clic en el texto para editarlo. Nada se envía sin ti.'}</span>
            )}
            <a className="enlace-pie" href="#/cartas">
              Cambiar la plantilla de todos los correos →
            </a>
          </footer>
        </div>
        <CopiarCorreo para={destinatario} asunto={asunto} cuerpo={cuerpo} />
        {error && <p className="error">{error}</p>}
        <p className="atajos-teclado ayuda">
          <kbd>J</kbd>/<kbd>K</kbd> siguiente y anterior
        </p>
      </article>

      <aside className="por-que" aria-label="Por qué este sitio">
        <section>
          <h3>Por qué este sitio</h3>
          <ul className="puntos">
            {p.motivos.map((m) => (
              <li key={m}>{m}</li>
            ))}
            {p.ayudas.map((a) => (
              <li key={a.id} className="punto-aviso">
                Ayuda abierta: <a href={enlace('convocatoria', a.id)}>{a.titulo}</a>
                {a.fin && ` · hasta el ${fecha(a.fin)}`}
              </li>
            ))}
            {p.licitaciones.map((l) => (
              <li key={l.id} className="punto-exito">
                Licitación abierta: <a href={enlace('contrato', l.id)}>{l.titulo}</a>
                {l.fin && ` · ofertas hasta el ${fecha(l.fin)}`}
              </li>
            ))}
            {p.gestion.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="titulo-pequeno">Producciones que se proponen</h4>
          <ul className="producciones">
            {p.espectaculos.map((e) => (
              <li key={e.id}>
                <strong>{e.nombre}</strong>
                <span className="ayuda">{NOMBRE_TIPO[e.tipo]}</span>
                {e.avisos.length > 0 && <span className="fila-aviso">{e.avisos[0]}</span>}
              </li>
            ))}
          </ul>
        </section>
        {(p.persona || p.telefono) && (
          <section>
            <h4 className="titulo-pequeno">Contacto</h4>
            <p className="contacto-breve">
              {p.persona && (
                <strong>
                  {p.persona}
                  {p.cargo ? ` · ${p.cargo}` : ''}
                </strong>
              )}
              {p.telefono && <a href={`tel:${p.telefono.replace(/\s/g, '')}`}>{p.telefono}</a>}
            </p>
          </section>
        )}
        {p.revisarEmail && (
          <p className="nota-aviso">
            <strong>Antes de enviar:</strong> {p.revisarEmail}
          </p>
        )}
      </aside>
    </>
  );
}

/** Propuestas preparadas: un correo ya escrito para cada sitio donde encaja el catálogo, listo para revisar y enviar. */
export function Propuestas({ meta }: { meta: Meta }) {
  const usuario = useCuenta().cuenta?.usuario;
  const [items, setItems] = useState<PropuestaPreparada[] | null>(null);
  const [actual, setActual] = useState<string | null>(null);
  // En el móvil: la lista o el correo a pantalla completa.
  const [detalleMovil, setDetalleMovil] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [ccaa, setCcaa] = useState('');
  const [cuantas, setCuantas] = useState(20);
  const [aviso, setAviso] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [automatico, setAutomatico] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const cargar = () => crm.propuestas().then((r) => setItems(r.items), (e: Error) => setAviso(e.message));
  useEffect(() => {
    if (!usuario) return;
    void cargar();
    crm.ajustes().then((r) => setAutomatico(r.envioConectado && !!r.ajustes.envioAutomatico), () => undefined);
  }, [usuario?.email]);

  const visibles = (items ?? []).filter((p) => (filtro === 'ayuda' ? p.ayudas.length > 0 : filtro === 'licitacion' ? p.licitaciones.length > 0 : true));
  const indice = Math.max(0, visibles.findIndex((p) => p.id === actual));
  const seleccionada = visibles[indice] ?? null;

  // J/K para pasar de una propuesta a otra sin el ratón (salvo escribiendo).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      const paso = e.key === 'j' ? 1 : e.key === 'k' ? -1 : 0;
      if (!paso || !visibles.length) return;
      const siguiente = visibles[Math.min(visibles.length - 1, Math.max(0, indice + paso))];
      setActual(siguiente.id);
      lista.current?.querySelector(`[data-id="${siguiente.id}"]`)?.scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [visibles, indice]);

  if (!usuario) return <p className="llamada">Las propuestas son de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;

  const preparar = async () => {
    setPreparando(true);
    setAviso(null);
    try {
      const r = await crm.prepararPropuestas(cuantas, ccaa);
      setAviso(r.nuevas ? `${r.nuevas} propuestas nuevas preparadas.` : 'No hay más sitios que encajen con estos filtros (o ya están en seguimiento o descartados).');
      await cargar();
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setPreparando(false);
    }
  };
  const aceptarTodas = async () => {
    const ids = visibles.map((p) => p.id);
    if (!window.confirm(`¿Aceptar las ${ids.length} propuestas de la lista tal como están? Saldrán solas poco a poco, sin pasar del tope diario. Las que tienen un email por revisar se quedan aquí.`)) return;
    setPreparando(true);
    try {
      const r = await crm.aceptarTodas(ids);
      setAviso(`${r.aceptadas} aceptadas: saldrán solas, sin pasar del tope diario.${r.porRevisar ? ` ${r.porRevisar} con el email por revisar se quedan aquí.` : ''}`);
      await cargar();
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setPreparando(false);
    }
  };
  const terminar = (id: string) => (texto: string) => {
    const resto = visibles.filter((x) => x.id !== id);
    setActual(resto[Math.min(indice, resto.length - 1)]?.id ?? null);
    setItems((xs) => xs?.filter((x) => x.id !== id) ?? null);
    setAviso(texto);
  };

  return (
    <div className="propuestas">
      <div className="barra-herramientas">
        <label>
          <span className="sr-only">Comunidad</span>
          <select value={ccaa} onChange={(e) => setCcaa(e.target.value)} aria-label="Comunidad">
            <option value="">Toda España</option>
            {meta.ccaa.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Cuántas</span>
          <select value={cuantas} onChange={(e) => setCuantas(Number(e.target.value))} aria-label="Cuántas propuestas preparar">
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} propuestas
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="boton" disabled={preparando} onClick={() => void preparar()}>
          {preparando ? 'Preparando… (medio minuto)' : 'Preparar más'}
        </button>
        {automatico && visibles.length > 0 && (
          <button type="button" className="accion" disabled={preparando} onClick={() => void aceptarTodas()}>
            Aceptar todas ({visibles.length})
          </button>
        )}
        <span className="ayuda">Se preparan solas cada día cruzando tu catálogo con lo que programa cada sitio, sus ayudas y sus licitaciones.</span>
      </div>
      {aviso && (
        <p className="llamada" role="status">
          {aviso}
        </p>
      )}

      {items && items.length === 0 ? (
        <div className="bloque vacio">
          <h2>No hay propuestas pendientes</h2>
          <p className="ayuda">Pulsa «Preparar más» o vuelve mañana: se preparan solas cada día.</p>
        </div>
      ) : (
        <div className={`tres-paneles${detalleMovil ? ' ver-detalle' : ''}`}>
          <section className="lista-propuestas" aria-label="Lista de propuestas">
            <div className="segmentado" role="tablist" aria-label="Filtrar">
              {(
                [
                  ['todas', `Todas · ${items?.length ?? '…'}`],
                  ['ayuda', 'Con ayuda'],
                  ['licitacion', 'Con licitación'],
                ] as [Filtro, string][]
              ).map(([f, t]) => (
                <button key={f} type="button" role="tab" aria-selected={filtro === f} className={filtro === f ? 'activa' : ''} onClick={() => setFiltro(f)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="lista-desplazable" ref={lista}>
              {!items && <p className="vacio-suave">Cargando…</p>}
              {items && visibles.length === 0 && <p className="vacio-suave">Ninguna con este filtro.</p>}
              {visibles.map((p) => (
                <button key={p.id} type="button" data-id={p.id} className={`item-propuesta${p.id === seleccionada?.id ? ' activa' : ''}`} onClick={() => (setActual(p.id), setDetalleMovil(true), window.scrollTo({ top: 0 }))}>
                  <span className="item-cabecera">
                    <strong>{p.nombre}</strong>
                    <span>{p.provincia ?? p.ccaa}</span>
                  </span>
                  <span className="item-asunto">{p.asunto}</span>
                  <Chips p={p} />
                </button>
              ))}
            </div>
          </section>
          {seleccionada && <DetallePropuesta key={seleccionada.id} p={seleccionada} posicion={`Propuesta ${indice + 1} de ${visibles.length}`} automatico={automatico} alTerminar={terminar(seleccionada.id)} alVolver={() => setDetalleMovil(false)} />}
        </div>
      )}
    </div>
  );
}
