// Email con el resumen de novedades: lo mismo que el bloque «Novedades» de la portada, en texto y en HTML sencillo
// (los gestores de correo no cargan estilos externos). Si no hay nada nuevo, no se envía.

import { escaparHtml } from './email.js';

interface ConvocatoriaBreve {
  id: string;
  titulo: string;
  tituloCorto?: string;
  organo: string;
  fechaFinSolicitud?: string | null;
}
interface ContratoBreve {
  id: string;
  titulo: string;
  organo: { nombre: string };
  finPlazo?: string | null;
  adjudicaciones: { adjudicatario: string | null; importe: number | null; personaFisica: boolean }[];
}
export interface Novedades {
  desde: string;
  ayudas: { total: number; items: { convocatoria: ConvocatoriaBreve }[] };
  licitaciones: { total: number; items: ContratoBreve[] };
  adjudicados: { total: number; items: ContratoBreve[] };
  guardadas: { motivo: 'abre' | 'cierra'; cierre: string | null; convocatoria: ConvocatoriaBreve }[];
}

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const titulo = (c: ConvocatoriaBreve) => c.tituloCorto ?? c.titulo;

interface Linea {
  texto: string;
  detalle: string;
  url: string;
}

export function emailAviso(
  n: Novedades,
  llamadasHoy: number,
  base: string,
  alertasCrm: { titulo: string; entidad: string; url: string }[] = [],
): { asunto: string; html: string; texto: string } | null {
  const secciones: { titulo: string; lineas: Linea[]; mas?: { texto: string; url: string } }[] = [];
  if (alertasCrm.length) {
    secciones.push({
      titulo: `Convocatorias nuevas para tus oportunidades abiertas (${alertasCrm.length})`,
      lineas: alertasCrm.map((a) => ({ texto: a.titulo, detalle: `Para ${a.entidad} · encaje potencial, requisitos por verificar`, url: a.url })),
    });
  }
  const conv = (id: string) => `${base}/#/convocatoria/${encodeURIComponent(id)}`;
  const contrato = (id: string) => `${base}/#/contrato/${encodeURIComponent(id)}`;
  if (n.guardadas.length) {
    secciones.push({
      titulo: 'De tus ayudas guardadas',
      lineas: n.guardadas.map((g) => ({
        texto: titulo(g.convocatoria),
        detalle: g.motivo === 'cierra' && g.cierre ? `Cierra el ${fecha(g.cierre)}` : 'Ha abierto el plazo',
        url: conv(g.convocatoria.id),
      })),
    });
  }
  if (n.ayudas.total) {
    secciones.push({
      titulo: `Ayudas nuevas que te sirven (${n.ayudas.total})`,
      lineas: n.ayudas.items.map((m) => ({ texto: titulo(m.convocatoria), detalle: m.convocatoria.organo, url: conv(m.convocatoria.id) })),
      ...(n.ayudas.total > n.ayudas.items.length && { mas: { texto: `Ver las ${n.ayudas.total}`, url: `${base}/#/explorar?desde=${n.desde}` } }),
    });
  }
  if (n.adjudicados.total) {
    secciones.push({
      titulo: `Lo que han contratado tus clientes (${n.adjudicados.total})`,
      lineas: n.adjudicados.items.map((c) => {
        const a = c.adjudicaciones[0];
        const quien = a ? (a.personaFisica ? 'una persona física' : (a.adjudicatario ?? 'sin nombre')) : '';
        return { texto: c.titulo, detalle: `${c.organo.nombre}${a ? ` · ${quien}${a.importe != null ? ` por ${euros.format(a.importe)}` : ''}` : ''}`, url: contrato(c.id) };
      }),
    });
  }
  if (n.licitaciones.total) {
    secciones.push({
      titulo: `Licitaciones de conciertos con plazo abierto (${n.licitaciones.total})`,
      lineas: n.licitaciones.items.map((c) => ({ texto: c.titulo, detalle: `${c.organo.nombre}${c.finPlazo ? ` · hasta el ${fecha(c.finPlazo.slice(0, 10))}` : ''}`, url: contrato(c.id) })),
      mas: { texto: 'Ver todas', url: `${base}/#/contratos?estado=abiertas` },
    });
  }
  if (!secciones.length && !llamadasHoy) return null;

  const partes: string[] = [];
  if (alertasCrm.length) partes.push(`${alertasCrm.length} ${alertasCrm.length === 1 ? 'convocatoria nueva' : 'convocatorias nuevas'} para tus oportunidades`);
  if (llamadasHoy) partes.push(`${llamadasHoy} ${llamadasHoy === 1 ? 'cliente para contactar' : 'clientes para contactar'}`);
  if (n.guardadas.some((g) => g.motivo === 'cierra')) partes.push('plazos que cierran');
  if (n.ayudas.total) partes.push(`${n.ayudas.total} ${n.ayudas.total === 1 ? 'ayuda nueva' : 'ayudas nuevas'}`);
  if (n.adjudicados.total) partes.push(`${n.adjudicados.total} ${n.adjudicados.total === 1 ? 'concierto contratado' : 'conciertos contratados'} por tus clientes`);
  if (n.licitaciones.total) partes.push(`${n.licitaciones.total} ${n.licitaciones.total === 1 ? 'licitación' : 'licitaciones'}`);
  const asunto = `Subvencionados: ${partes.join(', ')}`;

  const pie = `Recibes este email porque tienes cuenta en Subvencionados. Puedes cambiar la frecuencia o dejar de recibirlo en ${base}/#/cuenta`;
  const texto = [
    `Novedades desde el ${fecha(n.desde)}`,
    ...(llamadasHoy ? [`\nHoy te toca contactar a ${llamadasHoy} ${llamadasHoy === 1 ? 'cliente' : 'clientes'} de tu lista: ${base}/#/guardadas`] : []),
    ...secciones.flatMap((s) => [`\n${s.titulo.toUpperCase()}`, ...s.lineas.map((l) => `- ${l.texto}\n  ${l.detalle}\n  ${l.url}`), ...(s.mas ? [`${s.mas.texto}: ${s.mas.url}`] : [])]),
    `\n--\n${pie}`,
  ].join('\n');

  const e = escaparHtml;
  const html = `<!doctype html><html lang="es"><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1d1b18;max-width:640px;margin:0 auto;padding:16px">
<h2 style="margin:0 0 4px">Novedades desde el ${e(fecha(n.desde))}</h2>
${llamadasHoy ? `<p style="background:#f4ecee;padding:10px 12px;border-radius:8px">Hoy te toca contactar a ${llamadasHoy} ${llamadasHoy === 1 ? 'cliente' : 'clientes'} de tu lista. <a href="${e(`${base}/#/guardadas`)}" style="color:#7a2e3b">Ver Mi lista</a></p>` : ''}
${secciones
  .map(
    (s) => `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#5f5a52;margin:24px 0 8px">${e(s.titulo)}</h3>
${s.lineas.map((l) => `<p style="margin:0 0 12px"><a href="${e(l.url)}" style="color:#7a2e3b;font-weight:600">${e(l.texto)}</a><br><span style="color:#5f5a52;font-size:14px">${e(l.detalle)}</span></p>`).join('\n')}
${s.mas ? `<p><a href="${e(s.mas.url)}" style="color:#7a2e3b">${e(s.mas.texto)} →</a></p>` : ''}`,
  )
  .join('\n')}
<p style="color:#5f5a52;font-size:12px;margin-top:32px;border-top:1px solid #e4dfd6;padding-top:12px">${e(pie.replace(/ en https?:\S+$/, ''))}: <a href="${e(`${base}/#/cuenta`)}" style="color:#5f5a52">ajustes de tu cuenta</a>.</p>
</body></html>`;
  return { asunto, html, texto };
}
