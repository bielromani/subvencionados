import { useState } from 'react';
import { crm, enlaceCorreo, type Mensaje, NOMBRE_MENSAJE } from '../crm';

const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Un mensaje de la secuencia para revisar: se lee y se edita; nada sale sin el visto bueno. Aprobado, se abre en el
 * correo propio y se confirma el envío (ese es el envío efectivo); con el correo conectado, se puede programar y
 * cancelar hasta que sale.
 */
export function MensajeCrm({ m, destinatario, envioConectado, alCambiar }: { m: Mensaje; destinatario: string; envioConectado: boolean; alCambiar: () => void }) {
  const [asunto, setAsunto] = useState(m.asunto);
  const [cuerpo, setCuerpo] = useState(m.cuerpo);
  const [programar, setProgramar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const editado = asunto !== m.asunto || cuerpo !== m.cuerpo;
  const editable = m.estado === 'borrador';

  const hacer = async (fn: () => Promise<unknown>) => {
    setError(null);
    setOcupado(true);
    try {
      if (editado && editable) await crm.editar(m.id, asunto, cuerpo);
      await fn();
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className={`mensaje-crm mensaje-${m.estado}`}>
      <p className="mensaje-cabecera">
        <span className="etiqueta etiqueta-neutro">Envío {m.paso} de 5</span>
        <span className={`etiqueta etiqueta-${m.estado === 'programado' ? 'aviso' : m.estado === 'aprobado' ? 'exito' : 'neutro'}`}>{NOMBRE_MENSAJE[m.estado]}</span>
        {m.programadoPara && <span className="ayuda">Saldrá el {fechaHora(m.programadoPara)}</span>}
        <span className="ayuda">Para: {destinatario}</span>
      </p>
      {editable ? (
        <>
          <input className="mensaje-asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} aria-label="Asunto" />
          <textarea className="mensaje-cuerpo" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={Math.min(24, cuerpo.split('\n').length + 2)} aria-label="Texto" />
        </>
      ) : (
        <details>
          <summary>
            <strong>{m.asunto}</strong>
          </summary>
          <pre className="mensaje-texto">{m.cuerpo}</pre>
        </details>
      )}
      {error && <p className="error">{error}</p>}
      <p className="acciones">
        {m.estado === 'borrador' && (
          <>
            {editado && (
              <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(async () => undefined)}>
                Guardar cambios
              </button>
            )}
            <button type="button" className="boton" disabled={ocupado} onClick={() => void hacer(() => crm.aprobar(m.id))}>
              ✓ Dar el visto bueno
            </button>
            {envioConectado && (
              <span className="programar">
                <input type="datetime-local" value={programar} onChange={(e) => setProgramar(e.target.value)} aria-label="Programar envío" />
                <button type="button" className="accion" disabled={ocupado || !programar} onClick={() => void hacer(() => crm.aprobar(m.id, new Date(programar).toISOString()))}>
                  Aprobar y programar
                </button>
              </span>
            )}
            <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(() => crm.descartar(m.id))}>
              Descartar
            </button>
          </>
        )}
        {m.estado === 'aprobado' && (
          <>
            <a className="boton" href={enlaceCorreo(destinatario, m.asunto, m.cuerpo)}>
              ✉ Abrir en mi correo
            </a>
            <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(() => crm.enviado(m.id))}>
              Ya lo he enviado
            </button>
            <button type="button" className="accion" disabled={ocupado} onClick={() => void hacer(() => crm.cancelar(m.id))}>
              Volver a borrador
            </button>
          </>
        )}
        {m.estado === 'programado' && (
          <button type="button" className="boton-secundario" disabled={ocupado} onClick={() => void hacer(() => crm.cancelar(m.id))}>
            ✕ Cancelar el envío programado
          </button>
        )}
      </p>
      {m.estado === 'aprobado' && <p className="ayuda">Envíalo desde tu correo y pulsa «Ya lo he enviado»: desde ese momento cuentan los días hasta el siguiente.</p>}
    </div>
  );
}
