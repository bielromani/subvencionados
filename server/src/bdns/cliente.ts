import type { BdnsConvocatoria, BdnsPagina, BdnsResultadoBusqueda } from './tipos.js';

// La BDNS se publica bajo dos dominios del Ministerio de Hacienda. Probamos ambos
// y nos quedamos con el primero que responda.
export const URLS_BASE_POR_DEFECTO = [
  'https://www.infosubvenciones.es/bdnstrans/api',
  'https://www.pap.hacienda.gob.es/bdnstrans/api',
];

/** Ficha pública de una convocatoria, para enlazarla desde la web. */
export const urlFichaBdns = (codigo: string) =>
  `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/${encodeURIComponent(codigo)}`;

export interface OpcionesCliente {
  urlsBase?: string[];
  /** Pausa entre peticiones, para no saturar un servicio público. */
  pausaMs?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface FiltrosBusqueda {
  texto?: string;
  /** 0 = todas las palabras, 1 = alguna, 2 = frase exacta. */
  tipoBusquedaTexto?: 0 | 1 | 2;
  fechaDesde?: Date;
  fechaHasta?: Date;
  page?: number;
  pageSize?: number;
}

/** La API espera las fechas como dd/mm/aaaa. */
export function fechaBdns(fecha: Date): string {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

export class ErrorBdns extends Error {}

export class ClienteBdns {
  private readonly urlsBase: string[];
  private readonly pausaMs: number;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private ultimaPeticion = 0;

  constructor(opciones: OpcionesCliente = {}) {
    this.urlsBase = opciones.urlsBase ?? URLS_BASE_POR_DEFECTO;
    this.pausaMs = opciones.pausaMs ?? 1000;
    this.timeoutMs = opciones.timeoutMs ?? 30_000;
    this.fetchFn = opciones.fetch ?? fetch;
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
    return this.get('/convocatorias/busqueda', params);
  }

  async obtenerConvocatoria(numeroConvocatoria: string): Promise<BdnsConvocatoria> {
    return this.get('/convocatorias', { vpd: 'GE', numConv: numeroConvocatoria });
  }

  private async get<T>(ruta: string, params: Record<string, string>): Promise<T> {
    await this.respetarPausa();
    const query = new URLSearchParams(params).toString();
    const errores: string[] = [];

    for (const base of this.urlsBase) {
      const url = `${base}${ruta}?${query}`;
      try {
        const res = await this.fetchFn(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) {
          errores.push(`${url} -> HTTP ${res.status}`);
          continue;
        }
        // El dominio que funciona pasa a ser el primero para las siguientes peticiones.
        this.priorizar(base);
        return (await res.json()) as T;
      } catch (error) {
        errores.push(`${url} -> ${(error as Error).message}`);
      }
    }
    throw new ErrorBdns(`No se pudo consultar la BDNS:\n  ${errores.join('\n  ')}`);
  }

  private priorizar(base: string) {
    const i = this.urlsBase.indexOf(base);
    if (i > 0) this.urlsBase.unshift(...this.urlsBase.splice(i, 1));
  }

  private async respetarPausa() {
    const espera = this.ultimaPeticion + this.pausaMs - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    this.ultimaPeticion = Date.now();
  }
}
