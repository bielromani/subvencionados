// Envío de un correo del seguimiento desde la propia web (Brevo o Resend): el de la tarea programada y el botón
// «Enviar ahora». El primer correo lleva el dossier de su línea en PDF; al salir cuenta como envío efectivo y desde
// ahí corren los días hasta el siguiente seguimiento.

import { escaparHtml, type Enviar } from '../email.js';
import type { AlmacenCrm } from './almacen.js';
import { dossierDeCorreo, nombreArchivoDossier, pdfDossier } from './dossier.js';
import type { AjustesCrm } from './tipos.js';

export const PIE_BAJA = 'Si no desea recibir más correos nuestros, responda a este mensaje indicándolo y no volveremos a escribirle.';

/** Hora, minuto y si es día laborable en Madrid. */
export function horaMadrid(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { hora: Number(p.hour), minuto: Number(p.minute), laborable: !['Sat', 'Sun'].includes(p.weekday!) };
}

/** Comienzo del día de hoy en Madrid (para contar los envíos del día). */
export function inicioDiaMadrid(ahora = new Date()): Date {
  const h = horaMadrid(ahora);
  return new Date(ahora.getTime() - (h.hora * 3600 + h.minuto * 60) * 1000 - ahora.getUTCSeconds() * 1000);
}

async function adjuntoDossier(crm: AlmacenCrm, usuario: string, mensaje: string, a: AjustesCrm, rutaFuentes?: string) {
  if (!rutaFuentes) return null;
  try {
    const x = await crm.paraDossier(usuario, mensaje);
    if (!x || x.paso !== 1) return null;
    const d = dossierDeCorreo(x.espectaculos, x.idioma, a);
    if (!d) return null;
    return [{ nombre: nombreArchivoDossier(d, a.organizacion), contenido: await pdfDossier(d, rutaFuentes) }];
  } catch {
    // Sin dossier, la carta sale igual: es un complemento.
    return null;
  }
}

/**
 * Envía un correo y lo registra como enviado. Con `completo` (envío automático y «Enviar ahora») lleva la frase para
 * darse de baja y copia oculta al buzón del remitente, para que quede constancia en su correo.
 */
export async function enviarMensaje(
  crm: AlmacenCrm,
  enviar: Enviar,
  usuario: string,
  m: { id: string; asunto: string; cuerpo: string; destinatario: string; estado: string },
  a: AjustesCrm,
  opciones: { completo: boolean; rutaFuentes?: string },
): Promise<boolean> {
  if (!a.email) return false;
  const cuerpo = opciones.completo ? `${m.cuerpo}\n\n${PIE_BAJA}` : m.cuerpo;
  const adjuntos = await adjuntoDossier(crm, usuario, m.id, a, opciones.rutaFuentes);
  const ok = await enviar({
    ...(adjuntos && { adjuntos }),
    para: m.destinatario,
    asunto: m.asunto,
    texto: cuerpo,
    html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escaparHtml(cuerpo)}</div>`,
    de: { email: a.email, nombre: a.remitente || a.organizacion || a.email },
    responderA: a.email,
    ...(opciones.completo && { copiaOculta: a.email }),
  });
  if (!ok) return false;
  if (m.estado === 'borrador') await crm.aprobar(usuario, m.id);
  await crm.registrarEnvio(usuario, m.id);
  return true;
}
