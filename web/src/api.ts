import type { Coincidencia, Convocatoria, Meta, Perfil } from './tipos';

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
  todas?: boolean;
}

export const api = {
  meta: () => pedir<Meta>('/api/meta'),
  convocatorias: (f: Filtros) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) params.set(k, String(v));
    return pedir<{ total: number; items: Convocatoria[] }>(`/api/convocatorias?${params}`);
  },
  perfil: () => pedir<Perfil>('/api/perfil'),
  guardarPerfil: (p: Perfil) => pedir<Perfil>('/api/perfil', { method: 'PUT', body: JSON.stringify(p) }),
  paraTi: () => pedir<{ perfilCompleto: boolean; items: Coincidencia[] }>('/api/para-ti'),
};
