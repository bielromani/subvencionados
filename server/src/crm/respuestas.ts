// Respuestas en el buzón del remitente (IMAP): si escribe alguien a quien se le está haciendo el seguimiento, se
// anota «ha respondido» y se paran sus seguimientos. Solo se lee: no se marca, mueve ni borra ningún correo.
// Configuración en Vercel: IMAP_HOST, IMAP_USUARIO (el email de la cuenta), IMAP_CLAVE (contraseña de aplicación)
// y opcionalmente IMAP_PUERTO (993).
import { ImapFlow } from 'imapflow';

export interface CorreoRecibido {
  de: string;
  asunto: string;
  fecha: Date;
  /** Primeros caracteres del mensaje (para ver si pide la baja). */
  texto: string;
  /** Respuesta automática (fuera de la oficina, vacaciones...): no cuenta como respuesta. */
  automatica: boolean;
}

export interface SeguimientoActivo {
  entidad: string;
  destinatario: string;
  /** Primer envío efectivo: lo recibido antes no es una respuesta a esta secuencia. */
  desde: Date;
}

export interface RespuestaDetectada {
  entidad: string;
  tipo: 'respuesta' | 'optout';
  texto: string;
}

/** Proveedores de correo gratuito: con ellos solo vale la dirección exacta, no el dominio. */
const GRATUITOS = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|aol|gmx|protonmail|proton|telefonica|movistar|orange|terra)\./;
const AUTOMATICA = /fuera de (la )?oficina|out of (the )?office|respuesta autom|automatic reply|auto.?reply|autorespuesta|resposta autom|absent|vacaciones|vacances|no estar[eé] disponible/i;
const BAJA = /no (deseo|deseamos|queremos|quiero) recibir|darnos de baja|dar de baja|darme de baja|no (nos|me) (escriban|env[ií]en)|elimin(en|ad|ar) (nuestro|mi) (correo|email|direcci)|no (ens|em) (envieu|escriviu)|(donar|doneu|donin)[- ]?(nos|me|ns) de baixa|no (volem|vull) rebre|no volv(ais|áis|an) a escribir/i;

const dominio = (email: string) => email.split('@')[1]?.toLowerCase() ?? '';

/** Empareja lo recibido con los seguimientos activos: dirección exacta o, si no es un correo gratuito, el mismo dominio. */
export function detectarRespuestas(recibidos: CorreoRecibido[], activos: SeguimientoActivo[]): RespuestaDetectada[] {
  const porEntidad = new Map<string, RespuestaDetectada>();
  for (const c of recibidos) {
    if (c.automatica || AUTOMATICA.test(c.asunto)) continue;
    const de = c.de.toLowerCase();
    if (/^(mailer-daemon|postmaster|no-?reply|noreply)@/.test(de)) continue;
    for (const s of activos) {
      if (c.fecha < s.desde || porEntidad.get(s.entidad)?.tipo === 'optout') continue;
      const d = s.destinatario.toLowerCase();
      const igual = de === d || (!GRATUITOS.test(dominio(d)) && dominio(d) !== '' && dominio(de) === dominio(d));
      if (!igual) continue;
      const baja = BAJA.test(`${c.asunto}\n${c.texto}`);
      const cuando = c.fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
      porEntidad.set(s.entidad, {
        entidad: s.entidad,
        tipo: baja ? 'optout' : 'respuesta',
        texto: baja ? `Pide no recibir más correos (respuesta de ${c.de} del ${cuando}: «${c.asunto}»)` : `Ha respondido ${c.de} el ${cuando}: «${c.asunto}» (detectado en tu buzón)`,
      });
    }
  }
  return [...porEntidad.values()];
}

export interface ConfigImap {
  host: string;
  puerto: number;
  usuario: string;
  clave: string;
}

export function configImapDesdeEntorno(env = process.env): ConfigImap | null {
  if (!env.IMAP_HOST || !env.IMAP_USUARIO || !env.IMAP_CLAVE) return null;
  return { host: env.IMAP_HOST, puerto: Number(env.IMAP_PUERTO) || 993, usuario: env.IMAP_USUARIO, clave: env.IMAP_CLAVE };
}

/** Lee (sin marcar como leído) lo recibido en la bandeja de entrada desde una fecha. */
export async function leerBuzon(c: ConfigImap, desde: Date, maximo = 300): Promise<CorreoRecibido[]> {
  const cliente = new ImapFlow({ host: c.host, port: c.puerto, secure: c.puerto === 993, auth: { user: c.usuario, pass: c.clave }, logger: false });
  await cliente.connect();
  const fuera: CorreoRecibido[] = [];
  try {
    await cliente.mailboxOpen('INBOX', { readOnly: true });
    {
      const uids = ((await cliente.search({ since: desde }, { uid: true })) || []).slice(-maximo);
      if (uids.length) {
        for await (const m of cliente.fetch(uids, { envelope: true, internalDate: true, headers: ['auto-submitted', 'x-autoreply', 'x-autorespond', 'precedence'], bodyParts: ['TEXT'] }, { uid: true })) {
          const de = m.envelope?.from?.[0]?.address;
          if (!de) continue;
          const cab = m.headers?.toString('utf8').toLowerCase() ?? '';
          const texto = m.bodyParts?.get('text')?.toString('utf8').slice(0, 4000) ?? '';
          fuera.push({
            de,
            asunto: m.envelope?.subject ?? '',
            fecha: new Date(m.internalDate ?? m.envelope?.date ?? Date.now()),
            texto,
            automatica: /auto-submitted:\s*auto-(replied|generated)|x-autoreply|x-autorespond|precedence:\s*(auto_reply|bulk|junk)/.test(cab),
          });
        }
      }
    }
  } finally {
    await cliente.logout().catch(() => undefined);
  }
  return fuera;
}
