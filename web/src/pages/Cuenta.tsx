import { type FormEvent, useState } from 'react';
import { api, ErrorApi, type UsuarioCuenta } from '../api';
import { Suscribir } from '../components/Suscribir';
import type { Ruta } from '../ruta';
import { alEntrar, alSalir, recargarCuenta, useCuenta } from '../sincronizar';

const mensaje = (e: unknown) => (e instanceof ErrorApi ? e.errores.join(' ') : 'No se ha podido conectar. Inténtalo de nuevo.');

const TEXTO_AVISOS: Record<UsuarioCuenta['avisos'], string> = {
  diario: 'Cada día (solo si hay algo nuevo)',
  semanal: 'Una vez por semana',
  nunca: 'No enviarme emails',
};

/** Entrar, registrarse o restablecer la contraseña. */
function Acceso({ emails, restablecer }: { emails: boolean; restablecer: string | null }) {
  const [modo, setModo] = useState<'entrar' | 'registro' | 'olvido' | 'restablecer'>(restablecer ? 'restablecer' : 'entrar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (modo === 'olvido') {
        await api.cuentaEnviar('/olvido', { email });
        setAviso('Si hay una cuenta con ese email, te hemos enviado un enlace para cambiar la contraseña (mira también en spam).');
      } else if (modo === 'restablecer') {
        await api.cuentaEnviar('/restablecer', { token: restablecer, clave });
        window.location.hash = '#/cuenta';
        await alEntrar();
      } else {
        await api.cuentaEnviar(modo === 'entrar' ? '/entrar' : '/registro', { email, clave });
        await alEntrar();
      }
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="bloque acceso">
      {modo !== 'restablecer' && modo !== 'olvido' && (
        <div className="pestanas" role="tablist">
          <button type="button" role="tab" aria-selected={modo === 'entrar'} className={modo === 'entrar' ? 'activa' : ''} onClick={() => setModo('entrar')}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={modo === 'registro'} className={modo === 'registro' ? 'activa' : ''} onClick={() => setModo('registro')}>
            Crear cuenta
          </button>
        </div>
      )}
      {modo === 'registro' && (
        <p className="ayuda">Gratis. Tu lista de clientes, ayudas guardadas y perfil quedan en tu cuenta y los ves en el móvil y en el ordenador. Lo que ya tienes en este navegador se añade a la cuenta.</p>
      )}
      {modo === 'olvido' && <h3>Cambiar la contraseña</h3>}
      {modo === 'restablecer' && <h3>Elige una contraseña nueva</h3>}
      <form onSubmit={enviar} className="formulario">
        {modo !== 'restablecer' && (
          <label>
            Email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        {modo !== 'olvido' && (
          <label>
            {modo === 'restablecer' ? 'Contraseña nueva' : 'Contraseña'}
            <input
              type="password"
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              required
              minLength={modo === 'entrar' ? undefined : 8}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
            {modo !== 'entrar' && <span className="ayuda">Al menos 8 caracteres.</span>}
          </label>
        )}
        {error && <p className="error">{error}</p>}
        {aviso && <p className="llamada">{aviso}</p>}
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Un momento…' : { entrar: 'Entrar', registro: 'Crear cuenta', olvido: 'Enviarme el enlace', restablecer: 'Guardar y entrar' }[modo]}
        </button>
      </form>
      {modo === 'entrar' &&
        (emails ? (
          <button type="button" className="enlace-boton" onClick={() => setModo('olvido')}>
            He olvidado la contraseña
          </button>
        ) : (
          <p className="ayuda">¿Has olvidado la contraseña? De momento no se pueden enviar emails: pide que te la cambien.</p>
        ))}
      {(modo === 'olvido' || modo === 'restablecer') && (
        <button type="button" className="enlace-boton" onClick={() => setModo('entrar')}>
          Volver a entrar
        </button>
      )}
    </section>
  );
}

function MiCuenta({ u, emails, estado }: { u: UsuarioCuenta; emails: boolean; estado: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const accion = (fn: () => Promise<unknown>, ok?: string) => async () => {
    setError(null);
    setAviso(null);
    try {
      await fn();
      if (ok) setAviso(ok);
      await recargarCuenta();
    } catch (e) {
      setError(mensaje(e));
    }
  };
  const [claves, setClaves] = useState({ actual: '', nueva: '', borrar: '' });

  return (
    <>
      <section className="bloque">
        <h3>Mi cuenta</h3>
        <p>
          <strong>{u.email}</strong>
        </p>
        <p className="ayuda">
          {estado === 'subiendo' ? 'Guardando cambios…' : estado === 'error' ? 'No se ha podido sincronizar: se reintentará al volver a la web.' : 'Tu lista y tu perfil están guardados en la cuenta y se sincronizan con tus otros dispositivos.'}
        </p>
        {error && <p className="error">{error}</p>}
        {aviso && <p className="llamada">{aviso}</p>}
        <p className="acciones">
          <button type="button" className="accion" onClick={accion(() => api.cuentaEnviar('/salir', {}).then(alSalir))}>
            Cerrar sesión
          </button>
        </p>
      </section>

      <section className="bloque">
        <h3>Avisos por email</h3>
        <p className="ayuda">Un resumen con los plazos de tus ayudas guardadas, las ayudas nuevas que te sirven, lo que han contratado tus clientes y a quién te toca llamar.</p>
        <select
          value={u.avisos}
          onChange={(e) => void accion(() => api.cuentaEnviar('/ajustes', { avisos: e.target.value }, 'PUT'), 'Guardado.')()}
          aria-label="Frecuencia de los avisos"
        >
          {(Object.keys(TEXTO_AVISOS) as UsuarioCuenta['avisos'][]).map((f) => (
            <option key={f} value={f}>
              {TEXTO_AVISOS[f]}
            </option>
          ))}
        </select>
        {!emails && <p className="ayuda">Los emails todavía no están activados en la web: se empezarán a enviar en cuanto lo estén.</p>}
      </section>

      <section className="bloque">
        <h3>Calendario de Mi lista</h3>
        <p className="ayuda">Plazos de tus ayudas guardadas y llamadas a tus clientes, siempre al día: lo que cambies en Mi lista aparece solo en tu calendario.</p>
        <Suscribir ruta={`/api/mi-calendario.ics?token=${encodeURIComponent(u.tokenCalendario)}`} nota="El enlace es personal: no lo compartas." />
        <button type="button" className="enlace-boton" onClick={accion(() => api.cuentaEnviar('/calendario', {}), 'Enlace cambiado: el anterior ya no funciona. Vuelve a suscribirte con el nuevo.')}>
          Cambiar el enlace (si lo has compartido sin querer)
        </button>
      </section>

      <details className="bloque">
        <summary>Cambiar la contraseña</summary>
        <div className="formulario">
          <label>
            Contraseña actual
            <input type="password" autoComplete="current-password" value={claves.actual} onChange={(e) => setClaves((c) => ({ ...c, actual: e.target.value }))} />
          </label>
          <label>
            Contraseña nueva
            <input type="password" autoComplete="new-password" minLength={8} value={claves.nueva} onChange={(e) => setClaves((c) => ({ ...c, nueva: e.target.value }))} />
          </label>
          <button type="button" className="boton" onClick={accion(() => api.cuentaEnviar('/clave', { actual: claves.actual, nueva: claves.nueva }), 'Contraseña cambiada. Se ha cerrado la sesión en tus otros dispositivos.')}>
            Cambiar
          </button>
        </div>
      </details>

      <details className="bloque">
        <summary>Borrar mi cuenta</summary>
        <p className="ayuda">Se borran tu cuenta, tu lista y tu perfil del servidor. Lo que hay en este navegador se queda.</p>
        <div className="formulario">
          <label>
            Contraseña
            <input type="password" autoComplete="current-password" value={claves.borrar} onChange={(e) => setClaves((c) => ({ ...c, borrar: e.target.value }))} />
          </label>
          <button
            type="button"
            className="boton-secundario"
            onClick={accion(async () => {
              if (!window.confirm('¿Seguro que quieres borrar tu cuenta? No se puede deshacer.')) return;
              await api.cuentaEnviar('', { clave: claves.borrar }, 'DELETE');
              await alSalir();
            })}
          >
            Borrar mi cuenta
          </button>
        </div>
      </details>
    </>
  );
}

export function Cuenta({ ruta }: { ruta: Ruta }) {
  const { cuenta, estado } = useCuenta();
  if (!cuenta) return <p className="ayuda">Cargando…</p>;
  if (!cuenta.activo) {
    return (
      <section className="bloque">
        <h3>Cuentas</h3>
        <p className="ayuda">Las cuentas todavía no están activadas. Mientras tanto tu lista se guarda en este navegador: puedes pasarla a otro con la copia de seguridad de Mi lista.</p>
      </section>
    );
  }
  return cuenta.usuario ? <MiCuenta u={cuenta.usuario} emails={cuenta.emails} estado={estado} /> : <Acceso emails={cuenta.emails} restablecer={ruta.params.get('restablecer')} />;
}
