import type { BdnsConcesion, BdnsConvocatoria, BdnsNodoOrgano, BdnsPagina, BdnsResultadoBusqueda } from './tipos.js';

// La BDNS se publica bajo dos dominios del Ministerio de Hacienda. Probamos ambos
// y nos quedamos con el primero que responda.
export const URLS_BASE_POR_DEFECTO = [
  'https://www.pap.hacienda.gob.es/bdnstrans/api',
  'https://www.infosubvenciones.es/bdnstrans/api',
];

/** Identificador de la finalidad "CULTURA" en GET /finalidades. */
export const FINALIDAD_CULTURA = 11;

/** Ficha pública de una convocatoria, para enlazarla desde la web. */
export const urlFichaBdns = (codigo: string) =>
  `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/${encodeURIComponent(codigo)}`;

export interface OpcionesCliente {
  urlsBase?: string[];
  /** Pausa entre peticiones, para no saturar un servicio público. */
  pausaMs?: number;
  timeoutMs?: number;
  /** Reintentos ante errores de red o respuestas 5xx, con espera exponencial. */
  reintentos?: number;
  esperaBaseMs?: number;
  fetch?: typeof fetch;
}

export interface FiltrosBusqueda {
  texto?: string;
  /** 0 = todas las palabras, 1 = alguna, 2 = frase exacta. */
  tipoBusquedaTexto?: 0 | 1 | 2;
  fechaDesde?: Date;
  fechaHasta?: Date;
  /** Id de GET /finalidades (11 = Cultura). */
  finalidad?: number;
  page?: number;
  /** La API admite hasta 10.000 resultados por página. */
  pageSize?: number;
}

/** La API espera las fechas como dd/mm/aaaa. */
export function fechaBdns(fecha: Date): string {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

export class ErrorBdns extends Error {
  /** true si reintentar no servirá (p. ej. 404). */
  constructor(
    message: string,
    readonly permanente = false,
  ) {
    super(message);
  }
}

const esperar = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

export class ClienteBdns {
  private readonly urlsBase: string[];
  private readonly pausaMs: number;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly reintentos: number;
  private readonly esperaBaseMs: number;
  private ultimaPeticion = 0;

  constructor(opciones: OpcionesCliente = {}) {
    this.urlsBase = [...(opciones.urlsBase ?? URLS_BASE_POR_DEFECTO)];
    this.pausaMs = opciones.pausaMs ?? 500;
    this.timeoutMs = opciones.timeoutMs ?? 60_000;
    this.fetchFn = opciones.fetch ?? fetch;
    this.reintentos = opciones.reintentos ?? 3;
    this.esperaBaseMs = opciones.esperaBaseMs ?? 5000;
  }

  async buscarConvocatorias(filtros: FiltrosBusqueda): Promise<BdnsPagina<BdnsResultadoBusqueda>> {
    const params: Record<string, string> = {
      vpd: 'GE',
      page: String(filtros.page ?? 0),
      pageSize: String(filtros.pageSize ?? 50),
      order: 'fechaRecepcion',
      direccion: 'desc',
    };
    if (filtros.texto) {
      params.descripcion = filtros.texto;
      params.descripcionTipoBusqueda = String(filtros.tipoBusquedaTexto ?? 0);
    }
    if (filtros.fechaDesde) params.fechaDesde = fechaBdns(filtros.fechaDesde);
    if (filtros.fechaHasta) params.fechaHasta = fechaBdns(filtros.fechaHasta);
    if (filtros.finalidad != null) params.finalidad = String(filtros.finalidad);
    return this.get('/convocatorias/busqueda', params);
  }

  /** Todas las páginas de una búsqueda. */
  async buscarTodas(filtros: Omit<FiltrosBusqueda, 'page'>): Promise<BdnsResultadoBusqueda[]> {
    const resultados: BdnsResultadoBusqueda[] = [];
    for (let page = 0; ; page++) {
      const pagina = await this.buscarConvocatorias({ pageSize: 10_000, ...filtros, page });
      resultados.push(...(pagina.content ?? []));
      if (pagina.last !== false || (pagina.content ?? []).length === 0) return resultados;
    }
  }

  /** Concesiones (pagos a beneficiarios) de una convocatoria. */
  async concesionesDe(numeroConvocatoria: string): Promise<BdnsConcesion[]> {
    const resultados: BdnsConcesion[] = [];
    for (let page = 0; ; page++) {
      const pagina = await this.get<BdnsPagina<BdnsConcesion>>('/concesiones/busqueda', {
        vpd: 'GE',
        numeroConvocatoria,
        page: String(page),
        pageSize: '10000',
      });
      resultados.push(...(pagina.content ?? []));
      if (pagina.last !== false || (pagina.content ?? []).length === 0) return resultados;
    }
  }

  /** Catálogo de órganos. idAdmon: C (Estado), A (autonómica), L (local), O (otros). */
  async organos(idAdmon: 'C' | 'A' | 'L' | 'O'): Promise<BdnsNodoOrgano[]> {
    return this.get('/organos', { vpd: 'GE', idAdmon });
  }

  /** PDF de un documento de una convocatoria (bases, texto de la convocatoria...). */
  async documento(idDocumento: number): Promise<Uint8Array> {
    return this.get('/convocatorias/documentos', { idDocumento: String(idDocumento) }, 'binario');
  }

  async obtenerConvocatoria(numeroConvocatoria: string): Promise<BdnsConvocatoria> {
    return this.get('/convocatorias', { vpd: 'GE', numConv: numeroConvocatoria });
  }

  private async get<T>(ruta: string, params: Record<string, string>, formato: 'json' | 'binario' = 'json'): Promise<T> {
    const query = new URLSearchParams(params).toString();
    const errores: string[] = [];

    for (let intento = 0; intento <= this.reintentos; intento++) {
      if (intento > 0) await esperar(this.esperaBaseMs * 2 ** (intento - 1));
      for (const base of this.urlsBase) {
        await this.respetarPausa();
        const url = `${base}${ruta}?${query}`;
        try {
          const res = await this.fetchFn(url, {
            headers: {
              Accept: formato === 'json' ? 'application/json' : '*/*',
              'User-Agent': 'subvencionados (github.com/bielromani/subvencionados)',
            },
            signal: AbortSignal.timeout(this.timeoutMs),
          });
          if (!res.ok) {
            errores.push(`${url} -> HTTP ${res.status}`);
            // Un 4xx (salvo 429) no se arregla reintentando.
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
              throw new ErrorBdns(errores.join('\n  '), true);
            }
            continue;
          }
          // El dominio que funciona pasa a ser el primero para las siguientes peticiones.
          this.priorizar(base);
          if (formato === 'binario') return new Uint8Array(await res.arrayBuffer()) as T;
          return (await res.json()) as T;
        } catch (error) {
          if (error instanceof ErrorBdns) throw error;
          errores.push(`${url} -> ${(error as Error).message}`);
        }
      }
    }
    throw new ErrorBdns(`No se pudo consultar la BDNS:\n  ${errores.join('\n  ')}`);
  }

  private priorizar(base: string) {
    const i = this.urlsBase.indexOf(base);
    if (i > 0) this.urlsBase.unshift(...this.urlsBase.splice(i, 1));
  }

  private async respetarPausa() {
    await esperar(this.ultimaPeticion + this.pausaMs - Date.now());
    this.ultimaPeticion = Date.now();
  }
}
