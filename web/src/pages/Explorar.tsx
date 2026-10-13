import { useEffect, useState } from 'react';
import { api, type Filtros } from '../api';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { cambiarParams, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Convocatoria, type Meta } from '../tipos';

interface Resultado {
  total: number;
  pagina: number;
  porPagina: number;
  items: Convocatoria[];
}

const POR_DEFECTO: Filtros = { plazo: 'vigentes', orden: 'cierre' };

/** Los filtros van en la dirección (#/explorar?estilo=jazz&ccaa=…) para poder guardarlos o compartirlos. */
function desdeRuta(ruta: Ruta): Filtros {
  if (ruta.params.size === 0) return POR_DEFECTO;
  const f: Record<string, string | number | boolean> = Object.fromEntries(ruta.params);
  if (f.pagina) f.pagina = Number(f.pagina);
  if (f.todas) f.todas = f.todas === 'true';
  return f as Filtros;
}

export function Explorar({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const [filtros, setFiltros] = useState<Filtros>(() => desdeRuta(ruta));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sin filtros también hay que dejarlo en la dirección, para no volver a los de por defecto al recargar.
    cambiarParams(Object.values(filtros).some(Boolean) ? { ...filtros } : { todo: 1 });
    // Pequeña espera para no lanzar una petición por cada tecla del buscador.
    const t = setTimeout(() => {
      api.convocatorias(filtros).then(setResultado, (e: Error) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [filtros]);

  // Cualquier cambio de filtro vuelve a la primera página.
  const cambiar = (clave: keyof Filtros) => (e: { target: { value: string } }) =>
    setFiltros((f) => ({ ...f, [clave]: e.target.value || undefined, pagina: undefined }));
  const irA = (pagina: number) => {
    setFiltros((f) => ({ ...f, pagina }));
    window.scrollTo({ top: 0 });
  };
  const paginas = resultado ? Math.ceil(resultado.total / resultado.porPagina) : 0;

  return (
    <section>
      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar: festival, gira, orquesta, Sevilla…"
          value={filtros.q ?? ''}
          onChange={cambiar('q')}
          aria-label="Buscar"
        />
        <select value={filtros.para ?? ''} onChange={cambiar('para')} aria-label="Para quién">
          <option value="">Para tus grupos y para quien te contrata</option>
          <option value="grupos">Para tus grupos (las piden ellos)</option>
          <option value="programadores">Para quien te contrata (ayuntamientos, festivales, salas)</option>
        </select>
        <select value={filtros.plazo ?? ''} onChange={cambiar('plazo')} aria-label="Plazo">
          <option value="vigentes">Abiertas o a punto de abrir</option>
          <option value="cerrada">Cerradas (para preparar la próxima edición)</option>
          <option value="">Todas</option>
        </select>
        <select value={filtros.estilo ?? ''} onChange={cambiar('estilo')} aria-label="Estilo">
          <option value="">Todos los estilos</option>
          {meta.estilos.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_ESTILO[e]}
            </option>
          ))}
        </select>
        <select value={filtros.ccaa ?? ''} onChange={cambiar('ccaa')} aria-label="Comunidad autónoma">
          <option value="">Toda España</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={filtros.orden ?? ''} onChange={cambiar('orden')} aria-label="Orden">
          <option value="cierre">Las que cierran antes primero</option>
          <option value="">Más recientes primero</option>
        </select>
        <label className="casilla">
          <input
            type="checkbox"
            checked={!!filtros.todas}
            onChange={(e) => setFiltros((f) => ({ ...f, todas: e.target.checked || undefined, pagina: undefined }))}
          />
          Ver también lo descartado (becas, fiestas, asociaciones locales…) con el motivo
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {resultado && (
        <>
          <p className="recuento">
            {resultado.total.toLocaleString('es-ES')} {resultado.total === 1 ? 'convocatoria' : 'convocatorias'}
          </p>
          <ul className="filas filas-lista">
            {resultado.items.map((c) => (
              <FilaConvocatoria key={c.id} m={{ convocatoria: c, plazo: c.plazo, puntuacion: 0, encaje: 'directo', motivos: [], avisos: c.clasificacion.descarte ? [c.clasificacion.descarte] : [] }} destino motivos={!!filtros.todas} />
            ))}
          </ul>
          {paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas">
              <button className="boton-secundario" disabled={resultado.pagina <= 1} onClick={() => irA(resultado.pagina - 1)}>
                ← Anterior
              </button>
              <span>
                Página {resultado.pagina} de {paginas}
              </span>
              <button
                className="boton-secundario"
                disabled={resultado.pagina >= paginas}
                onClick={() => irA(resultado.pagina + 1)}
              >
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
