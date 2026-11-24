// Dossier en PDF de una línea de programación: el anexo que acompaña a la carta. Portada con el título y las entidades,
// condiciones generales, una página (o las que haga falta) por producción, cuadro resumen y nota final.
// Se genera con pdfkit y dos tipografías libres incrustadas (datos/fuentes): Caladea para los títulos e Inter para el texto.

import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { LINEA_DE_TIPO, type Linea, lineaPrincipal, lineasCarta, nombresLineas, plantillasDe } from './cartas.js';
import type { AjustesCrm, Anexo, Campana, Espectaculo, FichaDossier } from './tipos.js';

export interface ProduccionDossier {
  nombre: string;
  ficha: FichaDossier;
}

export interface DatosDossier {
  linea: Linea;
  idioma: 'es' | 'ca';
  titulo: string;
  subtitulo: string;
  condiciones: string;
  producciones: ProduccionDossier[];
  /** Filas del cuadro resumen: producción, características, disponibilidad y precio. */
  resumen: [string, string, string, string][];
  notas: string[];
  notaFinal: string;
  /** Pie de página: quién lo envía y cómo contactar. */
  pie: string;
}

const ROTULOS = {
  es: { condiciones: 'Condiciones generales', disponibilidad: 'Disponibilidad', precio: 'Caché', ficha: 'Ficha técnica', resumen: 'Cuadro resumen', cabecera: ['Producción', 'Características', 'Disponibilidad', 'Precio'], dossier: 'DOSSIER' },
  ca: { condiciones: 'Condicions generals', disponibilidad: 'Disponibilitat', precio: 'Caixet', ficha: 'Fitxa tècnica', resumen: 'Quadre resum', cabecera: ['Producció', 'Característiques', 'Disponibilitat', 'Preu'], dossier: 'DOSSIER' },
};

/** La página del dossier de una producción en un idioma (sin catalán, la castellana); sin dossier, lo que dice su ficha. */
export function fichaDossierDe(e: Espectaculo, idioma: 'es' | 'ca'): FichaDossier {
  const f = (idioma === 'ca' && e.dossierCa) || e.dossier;
  if (f) return f;
  const precio = e.precioMin != null ? (e.precioMax != null && e.precioMax !== e.precioMin ? `${euros(e.precioMin)} – ${euros(e.precioMax)}` : euros(e.precioMin)) : '';
  return {
    titulo: '',
    etiqueta: '',
    subtitulo: e.formato,
    equipo: '',
    descripcion: (idioma === 'ca' ? e.textoCartaCa || e.textoCarta : e.textoCarta) ?? '',
    fichaTecnica: e.requisitos,
    disponibilidad: e.disponibilidad,
    precio: precio ? `Caché: ${precio}` : '',
    resumen: '',
    nota: '',
  };
}

const euros = (n: number) => `${Math.round(n).toLocaleString('es-ES')} €`;

/** Producciones de una línea en un correo: las de la lista que son de esa línea, en su orden. */
export function produccionesDeLinea(catalogo: Espectaculo[], ids: string[], linea: Linea): Espectaculo[] {
  const porId = new Map(catalogo.map((e) => [e.id, e]));
  return ids.map((id) => porId.get(id)).filter((e): e is Espectaculo => !!e && LINEA_DE_TIPO[e.tipo] === linea);
}

export function datosDossier(
  linea: Linea,
  idioma: 'es' | 'ca',
  espectaculos: Espectaculo[],
  ajustes: AjustesCrm,
  portada: Partial<Pick<DatosDossier, 'titulo' | 'subtitulo' | 'condiciones' | 'notaFinal'>> = {},
): DatosDossier {
  const t = plantillasDe(ajustes)[idioma].lineas[linea];
  const producciones = espectaculos.map((e) => ({ nombre: e.nombre, ficha: fichaDossierDe(e, idioma) }));
  const resumen: DatosDossier['resumen'] = [];
  const notas: string[] = [];
  for (const p of producciones) {
    const filas = p.ficha.resumen
      .split('\n')
      .map((l) => l.split('|').map((x) => x.trim()))
      .filter((x) => x.some(Boolean));
    if (filas.length) for (const f of filas) resumen.push([f[0] ?? p.nombre, f[1] ?? '', f[2] ?? '', f[3] ?? '']);
    else resumen.push([p.nombre, p.ficha.subtitulo, p.ficha.disponibilidad, p.ficha.precio.split('\n')[0] ?? '']);
    if (p.ficha.nota.trim()) notas.push(p.ficha.nota.trim());
  }
  const pie = [ajustes.organizacion, ajustes.email, ajustes.telefono, ajustes.web].filter((x) => x?.trim()).join(' · ');
  return {
    linea,
    idioma,
    titulo: portada.titulo?.trim() || t.dossierTitulo || t.titulo,
    subtitulo: portada.subtitulo?.trim() || t.dossierSubtitulo || ajustes.organizacion,
    condiciones: portada.condiciones?.trim() || t.condiciones,
    producciones,
    resumen,
    notas,
    notaFinal: portada.notaFinal?.trim() || t.notaFinal,
    pie,
  };
}

/**
 * El dossier que acompaña a un correo: el de la línea principal de lo que se ofrece, con sus producciones. Solo si
 * alguna tiene dossier preparado (sin él, el PDF diría poco más que la carta).
 */
export function dossierDeCorreo(espectaculos: Espectaculo[], idioma: 'es' | 'ca', ajustes: AjustesCrm, linea = lineaPrincipal(espectaculos)): DatosDossier | null {
  if (!linea) return null;
  const deLinea = espectaculos.filter((e) => LINEA_DE_TIPO[e.tipo] === linea);
  if (!deLinea.some((e) => e.dossier)) return null;
  return datosDossier(linea, idioma, deLinea, ajustes);
}

/** Las entidades de varias portadas, sin repetir: «Ópera Popular de Barcelona · Orquesta… · ArsVia». */
function unirEntidades(subtitulos: string[]): string {
  const vistas: string[] = [];
  for (const s of subtitulos) for (const x of s.split(' · ').map((y) => y.trim())) if (x && !vistas.includes(x)) vistas.push(x);
  return vistas.join(' · ');
}

/**
 * Un solo dossier con las producciones de varias líneas (la carta combinada): el título de la carta combinada, las
 * entidades de todas las líneas y las condiciones de la principal. Sin ninguna ficha de dossier preparada, nada.
 */
export function dossierConjunto(espectaculos: Espectaculo[], idioma: 'es' | 'ca', ajustes: AjustesCrm, lineas = lineasCarta(espectaculos)): DatosDossier | null {
  const [principal] = lineas;
  if (!principal) return null;
  const orden = espectaculos.filter((e) => lineas.includes(LINEA_DE_TIPO[e.tipo])).sort((a, b) => lineas.indexOf(LINEA_DE_TIPO[a.tipo]) - lineas.indexOf(LINEA_DE_TIPO[b.tipo]));
  if (!orden.some((e) => e.dossier)) return null;
  const t = plantillasDe(ajustes)[idioma];
  return datosDossier(principal, idioma, orden, ajustes, {
    titulo: t.tituloVarias.replace(/\{lineas\}/g, nombresLineas(lineas, idioma)),
    subtitulo: unirEntidades(lineas.map((l) => t.lineas[l].dossierSubtitulo)),
  });
}

/** Un anexo a medida: sus producciones (las que siguen en el catálogo), con su portada; lo que esté vacío, de la línea principal. */
export function dossierDeAnexo(anexo: Anexo, idioma: 'es' | 'ca', catalogo: Espectaculo[], ajustes: AjustesCrm): DatosDossier | null {
  const porId = new Map(catalogo.map((e) => [e.id, e]));
  const es = anexo.espectaculos.map((id) => porId.get(id)).filter((e): e is Espectaculo => !!e);
  const lineas = lineasCarta(es);
  const principal = lineas[0] ?? (es[0] ? LINEA_DE_TIPO[es[0].tipo] : null);
  if (!principal) return null;
  const t = plantillasDe(ajustes)[idioma];
  const propios = idioma === 'ca' && Object.values(anexo.ca).some((x) => x.trim()) ? anexo.ca : anexo.es;
  return datosDossier(principal, idioma, es, ajustes, {
    ...(lineas.length > 1 && { subtitulo: unirEntidades(lineas.map((l) => t.lineas[l].dossierSubtitulo)) }),
    ...Object.fromEntries(Object.entries(propios).filter(([, v]) => v.trim())),
  });
}

/**
 * El dossier de un correo, siempre uno: el anexo de su campaña (o uno con las producciones de la campaña), el
 * conjunto de la carta combinada o el de su línea.
 */
export function dossierDelCorreo(
  espectaculos: Espectaculo[],
  idioma: 'es' | 'ca',
  ajustes: AjustesCrm,
  opciones: { campana?: Campana | null; catalogo?: Espectaculo[] } = {},
): DatosDossier | null {
  const { campana } = opciones;
  if (campana) {
    const anexo = campana.anexo ? ajustes.anexos?.find((a) => a.id === campana.anexo) : undefined;
    if (anexo) return dossierDeAnexo(anexo, idioma, opciones.catalogo ?? espectaculos, ajustes);
    const lineas = lineasCarta(espectaculos);
    return lineas.length > 1 ? dossierConjunto(espectaculos, idioma, ajustes, lineas) : dossierDeCorreo(espectaculos, idioma, ajustes);
  }
  const lineas = lineasCarta(espectaculos);
  return lineas.length > 1 ? dossierConjunto(espectaculos, idioma, ajustes, lineas) : dossierDeCorreo(espectaculos, idioma, ajustes);
}

/** El dossier de una línea con todo el catálogo que entra en las cartas (para descargarlo o revisarlo). */
export function dossierDeLinea(linea: Linea, idioma: 'es' | 'ca', catalogo: Espectaculo[], ajustes: AjustesCrm): DatosDossier {
  const deLinea = catalogo.filter((e) => LINEA_DE_TIPO[e.tipo] === linea && e.enCartas !== false);
  return datosDossier(linea, idioma, deLinea, ajustes);
}

export function nombreArchivoDossier(d: Pick<DatosDossier, 'titulo' | 'idioma'>, organizacion: string): string {
  const limpio = (x: string) =>
    x
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const org = limpio(organizacion.split(/[–-]/)[0] ?? '').slice(0, 30);
  const titulo = limpio(d.titulo.split('·')[0] ?? 'dossier').slice(0, 60);
  return `${[org, titulo].filter(Boolean).join('-') || 'dossier'}.pdf`;
}

// ---------- Maquetación ----------

const TINTA = '#1d2433';
const TEXTO = '#2b2f36';
const SUAVE = '#6b7280';
const ACENTO = '#8c2f39';
const DORADO = '#b08d57';
const FONDO = '#f5f1ea';
const RAYA = '#e4ddd0';

export async function pdfDossier(d: DatosDossier, rutaFuentes: string): Promise<Buffer> {
  const f = (x: string) => join(rutaFuentes, x);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 72, left: 62, right: 62 }, bufferPages: true, font: f('Inter-Regular.otf'), info: { Title: d.titulo, Author: d.subtitulo } });
  doc.registerFont('titulo', f('Caladea-Bold.ttf'));
  doc.registerFont('tituloR', f('Caladea-Regular.ttf'));
  doc.registerFont('cursiva', f('Caladea-Italic.ttf'));
  doc.registerFont('texto', f('Inter-Regular.otf'));
  doc.registerFont('negrita', f('Inter-SemiBold.otf'));
  doc.registerFont('textoI', f('Inter-Italic.otf'));
  const partes: Buffer[] = [];
  doc.on('data', (b: Buffer) => partes.push(b));
  const fin = new Promise<Buffer>((ok) => doc.on('end', () => ok(Buffer.concat(partes))));
  const r = ROTULOS[d.idioma];
  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const izq = doc.page.margins.left;
  const limite = () => doc.page.height - doc.page.margins.bottom;
  const sitio = (h: number) => {
    if (doc.y + h > limite()) doc.addPage();
  };

  const parrafos = (texto: string, opciones: { tam?: number; color?: string; fuente?: string } = {}) => {
    for (const bloque of texto.split(/\n\s*\n/)) {
      const lineas = bloque.split('\n').filter((l) => l.trim());
      if (!lineas.length) continue;
      if (lineas.length === 1 && lineas[0]!.startsWith('### ')) {
        sitio(40);
        doc.moveDown(0.3).font('titulo').fontSize(12.5).fillColor(TINTA).text(lineas[0]!.slice(4), izq, doc.y, { width: ancho });
        doc.moveDown(0.35);
        continue;
      }
      for (const l of lineas) {
        const vineta = /^[•·-]\s+/.test(l);
        const t = l.replace(/^[•·-]\s+/, '');
        doc.font(opciones.fuente ?? 'texto').fontSize(opciones.tam ?? 9.6).fillColor(opciones.color ?? TEXTO);
        sitio(doc.heightOfString(t, { width: ancho - (vineta ? 14 : 0) }) + 2);
        if (vineta) {
          const y = doc.y;
          doc.fillColor(DORADO).text('•', izq + 2, y, { width: 10 });
          doc.fillColor(opciones.color ?? TEXTO).text(t, izq + 14, y, { width: ancho - 14, lineGap: 2.2 });
        } else doc.text(t, izq, doc.y, { width: ancho, lineGap: 2.2, align: 'left' });
        doc.moveDown(0.15);
      }
      doc.moveDown(0.45);
    }
  };

  const seccion = (titulo: string) => {
    sitio(60);
    doc.moveDown(0.4);
    doc.font('titulo').fontSize(15).fillColor(ACENTO).text(titulo, izq, doc.y, { width: ancho });
    const y = doc.y + 3;
    doc.moveTo(izq, y).lineTo(izq + ancho, y).lineWidth(0.7).strokeColor(RAYA).stroke();
    doc.y = y + 10;
  };

  // Altura aproximada de una producción, para no dejar su caja de caché huérfana.
  const altoProduccion = (fi: FichaDossier): number => {
    let h = 40 + 14;
    doc.font('titulo').fontSize(21);
    h += doc.heightOfString(fi.titulo || ' ', { width: ancho });
    if (fi.subtitulo) h += 22;
    if (fi.equipo) h += doc.font('negrita').fontSize(9.4).heightOfString(fi.equipo, { width: ancho }) + 6;
    doc.font('texto').fontSize(9.6);
    for (const l of fi.descripcion.split('\n').filter((x) => x.trim())) h += doc.heightOfString(l, { width: ancho - 14, lineGap: 2.2 }) + 6;
    h += fi.descripcion.split(/\n\s*\n/).length * 6;
    if (fi.fichaTecnica.trim()) h += fi.fichaTecnica.split('\n').filter((l) => l.trim()).length * 16 + 54;
    if (fi.disponibilidad.trim() || fi.precio.trim()) h += 30 + fi.precio.split('\n').filter((l) => l.trim()).length * 16 + 44;
    return h;
  };

  // Portada: banda con el título y las entidades.
  const alto = 210;
  doc.rect(0, 0, doc.page.width, alto).fill(TINTA);
  doc.rect(0, alto, doc.page.width, 4).fill(DORADO);
  doc.font('negrita').fontSize(8.5).fillColor(DORADO).text(r.dossier, izq, 62, { characterSpacing: 3, width: ancho });
  const [principal, ...resto] = d.titulo.split('·').map((x) => x.trim());
  doc.font('titulo').fontSize(26).fillColor('#ffffff').text(principal ?? d.titulo, izq, 82, { width: ancho, lineGap: 1 });
  if (resto.length) doc.font('cursiva').fontSize(14).fillColor('#e9e3d8').text(resto.join(' · '), izq, doc.y + 4, { width: ancho });
  if (d.subtitulo) doc.font('texto').fontSize(9).fillColor('#c9cfda').text(d.subtitulo, izq, alto - 34, { width: ancho });
  doc.y = alto + 34;

  if (d.condiciones.trim()) {
    seccion(r.condiciones);
    parrafos(d.condiciones);
  }

  for (const p of d.producciones) {
    const fi = p.ficha;
    // Una tras otra; si la producción entera no cabe en lo que queda de página
    // (y sí en una página nueva), pasa entera a la siguiente.
    const estimado = altoProduccion(fi);
    const util = limite() - doc.page.margins.top;
    if (doc.y + 48 + Math.min(estimado, 230) > limite() || (estimado < util && doc.y + 48 + estimado > limite())) doc.addPage();
    else {
      doc.y += 22;
      doc.moveTo(izq, doc.y).lineTo(izq + ancho, doc.y).lineWidth(0.6).strokeColor(RAYA).stroke();
      doc.y += 26;
    }
    if (fi.etiqueta) doc.font('negrita').fontSize(8).fillColor(DORADO).text(fi.etiqueta.toUpperCase(), izq, doc.y, { characterSpacing: 1.6, width: ancho });
    doc.font('titulo').fontSize(21).fillColor(TINTA).text(fi.titulo || p.nombre, izq, doc.y + (fi.etiqueta ? 4 : 0), { width: ancho, lineGap: 1 });
    if (fi.subtitulo) doc.font('cursiva').fontSize(12.5).fillColor(ACENTO).text(fi.subtitulo, izq, doc.y + 3, { width: ancho });
    if (fi.equipo) doc.font('negrita').fontSize(9.4).fillColor(SUAVE).text(fi.equipo, izq, doc.y + 6, { width: ancho, lineGap: 2 });
    const y = doc.y + 10;
    doc.moveTo(izq, y).lineTo(izq + 60, y).lineWidth(1.4).strokeColor(DORADO).stroke();
    doc.y = y + 14;
    if (fi.descripcion.trim()) parrafos(fi.descripcion);
    if (fi.fichaTecnica.trim()) {
      const lineas = fi.fichaTecnica.split('\n').filter((l) => l.trim());
      doc.font('texto').fontSize(9.2);
      const h = lineas.reduce((s, l) => s + doc.heightOfString(l, { width: ancho - 28 }) + 4, 0) + 40;
      sitio(h);
      const y0 = doc.y;
      doc.rect(izq, y0, ancho, h).fill(FONDO);
      doc.font('negrita').fontSize(9).fillColor(ACENTO).text(r.ficha.toUpperCase(), izq + 14, y0 + 12, { characterSpacing: 1.2, width: ancho - 28 });
      doc.moveDown(0.4);
      for (const l of lineas) {
        const [k, ...v] = l.split(':');
        doc.font(v.length ? 'negrita' : 'texto').fontSize(9.2).fillColor(TEXTO).text(v.length ? `${k}:` : l, izq + 14, doc.y, { width: ancho - 28, continued: v.length > 0 });
        if (v.length) doc.font('texto').text(v.join(':'));
        doc.moveDown(0.2);
      }
      doc.y = y0 + h + 14;
    }
    // Disponibilidad y caché, en una caja.
    const precio = fi.precio.split('\n').filter((l) => l.trim());
    if (fi.disponibilidad.trim() || precio.length) {
      doc.font('texto').fontSize(10);
      const col = (ancho - 28) / 2;
      const hDisp = fi.disponibilidad.trim() ? doc.heightOfString(fi.disponibilidad, { width: col - 10 }) : 0;
      const hPrecio = precio.reduce((s, l) => s + doc.heightOfString(l, { width: col - 10 }) + 3, 0);
      const h = Math.max(hDisp, hPrecio) + 44;
      sitio(h + 10);
      const y0 = doc.y;
      doc.rect(izq, y0, ancho, h).lineWidth(0.8).strokeColor(DORADO).stroke();
      const columna = (x: number, rotulo: string, ls: string[], destacar: boolean) => {
        doc.font('negrita').fontSize(8).fillColor(SUAVE).text(rotulo.toUpperCase(), x, y0 + 13, { characterSpacing: 1.2, width: col - 10 });
        doc.y = y0 + 28;
        ls.forEach((l, i) => doc.font(destacar && i === 0 ? 'titulo' : 'texto').fontSize(destacar && i === 0 ? 12.5 : 9.6).fillColor(TINTA).text(l, x, doc.y, { width: col - 10, lineGap: 1.5 }));
      };
      if (fi.disponibilidad.trim()) columna(izq + 14, r.disponibilidad, [fi.disponibilidad.trim()], false);
      if (precio.length) columna(izq + 14 + (fi.disponibilidad.trim() ? col + 14 : 0), r.precio, precio, true);
      doc.y = y0 + h + 12;
    }
  }

  // Cuadro resumen.
  if (d.resumen.length) {
    if (doc.y + 40 + 32 * Math.min(d.resumen.length + 1, 5) > limite()) doc.addPage();
    else doc.y += 16;
    seccion(r.resumen);
    const anchos = [0.25, 0.37, 0.18, 0.2].map((x) => x * ancho);
    const fila = (celdas: string[], cabecera: boolean, par: boolean) => {
      doc.font(cabecera ? 'negrita' : 'texto').fontSize(cabecera ? 8.4 : 8.9);
      const h = Math.max(...celdas.map((c, i) => doc.heightOfString(c, { width: anchos[i]! - 14 }))) + 14;
      sitio(h);
      const y0 = doc.y;
      if (cabecera) doc.rect(izq, y0, ancho, h).fill(TINTA);
      else if (par) doc.rect(izq, y0, ancho, h).fill(FONDO);
      let x = izq;
      celdas.forEach((c, i) => {
        doc
          .font(cabecera ? 'negrita' : i === 0 ? 'negrita' : 'texto')
          .fontSize(cabecera ? 8.4 : 8.9)
          .fillColor(cabecera ? '#ffffff' : TEXTO)
          .text(c, x + 7, y0 + 7, { width: anchos[i]! - 14, lineGap: 1.2 });
        x += anchos[i]!;
      });
      doc.y = y0 + h;
    };
    fila(r.cabecera, true, false);
    d.resumen.forEach((c, i) => fila(c, false, i % 2 === 0));
    doc.moveTo(izq, doc.y).lineTo(izq + ancho, doc.y).lineWidth(0.7).strokeColor(RAYA).stroke();
    doc.y += 12;
    for (const n of d.notas) parrafos(n, { tam: 8.4, color: SUAVE, fuente: 'textoI' });
  }
  if (d.notaFinal.trim()) {
    doc.moveDown(0.6);
    parrafos(d.notaFinal, { tam: 9, color: SUAVE, fuente: 'textoI' });
  }

  // Pie en todas las páginas: quién lo envía y el número de página.
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(paginas.start + i);
    const margen = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 44;
    doc.moveTo(izq, y - 8).lineTo(izq + ancho, y - 8).lineWidth(0.5).strokeColor(RAYA).stroke();
    doc.font('texto').fontSize(7.6).fillColor(SUAVE).text(d.pie, izq, y, { width: ancho - 40, lineBreak: false });
    doc.text(`${i + 1} / ${paginas.count}`, izq + ancho - 40, y, { width: 40, align: 'right', lineBreak: false });
    doc.page.margins.bottom = margen;
  }
  doc.end();
  return fin;
}
