import { useEffect, useState } from 'react';
import { crm } from '../crm';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';
import type { Meta } from '../tipos';
import { Filtros } from './Filtros';

type TipoSenal = 'licitacion_abierta' | 'gestion_externalizada' | 'ciclo_por_piezas' | 'festival_propio' | 'ayuda_festivales';
interface OportunidadGestion {
  programador: string;
  nombre: string;
  ciudad: string | null;
  provincia: string | null;
  ccaa: string | null;
  puntos: number;
  abierta: boolean;
  senales: { tipo: TipoSenal; texto: string; fecha: string | null; ref: string | null; importe: number | null }[];
}

const NOMBRE_SENAL: Record<TipoSenal, string> = {
  licitacion_abierta: 'Licitación abierta',
  gestion_externalizada: 'Ya externaliza la gestión',
  ciclo_por_piezas: 'Ciclo contratado por piezas',
  festival_propio: 'Organiza un festival',
  ayuda_festivales: 'Ayuda para festivales',
};
const TONO: Record<TipoSenal, string> = { licitacion_abierta: 'exito', gestion_externalizada: 'acento', ciclo_por_piezas: 'aviso', festival_propio: 'neutro', ayuda_festivales: 'neutro' };

const enlaceSenal = (ref: string | null, tipo: TipoSenal) =>
  !ref ? null : ref.startsWith('bdns-') ? enlace('convocatoria', ref) : tipo === 'festival_propio' ? enlace('festival', ref) : enlace('contrato', ref);

/** Oportunidades de diseño, producción y gestión integral de festivales y ciclos (el modelo completo, no un concierto). */
export function GestionIntegral({ meta }: { meta: Meta }) {
  const usuario = useCuenta().cuenta?.usuario;
  const [f, setF] = useState({ q: '', ccaa: '', senal: '', pagina: 1 });
  const [r, setR] = useState<{ total: number; porPagina: number; items: OportunidadGestion[] } | null>(null);
  const [aviso, setAviso] = useState<Record<string, string>>({});
  const consulta = new URLSearchParams(Object.entries({ ...f, pagina: String(f.pagina) }).filter(([, v]) => v && v !== '1')).toString();
  useEffect(() => {
    setR(null);
    const t = setTimeout(() => void fetch(`/api/gestion-festivales?${consulta}`).then((x) => x.json()).then(setR), 200);
    return () => clearTimeout(t);
  }, [consulta]);

  const proponer = async (o: OportunidadGestion) => {
    try {
      const e = await crm.crearEntidad({ ref: o.programador });
      await crm.crearOportunidad({ entidad: e.id, tipo: 'gestion_festival', titulo: 'Diseño, producción y gestión integral de festival o ciclo', espectaculos: [] });
      window.location.hash = enlace('programador', o.programador);
    } catch (err) {
      setAviso((a) => ({ ...a, [o.programador]: (err as Error).message }));
    }
  };
  const paginas = r ? Math.ceil(r.total / r.porPagina) : 0;

  return (
    <>
      <p className="ayuda">
        Municipios y equipamientos donde ofrecer el diseño, la producción y la gestión completa de un festival o ciclo: los que ya licitan su organización, los que
        montan un ciclo contratando concierto a concierto y los que organizan festivales propios. Cada señal enlaza su fuente oficial.
      </p>
      <Filtros busqueda={<input type="search" placeholder="Buscar municipio u organismo…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, pagina: 1 })} aria-label="Buscar" />}>
        <select value={f.ccaa} onChange={(e) => setF({ ...f, ccaa: e.target.value, pagina: 1 })} aria-label="Comunidad autónoma">
          <option value="">Toda España</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={f.senal} onChange={(e) => setF({ ...f, senal: e.target.value, pagina: 1 })} aria-label="Señal">
          <option value="">Cualquier señal</option>
          {(Object.keys(NOMBRE_SENAL) as TipoSenal[]).filter((t) => t !== 'ayuda_festivales').map((t) => (
            <option key={t} value={t}>
              {NOMBRE_SENAL[t]}
            </option>
          ))}
        </select>
      </Filtros>
      {r && <p className="ayuda">{r.total.toLocaleString('es-ES')} oportunidades</p>}
      <ul className="filas bloque">
        {r?.items.map((o) => (
          <li key={o.programador} className="fila-convocatoria">
            <a className="fila-titulo" href={enlace('programador', o.programador)}>
              {o.nombre}
            </a>
            <span className="fila-detalle">{[o.ciudad, o.provincia, o.ccaa].filter(Boolean).join(' · ')}</span>
            <ul className="lista-simple">
              {o.senales.map((s, i) => {
                const url = enlaceSenal(s.ref, s.tipo);
                return (
                  <li key={i}>
                    <span className={`etiqueta etiqueta-${TONO[s.tipo]}`}>{NOMBRE_SENAL[s.tipo]}</span> {url ? <a href={url}>{s.texto}</a> : s.texto}
                  </li>
                );
              })}
            </ul>
            {usuario && (
              <button type="button" className="enlace-boton" onClick={() => void proponer(o)}>
                Proponer gestión integral →
              </button>
            )}
            {aviso[o.programador] && <p className="error">{aviso[o.programador]}</p>}
          </li>
        ))}
      </ul>
      {paginas > 1 && (
        <div className="paginacion">
          <button disabled={f.pagina <= 1} onClick={() => setF({ ...f, pagina: f.pagina - 1 })}>
            ← Anterior
          </button>
          <span>
            Página {f.pagina} de {paginas}
          </span>
          <button disabled={f.pagina >= paginas} onClick={() => setF({ ...f, pagina: f.pagina + 1 })}>
            Siguiente →
          </button>
        </div>
      )}
    </>
  );
}
