// Envío de emails (avisos y restablecer contraseña) con el servicio que esté configurado en Vercel:
// - Brevo (BREVO_API_KEY): gratis hasta 300 al día; basta con verificar el email remitente, sin dominio propio.
// - Resend (RESEND_API_KEY): gratis hasta 3.000 al mes; sin dominio propio solo envía al email de la cuenta.
// El remitente va en AVISOS_REMITENTE. Sin ninguna clave, no se envía nada y la web lo dice.

export interface Email {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  /** Remitente propio (cartas del CRM): debe estar verificado en el servicio de envío. Sin él, AVISOS_REMITENTE. */
  de?: { email: string; nombre: string };
  /** Las respuestas van a esta dirección. */
  responderA?: string;
  /** Copia oculta (el remitente guarda constancia en su buzón). */
  copiaOculta?: string;
}

export type Enviar = (e: Email) => Promise<boolean>;

export function enviadorDesdeEntorno(env = process.env): Enviar | null {
  const remitente = env.AVISOS_REMITENTE;
  if (!remitente) return null;
  if (env.BREVO_API_KEY) {
    const clave = env.BREVO_API_KEY;
    return async (e) => {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': clave, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: e.de ? { email: e.de.email, name: e.de.nombre } : { email: remitente, name: 'Subvencionados' },
          to: [{ email: e.para }],
          ...(e.copiaOculta && { bcc: [{ email: e.copiaOculta }] }),
          ...(e.responderA && { replyTo: { email: e.responderA } }),
          subject: e.asunto,
          htmlContent: e.html,
          textContent: e.texto,
        }),
      });
      return r.ok;
    };
  }
  if (env.RESEND_API_KEY) {
    const clave = env.RESEND_API_KEY;
    return async (e) => {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: e.de ? `${e.de.nombre} <${e.de.email}>` : `Subvencionados <${remitente}>`,
          to: [e.para],
          ...(e.copiaOculta && { bcc: [e.copiaOculta] }),
          ...(e.responderA && { reply_to: e.responderA }),
          subject: e.asunto,
          html: e.html,
          text: e.texto,
        }),
      });
      return r.ok;
    };
  }
  return null;
}

export const escaparHtml = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
