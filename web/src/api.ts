import type { Circuito, Coincidencia, ContactoMunicipio, Contrato, Festival, Programador, Convocatoria, EventoCalendario, Grupo, Mercado, MercadoContratos, Meta, Organismo, Perfil } from './tipos';

export interface Lista {
  total: number;
  items: Coincidencia[];
}
export interface ListaPrevistas {
  total: number;
  items: (Coincidencia & { prevista: string })[];
}

// El perfil vive en el navegador: se manda en cada petición para que el servidor no tenga que guardarlo.
const CLAVE_PERFIL = 'subvencionados:perfil';
function perfilGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_PERFIL);
  } catch {
    return null;
  }
}
function guardarEnNavegador(p: Perfil) {
  try {
    localStorage.setItem(CLAVE_PERFIL, JSON.stringify(p));
  } catch {
    // Sin almacenamiento (modo privado): el perfil dura lo que la sesión del servidor local.
  }
}
const base64 = (texto: string) => btoa(String.fromCharCode(...new TextEncoder().encode(texto)));

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const perfil = perfilGuardado();
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(perfil ? { 'X-Perfil': base64(perfil) } : {}), ...init?.headers },
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
  /** grupos | programadores */
  para?: string;
  /** Incluir también lo que no le sirve al mánager. */
  todas?: boolean;
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
      para: Record<'grupos' | 'programadores', { ahora: Lista; previstas: ListaPrevistas }>;
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
  guardarPerfil: async (p: Perfil) => {
    const validado = await pedir<Perfil>('/api/perfil', { method: 'PUT', body: JSON.stringify(p) });
    guardarEnNavegador(validado);
    return validado;
  },
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
