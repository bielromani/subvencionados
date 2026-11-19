// Envío de un correo del seguimiento desde la propia web (Brevo o Resend): el de la tarea programada y el botón
// «Enviar ahora». El primer correo lleva el dossier de su línea en PDF; al salir cuenta como envío efectivo y desde
// ahí corren los días hasta el siguiente seguimiento.

import type { Enviar } from '../email.js';
import type { AlmacenCrm } from './almacen.js';
import { tituloCorreo } from './cartas.js';
import { correoHtml, textoPlano } from './correoHtml.js';
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

/** Lo que lleva el primer correo: el título de su línea y el dossier en PDF (si las producciones tienen dossier). */
async function extrasPrimerCorreo(crm: AlmacenCrm, usuario: string, mensaje: string, a: AjustesCrm, rutaFuentes?: string) {
  const x = await crm.paraDossier(usuario, mensaje).catch(() => null);
  if (!x || x.paso !== 1) return { titulo: null, adjuntos: null };
  const titulo = tituloCorreo(x.espectaculos, x.idioma, a);
  if (!rutaFuentes) return { titulo, adjuntos: null };
  try {
    const d = dossierDeCorreo(x.espectaculos, x.idioma, a);
    return { titulo, adjuntos: d ? [{ nombre: nombreArchivoDossier(d, a.organizacion), contenido: await pdfDossier(d, rutaFuentes) }] : null };
  } catch {
    // Sin dossier, la carta sale igual: es un complemento.
    return { titulo, adjuntos: null };
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
  const pie = opciones.completo ? PIE_BAJA : null;
  const { titulo, adjuntos } = await extrasPrimerCorreo(crm, usuario, m.id, a, opciones.rutaFuentes);
  const ok = await enviar({
    ...(adjuntos && { adjuntos }),
    para: m.destinatario,
    asunto: m.asunto,
    texto: pie ? `${textoPlano(m.cuerpo)}\n\n${pie}` : textoPlano(m.cuerpo),
    html: correoHtml(m.cuerpo, { cabecera: a.organizacion, titulo, pie }),
    de: { email: a.email, nombre: a.remitente || a.organizacion || a.email },
    responderA: a.email,
    ...(opciones.completo && { copiaOculta: a.email }),
  });
  if (!ok) return false;
  if (m.estado === 'borrador') await crm.aprobar(usuario, m.id);
  await crm.registrarEnvio(usuario, m.id);
  return true;
}
