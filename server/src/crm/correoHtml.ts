// El correo en HTML: el mismo texto de la carta, maquetado para leerse bien. El texto plano se escribe en las
// plantillas y aquí se convierte:
// - Un párrafo cuyas líneas empiezan por «• » es una lista; lo que va antes del primer « · » sale en negrita (el
//   nombre de la producción). Las líneas que empiezan por «– » debajo de una viñeta son subapartados.
// - Un párrafo que empieza en MAYÚSCULAS («TE INVITO A VERNOS EN ESCENA. …») sale destacado en un recuadro.
// - «## Título» es un título; **texto** va en negrita.
// - El último párrafo con varias líneas, tras la despedida, es la firma.
// Estilos en línea y tablas: es lo que respetan Gmail, Outlook y Apple Mail.

const TINTA = '#1d2433';
const TEXTO = '#2b2f36';
const SUAVE = '#6b7280';
const ACENTO = '#8c2f39';
const DORADO = '#b08d57';
const FONDO = '#f5f1ea';
const LETRA = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const TITULOS = "Georgia,'Times New Roman',serif";

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Negritas y enlaces dentro de un texto ya escapado. */
function enLinea(t: string): string {
  return escapar(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<)]+[^\s<).,;:])/g, `<a href="$1" style="color:${ACENTO};text-decoration:underline">$1</a>`)
    .replace(/(^|[\s(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, `$1<a href="mailto:$2" style="color:${ACENTO};text-decoration:none">$2</a>`);
}

const VINETA = /^\s*[•·]\s+/;
const SUB = /^\s*[–-]\s+/;
// Tres o más palabras seguidas en mayúsculas al empezar («TE INVITO A CONOCERNOS…»); no un nombre como «THE CROSSROADS».
const MAYUSCULAS = /^((?:[A-ZÁÉÍÓÚÑÇÀÈÒÏÜ’'-]+[ ,]+){2,}[A-ZÁÉÍÓÚÑÇÀÈÒÏÜ’'-]+[.:!]?)(?=\s|$)/;

const p = (html: string, estilo = '') => `<p style="margin:0 0 16px;font-family:${LETRA};font-size:15px;line-height:1.6;color:${TEXTO};${estilo}">${html}</p>`;

function lista(lineas: string[]): string {
  const items: { texto: string; subs: string[] }[] = [];
  for (const l of lineas) {
    if (SUB.test(l) && items.length) items.at(-1)!.subs.push(l.replace(SUB, ''));
    else items.push({ texto: l.replace(VINETA, ''), subs: [] });
  }
  const li = items
    .map(({ texto, subs }) => {
      const i = texto.indexOf(' · ');
      const cuerpo = i > 0 ? `<strong style="color:${TINTA}">${enLinea(texto.slice(0, i))}</strong> · ${enLinea(texto.slice(i + 3))}` : enLinea(texto);
      const sub = subs.length
        ? `<ul style="margin:8px 0 0;padding-left:18px">${subs.map((s) => `<li style="margin:0 0 6px;color:${TEXTO}">${enLinea(s)}</li>`).join('')}</ul>`
        : '';
      return `<li style="margin:0 0 12px;padding-left:4px;font-family:${LETRA};font-size:15px;line-height:1.6;color:${TEXTO}">${cuerpo}${sub}</li>`;
    })
    .join('');
  return `<ul style="margin:0 0 18px;padding-left:22px;color:${DORADO}">${li}</ul>`;
}

function destacado(bloque: string): string {
  const [, titular = ''] = bloque.match(MAYUSCULAS) ?? [];
  const bonito = titular.charAt(0) + titular.slice(1).toLowerCase();
  const [primera = '', ...otras] = bloque.slice(titular.length).split(/\n+/);
  // En las líneas siguientes, lo que va antes de « · » (el título de la función) en negrita.
  const conTitulo = (l: string) => {
    const i = l.indexOf(' · ');
    return i > 0 && i < 90 ? `<strong style="color:${TINTA}">${enLinea(l.slice(0, i))}</strong> · ${enLinea(l.slice(i + 3))}` : enLinea(l);
  };
  // Varias invitaciones juntas: cada una empieza por «• » (una raya separa una de otra); las líneas que siguen son suyas.
  const primeraVineta = otras.find((l) => VINETA.test(l));
  const cuerpo = (l: string, i: number) => {
    if (VINETA.test(l))
      return `<div style="font-family:${LETRA};font-size:15px;line-height:1.6;color:${TEXTO};${l === primeraVineta ? 'margin:12px 0 0' : 'margin:14px 0 0;padding-top:12px;border-top:1px solid #e4ddd0'}"><span style="color:${DORADO}">●</span>&nbsp; ${conTitulo(l.replace(VINETA, ''))}</div>`;
    return `<div style="font-family:${LETRA};font-size:15px;line-height:1.6;color:${TEXTO};margin:${i ? '10px' : '0'} 0 0">${i ? conTitulo(l) : l}</div>`;
  };
  const lineas = [`<strong style="font-family:${TITULOS};font-size:16.5px;color:${ACENTO}">${enLinea(bonito)}</strong>${enLinea(primera)}`, ...otras];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr><td style="background:${FONDO};border-left:3px solid ${DORADO};padding:16px 18px">
${lineas.map(cuerpo).join('')}</td></tr></table>`;
}

function firma(bloque: string): string {
  const [nombre = '', ...resto] = bloque.split('\n').filter((l) => l.trim());
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;border-top:1px solid #e4ddd0"><tr><td style="padding:14px 0 0">
<div style="font-family:${TITULOS};font-size:16px;font-weight:bold;color:${TINTA}">${enLinea(nombre)}</div>
${resto.map((l) => `<div style="font-family:${LETRA};font-size:13px;line-height:1.55;color:${SUAVE}">${enLinea(l)}</div>`).join('')}
</td></tr></table>`;
}

/** El texto sin las marcas de formato, para la versión en texto plano del correo. */
export function textoPlano(cuerpo: string): string {
  return cuerpo.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^##\s+/gm, '');
}

/** El correo en HTML. `cabecera`: el nombre de quien escribe, arriba; `pie`: una nota pequeña al final (la baja). */
export function correoHtml(cuerpo: string, opciones: { cabecera?: string; titulo?: string | null; pie?: string | null; idioma?: 'es' | 'ca' } = {}): string {
  const bloques = cuerpo
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+$/, ''))
    .filter((b) => b.trim());
  // La firma: el último bloque de varias líneas, si es el último del correo.
  const ultimo = bloques.at(-1) ?? '';
  const conFirma = bloques.length > 2 && ultimo.split('\n').length >= 2 && !VINETA.test(ultimo);
  const html = bloques.map((b, i) => {
    if (conFirma && i === bloques.length - 1) return firma(b);
    const lineas = b.split('\n');
    if (lineas.every((l) => VINETA.test(l) || SUB.test(l)) && VINETA.test(lineas[0]!)) return lista(lineas);
    if (/^##\s+/.test(b)) return `<h2 style="margin:8px 0 12px;font-family:${TITULOS};font-size:20px;line-height:1.3;color:${TINTA}">${enLinea(b.replace(/^##\s+/, ''))}</h2>`;
    if (MAYUSCULAS.test(b)) return destacado(b);
    // Un párrafo con viñetas debajo (la frase que abre la lista y la lista en el mismo bloque).
    const v = lineas.findIndex((l) => VINETA.test(l));
    if (v > 0) return p(lineas.slice(0, v).map(enLinea).join('<br>')) + lista(lineas.slice(v));
    return p(lineas.map(enLinea).join('<br>'));
  });
  const cabecera = opciones.cabecera?.trim()
    ? `<tr><td style="padding:22px 36px 0;font-family:${LETRA};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${DORADO}">${escapar(opciones.cabecera.trim())}</td></tr>`
    : '';
  // «Propuestas de Ópera · Temporadas 2027 y 2028»: lo que va tras el « · », debajo y en cursiva.
  const [principal = '', ...detalle] = (opciones.titulo ?? '').split(' · ').map((x) => x.trim());
  const titulo = principal
    ? `<tr><td style="padding:10px 36px 0"><div style="font-family:${TITULOS};font-size:25px;line-height:1.25;color:${TINTA}">${enLinea(principal)}</div>${
        detalle.length ? `<div style="font-family:${TITULOS};font-style:italic;font-size:16px;color:${ACENTO};margin-top:4px">${enLinea(detalle.join(' · '))}</div>` : ''
      }<div style="width:56px;height:2px;background:${DORADO};margin:14px 0 4px"></div></td></tr>`
    : '';
  const pie = opciones.pie?.trim()
    ? `<tr><td style="padding:14px 36px 24px;font-family:${LETRA};font-size:11.5px;line-height:1.5;color:#9ca3af">${enLinea(opciones.pie.trim())}</td></tr>`
    : '';
  return `<!doctype html><html lang="${opciones.idioma ?? 'es'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#efeae2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeae2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-top:4px solid ${DORADO};border-radius:2px">
${cabecera}
${titulo}
<tr><td style="padding:22px 36px 18px">
${html.join('\n')}
</td></tr>
${pie}
</table>
</td></tr></table>
</body></html>`;
}
