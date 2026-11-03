import { useEffect, useState } from 'react';
import { crm, enlaceCorreo, type Mensaje, NOMBRE_TIPO, type PropuestaPreparada } from '../crm';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';
import type { Meta } from '../tipos';

const fecha = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : null);

/** Una propuesta: por qué este sitio, qué se le ofrece y el correo ya escrito para revisar, aprobar y enviar. */
function TarjetaPropuesta({ p, alTerminar }: { p: PropuestaPreparada; alTerminar: () => void }) {
  const [asunto, setAsunto] = useState(p.asunto);
  const [cuerpo, setCuerpo] = useState(p.cuerpo);
  const [destinatario, setDestinatario] = useState(p.destinatario);
  const [aprobado, setAprobado] = useState<Mensaje | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
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

  return (
    <section className="bloque propuesta">
      <h3>
        <a href={enlace('programador', p.ref)}>{p.nombre}</a> <span className="ayuda">{[p.provincia, p.ccaa].filter(Boolean).join(' · ')}</span>
      </h3>
      <ul className="lista-simple motivos-propuesta">
        {p.motivos.map((m) => (
          <li key={m}>{m}</li>
        ))}
        {p.ayudas.map((a) => (
          <li key={a.id}>
            <span className="etiqueta etiqueta-neutro">Encaje potencial</span> <a href={enlace('convocatoria', a.id)}>{a.titulo}</a>
            {a.fin && ` · hasta el ${fecha(a.fin)}`}
          </li>
        ))}
        {p.licitaciones.map((l) => (
          <li key={l.id}>
            <span className="etiqueta etiqueta-exito">Licitación abierta</span> <a href={enlace('contrato', l.id)}>{l.titulo}</a>
            {l.fin && ` · ofertas hasta el ${fecha(l.fin)}`}
          </li>
        ))}
      </ul>
      <p className="etiquetas">
        {p.espectaculos.map((e) => (
          <span key={e.id} className="etiqueta etiqueta-acento" title={[...e.motivos, ...e.avisos].join(' · ')}>
            {e.nombre} <span className="ayuda">({NOMBRE_TIPO[e.tipo]})</span>
          </span>
        ))}
      </p>

      {enviado ? (
        <p className="llamada">✓ Enviado. Ya está en seguimiento: el próximo correo aparecerá en la Bandeja en unos días y te avisaremos de cuándo llamar.</p>
      ) : aprobado ? (
        <>
          <p className="llamada">Aprobado. Envíalo desde tu correo y confirma aquí; desde ese momento cuentan los días para el seguimiento.</p>
          <p className="acciones">
            <a className="boton" href={enlaceCorreo(destinatario, aprobado.asunto, aprobado.cuerpo)}>
              ✉ Abrir en mi correo
            </a>
            <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(async () => (await crm.enviado(aprobado.id), setEnviado(true)))}>
              Ya lo he enviado
            </button>
          </p>
        </>
      ) : (
        <>
          <label className="destinatario">
            Para{p.persona ? `: ${p.persona}${p.cargo ? ` (${p.cargo})` : ''}` : ''}
            <input type="email" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} />
          </label>
          {p.revisarEmail && <p className="fila-aviso">⚠ {p.revisarEmail}{p.telefono ? ` · Tel. ${p.telefono}` : ''}</p>}
          <details className="correo-propuesta">
            <summary>
              <strong>{asunto}</strong> <span className="ayuda">(ver y editar el correo)</span>
            </summary>
            <input className="mensaje-asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} aria-label="Asunto" />
            <textarea className="mensaje-cuerpo" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={Math.min(28, cuerpo.split('\n').length + 3)} aria-label="Texto" />
          </details>
          {error && <p className="error">{error}</p>}
          <p className="acciones">
            <button
              type="button"
              className="boton"
              disabled={ocupado}
              onClick={() => void hacer(async () => setAprobado((await crm.aceptarPropuesta(p.id, { asunto, cuerpo, destinatario })).mensaje))}
            >
              ✓ Dar el visto bueno
            </button>
            {editado && (
              <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(() => crm.guardarPropuesta(p.id, { asunto, cuerpo, destinatario }))}>
                Guardar cambios
              </button>
            )}
            <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(async () => (await crm.descartarPropuesta(p.id), alTerminar()))}>
              Descartar
            </button>
          </p>
        </>
      )}
    </section>
  );
}

/** Propuestas preparadas: un correo ya escrito para cada sitio donde encaja el catálogo, listo para revisar y enviar. */
export function Propuestas({ meta }: { meta: Meta }) {
  const usuario = useCuenta().cuenta?.usuario;
  const [items, setItems] = useState<PropuestaPreparada[] | null>(null);
  const [ccaa, setCcaa] = useState('');
  const [cuantas, setCuantas] = useState(20);
  const [aviso, setAviso] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const cargar = () => crm.propuestas().then((r) => setItems(r.items), (e: Error) => setAviso(e.message));
  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario?.email]);
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

  return (
    <section>
      <section className="bloque">
        <h3>
          Propuestas preparadas <span className="contador">{items?.length ?? '…'}</span>
        </h3>
        <p className="ayuda">
          Cada día se cruzan tu catálogo con todos los ayuntamientos, teatros y auditorios de España: lo que han programado, las ayudas vigentes en su territorio y sus licitaciones abiertas. Para
          cada sitio que encaja queda un correo ya escrito a la persona de cultura, con todas tus propuestas que encajan. Nada se envía sin tu visto bueno.
        </p>
        <div className="fila-campos">
          <label>
            Comunidad
            <select value={ccaa} onChange={(e) => setCcaa(e.target.value)}>
              <option value="">Toda España</option>
              {meta.ccaa.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Cuántas
            <select value={cuantas} onChange={(e) => setCuantas(Number(e.target.value))}>
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="acciones">
          <button type="button" className="boton" disabled={preparando} onClick={() => void preparar()}>
            {preparando ? 'Preparando… (puede tardar medio minuto)' : '+ Preparar más propuestas'}
          </button>
        </p>
        {aviso && <p className="llamada">{aviso}</p>}
      </section>
      {items?.length === 0 && <p className="ayuda">No hay propuestas pendientes. Pulsa «Preparar más propuestas» o vuelve mañana: se preparan solas cada día.</p>}
      {items?.map((p) => (
        <TarjetaPropuesta key={p.id} p={p} alTerminar={() => setItems((xs) => xs?.filter((x) => x.id !== p.id) ?? null)} />
      ))}
    </section>
  );
}
