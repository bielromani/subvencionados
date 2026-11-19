// El correo en HTML: el mismo texto de la carta, con el aspecto de un correo escrito a mano desde Gmail u Outlook
// (letra normal, fondo blanco, sin cabeceras ni recuadros), pero bien ordenado. El texto plano se escribe en las
// plantillas y aquí se convierte:
// - Un párrafo cuyas líneas empiezan por «• » es una lista; lo que va antes del primer « · » sale en negrita (el
//   nombre de la producción). Las líneas que empiezan por «– » debajo de una viñeta son subapartados.
// - Un párrafo que empieza en MAYÚSCULAS («TE INVITO A VERNOS EN ESCENA. …») empieza con esa frase en negrita.
// - «## Título» es un título (en negrita, algo más grande); **texto** va en negrita.
// - El último párrafo con varias líneas, tras la despedida, es la firma.
// Estilos en línea: es lo que respetan Gmail, Outlook y Apple Mail.

const TEXTO = '#222222';
const SUAVE = '#5f6368';
const ENLACE = '#1a5fb4';
const LETRA = 'Arial,Helvetica,sans-serif';
const BASE = `font-family:${LETRA};font-size:14.5px;line-height:1.55;color:${TEXTO}`;

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Negritas y enlaces dentro de un texto ya escapado. */
function enLinea(t: string): string {
  return escapar(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<)]+[^\s<).,;:])/g, `<a href="$1" style="color:${ENLACE}">$1</a>`)
    .replace(/(^|[\s(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, `$1<a href="mailto:$2" style="color:${ENLACE}">$2</a>`);
}

const VINETA = /^\s*[•·]\s+/;
const SUB = /^\s*[–-]\s+/;
// Tres o más palabras seguidas en mayúsculas al empezar («TE INVITO A CONOCERNOS…»); no un nombre como «THE CROSSROADS».
const MAYUSCULAS = /^((?:[A-ZÁÉÍÓÚÑÇÀÈÒÏÜ’'-]+[ ,]+){2,}[A-ZÁÉÍÓÚÑÇÀÈÒÏÜ’'-]+[.:!]?)(?=\s|$)/;

const p = (html: string, margen = '0 0 14px') => `<p style="margin:${margen};${BASE}">${html}</p>`;

/** «Nombre · descripción»: el nombre en negrita (si no es una frase larga). */
function conNombre(l: string): string {
  const i = l.indexOf(' · ');
  return i > 0 && i < 90 ? `<strong>${enLinea(l.slice(0, i))}</strong> · ${enLinea(l.slice(i + 3))}` : enLinea(l);
}

function lista(lineas: string[]): string {
  const items: { texto: string; subs: string[] }[] = [];
  for (const l of lineas) {
    if (SUB.test(l) && items.length) items.at(-1)!.subs.push(l.replace(SUB, ''));
    else items.push({ texto: l.replace(VINETA, ''), subs: [] });
  }
  const li = items
    .map(({ texto, subs }) => {
      const sub = subs.length ? `<ul style="margin:6px 0 0;padding-left:20px">${subs.map((s) => `<li style="margin:0 0 4px;${BASE}">${enLinea(s)}</li>`).join('')}</ul>` : '';
      return `<li style="margin:0 0 8px;${BASE}">${conNombre(texto)}${sub}</li>`;
    })
    .join('');
  return `<ul style="margin:0 0 14px;padding-left:22px">${li}</ul>`;
}

/** La invitación: la frase en mayúsculas pasa a negrita normal; si son varias (viñetas), una lista. */
function destacado(bloque: string): string {
  const [, titular = ''] = bloque.match(MAYUSCULAS) ?? [];
  const bonito = titular.charAt(0) + titular.slice(1).toLowerCase();
  const [primera = '', ...otras] = bloque.slice(titular.length).split(/\n+/);
  const cabeza = `<strong>${enLinea(bonito)}</strong>${enLinea(primera)}`;
  if (!otras.some((l) => VINETA.test(l))) return [p(cabeza, '0 0 10px'), ...otras.map((l) => p(conNombre(l), '0 0 10px'))].join('') + '<div style="height:4px"></div>';
  // Varias invitaciones: cada viñeta con las líneas que la siguen.
  const items: string[][] = [];
  for (const l of otras) {
    if (VINETA.test(l) || !items.length) items.push([l.replace(VINETA, '')]);
    else items.at(-1)!.push(l);
  }
  const li = items.map(([a = '', ...resto]) => `<li style="margin:0 0 10px;${BASE}">${enLinea(a)}${resto.map((l) => `<br>${conNombre(l)}`).join('')}</li>`).join('');
  return p(cabeza, '0 0 8px') + `<ul style="margin:0 0 14px;padding-left:22px">${li}</ul>`;
}

function firma(bloque: string): string {
  const [nombre = '', ...resto] = bloque.split('\n').filter((l) => l.trim());
  return `<div style="margin:4px 0 0;${BASE}"><strong>${enLinea(nombre)}</strong>${resto.map((l) => `<br><span style="font-size:13px;color:${SUAVE}">${enLinea(l)}</span>`).join('')}</div>`;
}

/** El texto sin las marcas de formato, para la versión en texto plano del correo. */
export function textoPlano(cuerpo: string): string {
  return cuerpo.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^##\s+/gm, '');
}

/**
 * El correo en HTML. `pie`: una nota pequeña al final (la baja). `cabecera` y `titulo` se aceptan por compatibilidad,
 * pero no se pintan: un correo escrito por alguien no lleva membrete ni portada.
 */
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
    if (/^##\s+/.test(b)) return p(`<strong style="font-size:15.5px">${enLinea(b.replace(/^##\s+/, ''))}</strong>`, '20px 0 8px');
    if (MAYUSCULAS.test(b)) return destacado(b);
    // Un párrafo con viñetas debajo (la frase que abre la lista y la lista en el mismo bloque).
    const v = lineas.findIndex((l) => VINETA.test(l));
    if (v > 0) return p(lineas.slice(0, v).map(enLinea).join('<br>')) + lista(lineas.slice(v));
    return p(lineas.map(enLinea).join('<br>'));
  });
  const pie = opciones.pie?.trim() ? `<p style="margin:28px 0 0;font-family:${LETRA};font-size:11.5px;line-height:1.5;color:#9aa0a6">${enLinea(opciones.pie.trim())}</p>` : '';
  return `<!doctype html><html lang="${opciones.idioma ?? 'es'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="max-width:640px;padding:16px 12px;${BASE}">
${html.join('\n')}
${pie}
</div>
</body></html>`;
}
