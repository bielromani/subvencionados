import { Filtros } from '../components/Filtros';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { aniosTexto, FilaFestival, FilaProgramador, Fuentes } from '../components/Directorio';
import { cambiarParams, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Circuito, type Festival, type Meta, type Programador } from '../tipos';

type Pestana = 'festivales' | 'programadores' | 'circuitos';

/** Dónde colocar a los grupos: festivales y ciclos, programadores públicos y circuitos, con sus fuentes. */
export function DondeTocar({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const p = ruta.params;
  // Los programadores tienen ahora su propia sección (Clientes): los enlaces antiguos llevan allí.
  if (p.get('ver') === 'programadores') window.location.hash = '#/clientes';
  const [pestana, setPestana] = useState<Pestana>(p.get('ver') === 'circuitos' ? 'circuitos' : 'festivales');
  const [filtros, setFiltros] = useState({ q: p.get('q') ?? '', ccaa: p.get('ccaa') ?? '', estilo: p.get('estilo') ?? '', orden: p.get('orden') ?? '', todos: p.get('todos') ?? '', contacto: p.get('contacto') ?? '', pagina: Number(p.get('pagina')) || 1 });
  const [r, setR] = useState<{ total: number; porPagina: number; items: (Festival | Programador)[] } | null>(null);
  const [circuitos, setCircuitos] = useState<Circuito[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consulta = new URLSearchParams(Object.entries({ ...filtros, pagina: String(filtros.pagina) }).filter(([, v]) => v && v !== '1')).toString();

  useEffect(() => {
    cambiarParams({ ver: pestana, ...filtros, pagina: filtros.pagina > 1 ? filtros.pagina : undefined });
    if (pestana === 'circuitos') {
      if (!circuitos) api.circuitos().then((x) => setCircuitos(x.items), (e: Error) => setError(e.message));
      return;
    }
    setR(null);
    const t = setTimeout(() => (pestana === 'festivales' ? api.festivales(consulta) : api.programadores(consulta)).then(setR, (e: Error) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [pestana, consulta]);

  const cambiar = (clave: keyof typeof filtros) => (e: { target: { value: string } }) => setFiltros((f) => ({ ...f, [clave]: e.target.value, pagina: 1 }));
  const paginas = r ? Math.ceil(r.total / r.porPagina) : 0;

  return (
    <section>
      <div className="pestanas-grupos" role="tablist">
        {(
          [
            ['festivales', 'Festivales y ciclos'],
            ['circuitos', 'Circuitos'],
          ] as [Pestana, string][]
        ).map(([id, nombre]) => (
          <button key={id} role="tab" aria-selected={id === pestana} className={id === pestana ? 'activa' : ''} onClick={() => setPestana(id)}>
            {nombre}
          </button>
        ))}
      </div>
      <p className="ayuda">
        {pestana === 'festivales' &&
          'Festivales y ciclos que aparecen en contratos públicos y subvenciones: dónde son, desde cuándo hay datos y quién los organiza o financia. Cada ficha enlaza sus fuentes.'}
        {pestana === 'programadores' &&
          'Ayuntamientos, diputaciones, teatros y otros organismos que contratan música en vivo: cuántos contratos, a qué precio habitual y en qué meses.'}
        {pestana === 'circuitos' &&
          'Redes públicas de programación que aparecen en los contratos y convocatorias. La lista de circuitos es nuestra; lo que se muestra de cada uno son sus apariciones en los datos oficiales.'}
      </p>

      {pestana !== 'circuitos' && (
        <Filtros busqueda={<input type="search" placeholder="Buscar por nombre, ciudad u organizador…" value={filtros.q} onChange={cambiar('q')} aria-label="Buscar" />}>
          
          <select value={filtros.ccaa} onChange={cambiar('ccaa')} aria-label="Comunidad">
            <option value="">Todas las comunidades</option>
            {meta.ccaa.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={filtros.estilo} onChange={cambiar('estilo')} aria-label="Estilo">
            <option value="">Cualquier estilo</option>
            {meta.estilos.map((e) => (
              <option key={e} value={e}>
                {NOMBRE_ESTILO[e]}
              </option>
            ))}
          </select>
          <select value={filtros.orden} onChange={cambiar('orden')} aria-label="Orden">
            <option value="">{pestana === 'festivales' ? 'Más años con datos' : 'Más contratos'}</option>
            <option value="reciente">Más recientes</option>
            <option value={pestana === 'festivales' ? 'dinero' : 'adjudicado'}>Más dinero</option>
          </select>
          {pestana === 'festivales' && (
            <label className="casilla">
              <input type="checkbox" checked={filtros.todos === 'true'} onChange={(e) => setFiltros((f) => ({ ...f, todos: e.target.checked ? 'true' : '', pagina: 1 }))} /> Incluir
              multidisciplinares y de fiestas
            </label>
          )}
          {pestana === 'programadores' && (
            <label className="casilla">
              <input type="checkbox" checked={filtros.contacto === 'si'} onChange={(e) => setFiltros((f) => ({ ...f, contacto: e.target.checked ? 'si' : '', pagina: 1 }))} /> Solo
              con contacto de cultura
            </label>
          )}
        </Filtros>
      )}
      {error && <p className="error">{error}</p>}

      {pestana !== 'circuitos' && r && (
        <>
          <p className="ayuda">{r.total.toLocaleString('es-ES')} resultados</p>
          <ul className="filas bloque">
            {r.items.map((x) => (pestana === 'festivales' ? <FilaFestival key={x.id} f={x as Festival} /> : <FilaProgramador key={x.id} p={x as Programador} />))}
          </ul>
          {paginas > 1 && (
            <div className="paginacion">
              <button disabled={filtros.pagina <= 1} onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina - 1 }))}>
                ← Anterior
              </button>
              <span>
                Página {filtros.pagina} de {paginas}
              </span>
              <button disabled={filtros.pagina >= paginas} onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina + 1 }))}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {pestana === 'circuitos' &&
        circuitos?.map((c) => (
          <section className="bloque" key={c.id}>
            <h3>
              {c.nombre} <span className="contador">{c.menciones}</span>
            </h3>
            <p className="ayuda">
              Ámbito: {c.ambito} · Datos: {aniosTexto(c.anios)} · Organismos: {c.organismos.slice(0, 3).map((o) => o.nombre).join(' · ')}
            </p>
            <details className="concesiones">
              <summary>Ver las {Math.min(c.fuentes.length, 20)} apariciones más recientes</summary>
              <Fuentes fuentes={c.fuentes} />
            </details>
          </section>
        ))}
    </section>
  );
}
