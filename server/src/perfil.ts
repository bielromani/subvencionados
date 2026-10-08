import { CCAA } from './regiones.js';
import { ESTILOS, type FormaJuridica, type Linea, type Perfil } from './tipos.js';

export const LINEAS: Linea[] = [
  'giras',
  'festivales',
  'produccion',
  'grabacion',
  'internacional',
  'composicion',
  'formacion',
  'equipamiento',
];
const FORMAS: FormaJuridica[] = ['autonomo', 'sociedad', 'asociacion', 'fundacion'];

export const PERFIL_POR_DEFECTO: Perfil = {
  nombre: '',
  formaJuridica: 'autonomo',
  ccaaSede: null,
  ccaaActuacion: [],
  grupos: [],
  actividades: ['giras', 'festivales', 'produccion'],
  incluirIndirectas: true,
};

/** Valida el cuerpo recibido en PUT /api/perfil. Devuelve la lista de errores o el perfil limpio. */
export function validarPerfil(entrada: unknown): { perfil: Perfil } | { errores: string[] } {
  const errores: string[] = [];
  const p = (entrada ?? {}) as Record<string, unknown>;

  const nombre = typeof p.nombre === 'string' ? p.nombre.trim() : '';
  const formaJuridica = p.formaJuridica as FormaJuridica;
  if (!FORMAS.includes(formaJuridica)) errores.push('formaJuridica no válida');

  const ccaaSede = p.ccaaSede == null || p.ccaaSede === '' ? null : String(p.ccaaSede);
  if (ccaaSede && !CCAA.includes(ccaaSede)) errores.push(`ccaaSede desconocida: ${ccaaSede}`);

  const ccaaActuacion = Array.isArray(p.ccaaActuacion) ? p.ccaaActuacion.map(String) : [];
  for (const c of ccaaActuacion) if (!CCAA.includes(c)) errores.push(`Comunidad desconocida: ${c}`);

  const grupos = Array.isArray(p.grupos) ? p.grupos : [];
  const gruposLimpios = grupos.map((g, i) => {
    const grupo = (g ?? {}) as Record<string, unknown>;
    const nombreGrupo = typeof grupo.nombre === 'string' ? grupo.nombre.trim() : '';
    if (!nombreGrupo) errores.push(`El grupo ${i + 1} no tiene nombre`);
    if (!ESTILOS.includes(grupo.estilo as never)) errores.push(`Estilo no válido en el grupo ${i + 1}`);
    const componentes = Number(grupo.componentes);
    return {
      nombre: nombreGrupo,
      estilo: grupo.estilo as Perfil['grupos'][number]['estilo'],
      ...(Number.isInteger(componentes) && componentes > 0 ? { componentes } : {}),
    };
  });

  const actividades = Array.isArray(p.actividades) ? (p.actividades as Linea[]) : [];
  for (const a of actividades) if (!LINEAS.includes(a)) errores.push(`Actividad no válida: ${a}`);

  if (errores.length > 0) return { errores };
  return {
    perfil: {
      nombre,
      formaJuridica,
      ccaaSede,
      ccaaActuacion: [...new Set(ccaaActuacion)],
      grupos: gruposLimpios,
      actividades: [...new Set(actividades)],
      incluirIndirectas: p.incluirIndirectas !== false,
    },
  };
}
