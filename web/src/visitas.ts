// Última visita, para enseñar lo nuevo desde entonces. Se guarda en el navegador: el día de la visita anterior a la de
// hoy se conserva durante todo el día, así recargar no borra las novedades.
const CLAVE = 'subvencionados:visitas';

interface Visitas {
  /** Último día con visita (aaaa-mm-dd). */
  ultima: string;
  /** Día de la visita anterior a «ultima»: desde ahí se cuentan las novedades. */
  anterior: string | null;
}

export function visitaAnterior(hoy = new Date().toLocaleDateString('sv-SE')): string | null {
  let v: Visitas | null = null;
  try {
    v = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Visitas | null;
  } catch {
    v = null;
  }
  if (v?.ultima === hoy) return v.anterior;
  const nueva: Visitas = { ultima: hoy, anterior: v?.ultima ?? null };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nueva));
  } catch {
    // Sin almacenamiento: se enseña la última semana.
  }
  return nueva.anterior;
}
