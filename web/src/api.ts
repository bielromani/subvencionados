import type { Circuito, Coincidencia, ContactoMunicipio, Contrato, Festival, Programador, Convocatoria, EventoCalendario, Grupo, Mercado, MercadoContratos, Meta, Organismo, Perfil } from './tipos';

export interface Lista {
  total: number;
  items: Coincidencia[];
}
export interface ListaPrevistas {
  total: number;
  items: (Coincidencia & { prevista: string })[];
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    const errores: string[] = cuerpo?.errores ?? [cuerpo?.error ?? `Error ${res.status}`];
    throw new ErrorApi(errores);
  }
  return cuerpo as T;
}

export class ErrorApi extends Error {
  constructor(readonly errores: string[]) {
    super(errores.join('\n'));
  }
}

export interface Filtros {
  q?: string;
  estilo?: string;
  ccaa?: string;
  administracion?: string;
  linea?: string;
  plazo?: string;
  tipo?: string;
  orden?: string;
  todas?: boolean;
  cultura?: boolean;
  pagina?: number;
}

export const api = {
  meta: () => pedir<Meta>('/api/meta'),
  convocatorias: (f: Filtros) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) params.set(k, String(v));
    return pedir<{ total: number; pagina: number; porPagina: number; items: Convocatoria[] }>(`/api/convocatorias?${params}`);
  },
  convocatoria: (id: string) => pedir<Convocatoria>(`/api/convocatorias/${encodeURIComponent(id)}`),
  organismos: (f: { q?: string; ccaa?: string; administracion?: string; orden?: string; pagina?: number }) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) params.set(k, String(v));
    return pedir<{ total: number; pagina: number; porPagina: number; items: Organismo[] }>(`/api/organismos?${params}`);
  },
  organismo: (id: string) =>
    pedir<Organismo & { convocatorias: Convocatoria[]; contratos: { total: number; items: Contrato[] }; contacto: ContactoMunicipio | null }>(`/api/organismos/${encodeURIComponent(id)}`),
  calendario: (consulta: string) => pedir<{ eventos: EventoCalendario[]; licitaciones: Contrato[] }>(`/api/calendario?${consulta}`),
  mercado: (consulta: string) => pedir<Mercado>(`/api/mercado?${consulta}`),
  inicio: () =>
    pedir<{
      perfilCompleto: boolean;
      abiertas: number;
      cierranPronto: Lista;
      abrenPronto: Lista;
      previstas: ListaPrevistas;
      artistas: Lista;
      nuevas: Lista;
      licitaciones: { total: number; items: Contrato[] };
      grupos: { grupo: Grupo; abiertas: number; previstas: number }[];
    }>('/api/inicio'),
  grupos: () =>
    pedir<{
      perfilCompleto: boolean;
      grupos: {
        grupo: Grupo;
        abiertas: Lista;
        previstas: ListaPrevistas;
        artistas: Lista;
        festivales: { total: number; items: Festival[] };
        programadores: { total: number; items: Programador[] };
      }[];
    }>('/api/grupos'),
  contratos: (consulta: string) =>
    pedir<{ total: number; pagina: number; porPagina: number; items: Contrato[] }>(`/api/contratos?${consulta}`),
  contrato: (id: string) => pedir<Contrato>(`/api/contratos/${encodeURIComponent(id)}`),
  mercadoContratos: (consulta: string) => pedir<MercadoContratos>(`/api/contratos/mercado?${consulta}`),
  programadores: (consulta: string) =>
    pedir<{ total: number; pagina: number; porPagina: number; items: Programador[] }>(`/api/programadores?${consulta}`),
  programador: (id: string) => pedir<Programador>(`/api/programadores/${encodeURIComponent(id)}`),
  festivales: (consulta: string) =>
    pedir<{ total: number; pagina: number; porPagina: number; items: Festival[] }>(`/api/festivales?${consulta}`),
  festival: (id: string) => pedir<Festival>(`/api/festivales/${encodeURIComponent(id)}`),
  circuitos: () => pedir<{ items: Circuito[] }>('/api/circuitos'),
  perfil: () => pedir<Perfil>('/api/perfil'),
  guardarPerfil: (p: Perfil) => pedir<Perfil>('/api/perfil', { method: 'PUT', body: JSON.stringify(p) }),
  paraTi: () =>
    pedir<{
      perfilCompleto: boolean;
      abiertas: Coincidencia[];
      recurrentes: Coincidencia[];
      artistas: Coincidencia[];
      indirectas: Coincidencia[];
      precedentes: Coincidencia[];
    }>('/api/para-ti'),
};
