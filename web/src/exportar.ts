// Descargas generadas en el navegador (sin pasar por el servidor): CSV para Excel, calendario y copia de Mi lista.

export function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV que Excel abre bien en español: separador «;» y BOM para los acentos. */
export function csv(cabecera: string[], filas: (string | number | null | undefined)[][]): string {
  const celda = (v: string | number | null | undefined) => {
    const t = v == null ? '' : String(v);
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return `﻿${[cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\r\n')}\r\n`;
}

export interface EventoDia {
  uid: string;
  fecha: string;
  titulo: string;
  descripcion?: string;
  url?: string;
}

const escapar = (t: string) => t.replace(/[\;,]/g, (x) => `\\${x}`).replace(/\r?\n/g, '\\n');

/** iCal con eventos de día completo (lo abren Google Calendar, Outlook y el calendario del móvil). */
export function ics(nombre: string, eventos: EventoDia[]): string {
  const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Subvencionados//Mi lista//ES', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapar(nombre)}`];
  for (const e of eventos) {
    const d = new Date(`${e.fecha}T00:00:00Z`);
    const fin = new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10).replace(/-/g, '');
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@subvencionados`,
      `DTSTAMP:${sello}`,
      `DTSTART;VALUE=DATE:${e.fecha.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${fin}`,
      `SUMMARY:${escapar(e.titulo)}`,
      ...(e.descripcion ? [`DESCRIPTION:${escapar(e.descripcion)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      'END:VEVENT',
    );
  }
  lineas.push('END:VCALENDAR');
  return `${lineas.join('\r\n')}\r\n`;
}
