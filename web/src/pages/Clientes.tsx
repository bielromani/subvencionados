import { useEffect, useState } from 'react';
import { api } from '../api';
import { FilaCliente } from '../components/Cliente';
import { cambiarParams, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Estilo, type Meta, type Programador } from '../tipos';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Quien contrata música en directo (ayuntamientos, diputaciones, teatros...), con a quién llamar y cuándo. */
export function Clientes({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  const [f, setF] = useState({
    q: p.get('q') ?? '',
    ccaa: p.get('ccaa') ?? '',
    estilo: p.get('estilo') ?? '',
    mes: p.get('mes') ?? '',
    contacto: p.get('contacto') ?? '',
    orden: p.get('orden') ?? '',
    pagina: Number(p.get('pagina')) || 1,
  });
  const [r, setR] = useState<{ total: number; porPagina: number; items: Programador[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consulta = new URLSearchParams(Object.entries({ ...f, pagina: String(f.pagina) }).filter(([, v]) => v && v !== '1')).toString();
  const cambiar = (clave: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [clave]: e.target.value, pagina: 1 });

  useEffect(() => {
    cambiarParams({ ...f, pagina: f.pagina > 1 ? f.pagina : undefined });
    setR(null);
    const t = setTimeout(() => api.programadores(consulta).then(setR, (e: Error) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [consulta]);

  const paginas = r ? Math.ceil(r.total / r.porPagina) : 0;
  return (
    <section>
      <p className="ayuda">
        Ayuntamientos, diputaciones, teatros y festivales públicos que contratan música en directo: cuántos conciertos contratan, cuánto suelen
        pagar, en qué meses y a quién llamar. Sale de los contratos públicos de los últimos años.
      </p>
      <div className="filtros">
        <input type="search" placeholder="Buscar: Sevilla, auditorio, diputación…" value={f.q} onChange={cambiar('q')} aria-label="Buscar" />
        <select value={f.ccaa} onChange={cambiar('ccaa')} aria-label="Comunidad autónoma">
          <option value="">Toda España</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={f.estilo} onChange={cambiar('estilo')} aria-label="Estilo">
          <option value="">Cualquier estilo</option>
          {meta.estilos.map((e: Estilo) => (
            <option key={e} value={e}>
              Contrata {NOMBRE_ESTILO[e].toLowerCase()}
            </option>
          ))}
        </select>
        <select value={f.mes} onChange={cambiar('mes')} aria-label="Mes">
          <option value="">Cualquier mes</option>
          {f.mes.includes(',') && <option value={f.mes}>Suele contratar en {f.mes.split(',').map((m) => MESES[Number(m) - 1]).join(' o ')}</option>}
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              Suele contratar en {m}
            </option>
          ))}
        </select>
        <select value={f.orden} onChange={cambiar('orden')} aria-label="Orden">
          <option value="">Más conciertos contratados</option>
          <option value="adjudicado">Más dinero en música</option>
          <option value="reciente">Contratación más reciente</option>
        </select>
        <label className="casilla">
          <input type="checkbox" checked={f.contacto === 'si'} onChange={(e) => setF({ ...f, contacto: e.target.checked ? 'si' : '', pagina: 1 })} /> Solo con contacto
          directo de cultura
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {!r && <p className="ayuda">Cargando…</p>}
      {r && (
        <>
          <p className="recuento">
            {r.total.toLocaleString('es-ES')} clientes · <a href="#/contactos">Directorio completo de responsables de cultura</a>
          </p>
          <ul className="filas filas-lista">
            {r.items.map((x) => (
              <FilaCliente key={x.id} p={x} estilo={(f.estilo || undefined) as Estilo | undefined} />
            ))}
          </ul>
          {paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas">
              <button className="boton-secundario" disabled={f.pagina <= 1} onClick={() => setF({ ...f, pagina: f.pagina - 1 })}>
                ← Anterior
              </button>
              <span>
                Página {f.pagina} de {paginas}
              </span>
              <button className="boton-secundario" disabled={f.pagina >= paginas} onClick={() => setF({ ...f, pagina: f.pagina + 1 })}>
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
