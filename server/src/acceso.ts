// Web privada: solo con sesión, y solo para las personas autorizadas.
// EMAILS_PERMITIDOS (Vercel) = los emails que pueden crear cuenta y entrar, separados por comas. Sin la variable,
// no se pueden crear cuentas nuevas y las que ya existen siguen entrando.

export function emailsPermitidos(env = process.env): Set<string> | null {
  const lista = (env.EMAILS_PERMITIDOS ?? '')
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
  return lista.length ? new Set(lista) : null;
}

/** Puede crear una cuenta: solo si su email está en la lista. */
export const puedeRegistrarse = (email: string, permitidos = emailsPermitidos()) => !!permitidos?.has(email.toLowerCase());

/** Puede entrar: con lista, solo quien está en ella (quitarlo de la lista le retira el acceso); sin lista, toda cuenta. */
export const puedeEntrar = (email: string, permitidos = emailsPermitidos()) => !permitidos || permitidos.has(email.toLowerCase());
