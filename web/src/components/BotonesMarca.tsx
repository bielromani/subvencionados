import { alternar, useMarcas } from '../marcas';

/** «Guardar» y «No me interesa» de una convocatoria. */
export function BotonesMarca({ id, compacto = false }: { id: string; compacto?: boolean }) {
  const m = useMarcas();
  const guardada = m.guardadas.includes(id);
  const oculta = m.ocultas.includes(id);
  if (compacto)
    return (
      <span className="marcas-esquina">
        <button type="button" className={`estrella${guardada ? ' estrella-activa' : ''}`} aria-pressed={guardada} aria-label={guardada ? 'Guardada: quitar' : 'Guardar'} title={guardada ? 'Guardada' : 'Guardar'} onClick={() => alternar('guardadas', id)}>
          {guardada ? '★' : '☆'}
        </button>
        <button type="button" className="estrella" aria-label="No me interesa" title="No me interesa: no volver a mostrar" onClick={() => alternar('ocultas', id)}>
          ✕
        </button>
      </span>
    );
  return (
    <span className="botones-marca">
      <button type="button" className={`marca${guardada ? ' marca-activa' : ''}`} aria-pressed={guardada} onClick={() => alternar('guardadas', id)}>
        {guardada ? '★ Guardada' : '☆ Guardar'}
      </button>
      <button type="button" className={`marca${oculta ? ' marca-activa' : ''}`} aria-pressed={oculta} onClick={() => alternar('ocultas', id)}>
        {oculta ? 'Oculta · recuperar' : 'No me interesa'}
      </button>
    </span>
  );
}
