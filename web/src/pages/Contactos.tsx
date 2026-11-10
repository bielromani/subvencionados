import { Filtros } from '../components/Filtros';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { CopiarEmails } from '../components/CopiarEmails';
import { cambiarParams, enlace, type Ruta } from '../ruta';
import type { ContactoMunicipio, Meta } from '../tipos';

type Fila = ContactoMunicipio & { musica: { contratos: number; adjudicado: number; ultimo: string | null; programadorId: string } | null };

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const correo = (lista: string) => lista.split(/;\s*/).map((e, i) => (
  <span key={e}>
    {i > 0 && ' · '}
    <a href={`mailto:${e}`}>{e}</a>
  </span>
));

/** A quién llamar en cada ayuntamiento para venderle conciertos: responsables de cultura con su email y teléfono. */
export function Contactos({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  const [f, setF] = useState({ q: p.get('q') ?? '', ccaa: p.get('ccaa') ?? '', provincia: p.get('provincia') ?? '', musica: p.get('musica') ?? '', cultura: p.get('cultura') ?? '', pagina: Number(p.get('pagina')) || 1 });
  const [r, setR] = useState<{ total: number; porPagina: number; items: Fila[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consulta = new URLSearchParams(Object.entries({ ...f, pagina: String(f.pagina) }).filter(([, v]) => v && v !== '1')).toString();

  useEffect(() => {
    cambiarParams({ ...f, pagina: f.pagina > 1 ? f.pagina : undefined });
    const t = setTimeout(() => api.contactos(consulta).then(setR, (e: Error) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [consulta]);

  const paginas = r ? Math.ceil(r.total / r.porPagina) : 0;
  return (
    <section>
      <p className="ayuda">
        El contacto de cada ayuntamiento: el responsable de cultura cuando se conoce y, si no, el email y el teléfono generales. De fuentes
        oficiales y webs municipales; primero los que más música contratan. Los cargos cambian: compruébalo antes de escribir.
      </p>
      <Filtros busqueda={<input type="search" placeholder="Buscar municipio, provincia o nombre…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, pagina: 1 })} aria-label="Buscar" />}>
        
        <select value={f.ccaa} onChange={(e) => setF({ ...f, ccaa: e.target.value, pagina: 1 })} aria-label="Comunidad autónoma">
          <option value="">Toda España</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {f.provincia && (
          <button type="button" className="marca marca-activa" onClick={() => setF({ ...f, provincia: '', pagina: 1 })}>
            Provincia: {f.provincia.split(',').join(', ')} ✕
          </button>
        )}
        <label className="casilla">
          <input type="checkbox" checked={f.musica === 'si'} onChange={(e) => setF({ ...f, musica: e.target.checked ? 'si' : '', pagina: 1 })} /> Solo ayuntamientos
          que contratan música
        </label>
        <label className="casilla">
          <input type="checkbox" checked={f.cultura === 'si'} onChange={(e) => setF({ ...f, cultura: e.target.checked ? 'si' : '', pagina: 1 })} /> Solo con contacto de cultura
        </label>
      </Filtros>
      {error && <p className="error">{error}</p>}
      <CopiarEmails consulta={consulta} cargar={api.emailsContactos} />
      {r && (
        <>
          <p className="recuento">
            {r.total.toLocaleString('es-ES')} municipios · <a href={`/api/contactos.csv?${consulta}`}>Descargar en Excel (CSV)</a>
          </p>
          <ul className="filas filas-lista">
            {r.items.map((m) => (
              <li key={m.codigoIne} className="fila-convocatoria contacto-fila">
                <span className="fila-titulo">
                  {m.municipio} <span className="ayuda">· {m.provincia}</span>
                </span>
                {m.personas.slice(0, 3).map((p) => (
                  <span key={p.nombre} className="fila-detalle">
                    <strong>{p.nombre}</strong>
                    {[p.cargo, p.partido].filter(Boolean).length > 0 && ` · ${[p.cargo, p.partido].filter(Boolean).join(' · ')}`}
                  </span>
                ))}
                {m.personas.length > 3 && <span className="fila-detalle">y {m.personas.length - 3} más</span>}
                <span className="fila-detalle">
                  {(() => {
                    const email = m.cultura.email ?? m.personas.find((x) => x.email)?.email;
                    const tel = m.cultura.telefono ?? m.personas.find((x) => x.telefono)?.telefono;
                    const partes = email || tel
                      ? [email && <>Cultura: {correo(email)}</>, tel && <>☎ {tel}</>]
                      : [m.ayuntamiento.email && <>Ayuntamiento: {correo(m.ayuntamiento.email)}</>, m.ayuntamiento.telefono && <>☎ {m.ayuntamiento.telefono}</>];
                    return partes.filter(Boolean).map((x, i) => (
                      <span key={i}>
                        {i > 0 && ' · '}
                        {x}
                      </span>
                    ));
                  })()}
                </span>
                {m.musica && (
                  <span className="fila-motivos">
                    <a href={enlace('programador', m.musica.programadorId)}>
                      {m.musica.contratos} contratos de música · {euros.format(m.musica.adjudicado)}
                    </a>
                    {m.musica.ultimo && ` · último ${new Date(`${m.musica.ultimo}T00:00:00`).toLocaleDateString('es-ES')}`}
                  </span>
                )}
              </li>
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
