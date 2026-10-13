import { alternar, useMarcas } from '../marcas';

/** «Guardar» y «No me interesa» de una convocatoria. */
export function BotonesMarca({ id }: { id: string }) {
  const m = useMarcas();
  const guardada = m.guardadas.includes(id);
  const oculta = m.ocultas.includes(id);
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
