import type { Convocatoria, Linea } from './tipos.js';

/** Cifras del mercado de ayudas a la música: cuánto se convoca y se concede, cuándo, dónde y para qué. */
export interface Mercado {
  totales: { convocatorias: number; concursos: number; directas: number; presupuesto: number; concedido: number; organismos: number };
  /** Primer año de convocatoria con concesiones publicadas (la BDNS solo da las de los últimos cuatro años). */
  primerAnioConcesiones: number | null;
  porAnio: { anio: number; convocatorias: number; concursos: number; presupuesto: number; concedido: number }[];
  porComunidad: { nombre: string; convocatorias: number; concedido: number }[];
  /** Solo organismos situados en una provincia (ayuntamientos, diputaciones, comarcas...). */
  porProvincia: { codigo: string; nombre: string; convocatorias: number; concedido: number }[];
  porLinea: { linea: Linea | 'sin'; convocatorias: number; concedido: number }[];
}

const ESTATAL = 'Ámbito estatal';

/** La comunidad del organismo; si es del Estado o no se ha podido situar, la de su ámbito. */
function comunidad(c: Convocatoria): string {
  if (c.administracion === 'estatal' || c.ambitoNacional) return ESTATAL;
  return c.ubicacion?.ccaa ?? (c.ccaa.length === 1 ? c.ccaa[0]! : 'Sin situar');
}

export function mercado(convocatorias: Convocatoria[]): Mercado {
  const anios = new Map<number, Mercado['porAnio'][number]>();
  const comunidades = new Map<string, Mercado['porComunidad'][number]>();
  const provincias = new Map<string, Mercado['porProvincia'][number]>();
  const lineas = new Map<Linea | 'sin', Mercado['porLinea'][number]>();
  const organismos = new Set<string>();
  const totales = { convocatorias: 0, concursos: 0, directas: 0, presupuesto: 0, concedido: 0, organismos: 0 };

  for (const c of convocatorias) {
    const concedido = c.concesiones?.importeTotal ?? 0;
    const presupuesto = c.presupuesto ?? 0;
    totales.convocatorias++;
    totales[c.tipo === 'directa' ? 'directas' : 'concursos']++;
    totales.presupuesto += presupuesto;
    totales.concedido += concedido;
    organismos.add(c.organoNiveles.join('|'));

    const anio = Number(c.fechaPublicacion?.slice(0, 4));
    if (anio) {
      const a = anios.get(anio) ?? { anio, convocatorias: 0, concursos: 0, presupuesto: 0, concedido: 0 };
      a.convocatorias++;
      if (c.tipo === 'concurrencia') a.concursos++;
      a.presupuesto += presupuesto;
      a.concedido += concedido;
      anios.set(anio, a);
    }

    const nombre = comunidad(c);
    const cc = comunidades.get(nombre) ?? { nombre, convocatorias: 0, concedido: 0 };
    cc.convocatorias++;
    cc.concedido += concedido;
    comunidades.set(nombre, cc);

    const u = c.ubicacion;
    if (u?.codigoProvincia && c.administracion !== 'estatal' && c.administracion !== 'autonomica') {
      const p = provincias.get(u.codigoProvincia) ?? { codigo: u.codigoProvincia, nombre: u.provincia ?? u.codigoProvincia, convocatorias: 0, concedido: 0 };
      p.convocatorias++;
      p.concedido += concedido;
      provincias.set(u.codigoProvincia, p);
    }

    // Una convocatoria puede financiar varias cosas: cuenta en cada una (por eso no suman el total).
    for (const linea of c.clasificacion.lineas.length ? c.clasificacion.lineas : (['sin'] as const)) {
      const l = lineas.get(linea) ?? { linea, convocatorias: 0, concedido: 0 };
      l.convocatorias++;
      l.concedido += concedido;
      lineas.set(linea, l);
    }
  }
  totales.organismos = organismos.size;
  const porAnio = [...anios.values()].sort((a, b) => a.anio - b.anio);
  return {
    totales,
    primerAnioConcesiones: porAnio.find((a) => a.concedido > 0)?.anio ?? null,
    porAnio,
    porComunidad: [...comunidades.values()].sort((a, b) => b.concedido - a.concedido || b.convocatorias - a.convocatorias),
    porProvincia: [...provincias.values()].sort((a, b) => b.concedido - a.concedido || b.convocatorias - a.convocatorias),
    porLinea: [...lineas.values()].sort((a, b) => b.concedido - a.concedido || b.convocatorias - a.convocatorias),
  };
}
