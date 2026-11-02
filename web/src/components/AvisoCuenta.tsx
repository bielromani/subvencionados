import { useCuenta } from '../sincronizar';

/** Enlace a la cuenta: quién ha entrado, o la invitación a crearla (solo si las cuentas están activadas). */
export function AvisoCuenta() {
  const { cuenta, estado } = useCuenta();
  if (!cuenta?.activo) return null;
  if (cuenta.usuario) {
    return (
      <p className="aviso-cuenta">
        {estado === 'error' ? '⚠ Sin sincronizar' : '✓ Guardado en tu cuenta'} · {cuenta.usuario.email} · <a href="#/cuenta">Mi cuenta</a>
      </p>
    );
  }
  return (
    <p className="llamada">
      Tu lista solo está en este navegador. <a href="#/cuenta">Crea una cuenta gratis o entra</a> para tenerla en el móvil y el ordenador y recibir avisos por email.
    </p>
  );
}
