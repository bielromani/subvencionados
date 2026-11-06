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
function Acceso({ emails, restablecer, privado }: { emails: boolean; restablecer: string | null; privado: boolean }) {
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
    <div className="acceso-pagina">
    <section className="acceso">
      <div className="acceso-marca">
        <span className="marca-logo">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
          </svg>
        </span>
        <h1>{{ entrar: 'Entra en tu cuenta', registro: 'Crea tu cuenta', olvido: 'Cambiar la contraseña', restablecer: 'Elige una contraseña nueva' }[modo]}</h1>
      </div>
      {modo !== 'restablecer' && modo !== 'olvido' && (
        <div className="segmentado" role="tablist">
          <button type="button" role="tab" aria-selected={modo === 'entrar'} className={modo === 'entrar' ? 'activa' : ''} onClick={() => setModo('entrar')}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={modo === 'registro'} className={modo === 'registro' ? 'activa' : ''} onClick={() => setModo('registro')}>
            Crear cuenta
          </button>
        </div>
      )}
      {privado && modo === 'entrar' && <p className="ayuda">Esta web es privada. La sesión queda abierta en este dispositivo: no tendrás que volver a entrar.</p>}
      {modo === 'registro' && (
        <p className="ayuda">
          {privado ? 'Solo pueden crear cuenta las personas autorizadas: usa el email con el que te han dado acceso.' : 'Lo que ya tienes en este navegador (lista y perfil) se añade a la cuenta.'}
        </p>
      )}
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
        <button type="submit" className="boton boton-ancho" disabled={enviando}>
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
    <aside className="acceso-ventajas" aria-label="Qué incluye la cuenta">
      <h2>Con tu cuenta</h2>
      <ul>
        <li>
          <strong>Correos ya escritos</strong> para cada sitio donde encaja tu catálogo, con tu voz y tu firma.
        </li>
        <li>
          <strong>Seguimiento</strong> de cada contacto: cuándo escribir de nuevo y cuándo llamar.
        </li>
        <li>
          <strong>Avisos</strong> de ayudas y licitaciones nuevas que te sirven.
        </li>
        <li>
          <strong>Tu lista y tu perfil</strong> en el móvil y en el ordenador.
        </li>
      </ul>
      <p className="ayuda">Gratis. Nada se envía nunca sin tu visto bueno.</p>
    </aside>
    </div>
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
    <div className="ajustes">
      <header className="cabecera-pagina">
        <h1>Mi cuenta</h1>
        <p>
          {estado === 'subiendo' ? 'Guardando cambios…' : estado === 'error' ? 'No se ha podido sincronizar: se reintentará al volver a la web.' : 'Tu lista, tu perfil y tu trabajo se guardan en la cuenta y se ven en todos tus dispositivos.'}
        </p>
      </header>
      {error && <p className="error">{error}</p>}
      {aviso && (
        <p className="llamada" role="status">
          {aviso}
        </p>
      )}

      <section className="grupo-ajustes" aria-labelledby="a-cuenta">
        <h2 id="a-cuenta">Cuenta</h2>
        <div className="fila-ajuste">
          <div>
            <strong>Email</strong>
            <span>{u.email}</span>
          </div>
          <button type="button" className="accion" onClick={accion(() => api.cuentaEnviar('/salir', {}).then(alSalir))}>
            Cerrar sesión
          </button>
        </div>
        <div className="fila-ajuste">
          <div>
            <strong>Mi perfil</strong>
            <span>Tus grupos, estilos y dónde trabajas: filtran la portada, Clientes y las ayudas.</span>
          </div>
          <a className="accion" href="#/perfil">
            Editar perfil
          </a>
        </div>
        <div className="fila-ajuste">
          <div>
            <strong>Catálogo, cartas y firma</strong>
            <span>Tus producciones, las plantillas de los correos y quién firma.</span>
          </div>
          <span className="botones-fila">
            <a className="accion" href="#/catalogo">
              Catálogo
            </a>
            <a className="accion" href="#/cartas">
              Cartas y firma
            </a>
          </span>
        </div>
      </section>

      <section className="grupo-ajustes" aria-labelledby="a-avisos">
        <h2 id="a-avisos">Avisos</h2>
        <div className="fila-ajuste">
          <div>
            <strong>Resumen por email</strong>
            <span>Plazos de tus ayudas guardadas, ayudas nuevas que te sirven, lo que han contratado tus clientes y a quién llamar.{!emails && ' Los emails aún no están activados: empezarán a llegar en cuanto lo estén.'}</span>
          </div>
          <select value={u.avisos} onChange={(e) => void accion(() => api.cuentaEnviar('/ajustes', { avisos: e.target.value }, 'PUT'), 'Guardado.')()} aria-label="Frecuencia de los avisos">
            {(Object.keys(TEXTO_AVISOS) as UsuarioCuenta['avisos'][]).map((f) => (
              <option key={f} value={f}>
                {TEXTO_AVISOS[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="fila-ajuste fila-ajuste-ancha">
          <div>
            <strong>Calendario de Mi lista</strong>
            <span>Plazos de tus ayudas guardadas y llamadas a tus clientes en tu calendario, siempre al día. El enlace es personal.</span>
          </div>
          <div className="ajuste-control">
            <Suscribir ruta={`/api/mi-calendario.ics?token=${encodeURIComponent(u.tokenCalendario)}`} nota="" />
            <button type="button" className="enlace-boton" onClick={accion(() => api.cuentaEnviar('/calendario', {}), 'Enlace cambiado: el anterior ya no funciona. Vuelve a suscribirte con el nuevo.')}>
              Cambiar el enlace
            </button>
          </div>
        </div>
      </section>

      <section className="grupo-ajustes" aria-labelledby="a-seguridad">
        <h2 id="a-seguridad">Seguridad</h2>
        <div className="fila-ajuste fila-ajuste-ancha">
          <div>
            <strong>Contraseña</strong>
            <span>Al cambiarla se cierra la sesión en tus otros dispositivos.</span>
          </div>
          <div className="ajuste-control campos-en-linea">
            <input type="password" autoComplete="current-password" placeholder="Contraseña actual" aria-label="Contraseña actual" value={claves.actual} onChange={(e) => setClaves((c) => ({ ...c, actual: e.target.value }))} />
            <input type="password" autoComplete="new-password" placeholder="Nueva (mín. 8)" aria-label="Contraseña nueva" minLength={8} value={claves.nueva} onChange={(e) => setClaves((c) => ({ ...c, nueva: e.target.value }))} />
            <button type="button" className="accion" disabled={!claves.actual || claves.nueva.length < 8} onClick={accion(() => api.cuentaEnviar('/clave', { actual: claves.actual, nueva: claves.nueva }), 'Contraseña cambiada. Se ha cerrado la sesión en tus otros dispositivos.')}>
              Cambiar
            </button>
          </div>
        </div>
      </section>

      <section className="grupo-ajustes zona-peligro" aria-labelledby="a-borrar">
        <h2 id="a-borrar">Borrar la cuenta</h2>
        <div className="fila-ajuste fila-ajuste-ancha">
          <div>
            <strong>Borrar mi cuenta</strong>
            <span>Se borran del servidor tu cuenta, tu lista, tu perfil, tu catálogo y tu seguimiento. No se puede deshacer.</span>
          </div>
          <div className="ajuste-control campos-en-linea">
            <input type="password" autoComplete="current-password" placeholder="Tu contraseña" aria-label="Contraseña para borrar la cuenta" value={claves.borrar} onChange={(e) => setClaves((c) => ({ ...c, borrar: e.target.value }))} />
            <button
              type="button"
              className="accion boton-peligro"
              disabled={!claves.borrar}
              onClick={accion(async () => {
                if (!window.confirm('¿Seguro que quieres borrar tu cuenta? No se puede deshacer.')) return;
                await api.cuentaEnviar('', { clave: claves.borrar }, 'DELETE');
                await alSalir();
              })}
            >
              Borrar mi cuenta
            </button>
          </div>
        </div>
      </section>
    </div>
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
  return cuenta.usuario ? <MiCuenta u={cuenta.usuario} emails={cuenta.emails} estado={estado} /> : <Acceso emails={cuenta.emails} restablecer={ruta.params.get('restablecer')} privado={!!cuenta.privado} />;
}
