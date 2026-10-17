import { useEffect, useState } from 'react';
import { api } from '../api';
import { FilaContrato } from '../components/FilaContrato';
import { Etiqueta } from '../components/TarjetaConvocatoria';
import { cambiarParams, enlace, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Contrato, type EventoCalendario, type Meta } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const nombreMes = (aaaamm: string) =>
  new Date(`${aaaamm}-01T00:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
const dia = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });

const TIPO: Record<EventoCalendario['tipo'], [string, string]> = {
  abre: ['Abre', 'exito'],
  cierra: ['Cierra', 'aviso'],
  prevista: ['Prevista', 'apagado'],
};

export function Calendario({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const [filtros, setFiltros] = useState({
    estilo: ruta.params.get('estilo') ?? '',
    ccaa: ruta.params.get('ccaa') ?? '',
  });
  const [eventos, setEventos] = useState<EventoCalendario[] | null>(null);
  const [licitaciones, setLicitaciones] = useState<Contrato[]>([]);
  const [error, setError] = useState<string | null>(null);
  const consulta = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();

  useEffect(() => {
    cambiarParams(filtros);
    api.calendario(consulta).then((r) => {
      setEventos(r.eventos);
      setLicitaciones(r.licitaciones ?? []);
    }, (e: Error) => setError(e.message));
  }, [consulta]);

  const porMes = new Map<string, EventoCalendario[]>();
  for (const e of eventos ?? []) porMes.set(e.fecha.slice(0, 7), [...(porMes.get(e.fecha.slice(0, 7)) ?? []), e]);

  return (
    <section>
      <p className="ayuda">
        Cuándo abren y cierran los concursos que se pueden pedir, y cuándo se espera la próxima edición de los que se
        repiten cada año. Las previstas son una estimación a partir de los años anteriores, no un dato oficial.
      </p>
      <div className="filtros">
        <select value={filtros.estilo} onChange={(e) => setFiltros((f) => ({ ...f, estilo: e.target.value }))} aria-label="Estilo">
          <option value="">Jazz, clásica y ópera</option>
          {meta.estilos.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_ESTILO[e]}
            </option>
          ))}
        </select>
        <select value={filtros.ccaa} onChange={(e) => setFiltros((f) => ({ ...f, ccaa: e.target.value }))} aria-label="Comunidad">
          <option value="">Todas las comunidades</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <a className="boton" href={`/api/calendario.ics?${consulta}`} download>
          Añadir a mi calendario (.ics)
        </a>
      </div>
      {error && <p className="error">{error}</p>}
      {licitaciones.length > 0 && (
        <section className="bloque">
          <h3>
            Contratos públicos de conciertos con plazo abierto <span className="contador">{licitaciones.length}</span>
          </h3>
          <ul className="filas">
            {licitaciones.map((c) => (
              <FilaContrato key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}
      {eventos && eventos.length === 0 && <p className="ayuda">No hay nada previsto con estos filtros.</p>}
      {[...porMes].map(([mes, lista]) => (
        <section className="bloque" key={mes}>
          <h3 className="mes">{nombreMes(mes)}</h3>
          <ul className="eventos">
            {lista.map((e) => (
              <li key={`${e.tipo}-${e.convocatoria.id}`}>
                <span className="evento-dia">{e.tipo === 'prevista' ? '—' : dia(e.fecha)}</span>
                <span>
                  <Etiqueta tono={TIPO[e.tipo][1]}>{TIPO[e.tipo][0]}</Etiqueta>

                  <a href={enlace('convocatoria', e.convocatoria.id)}>{e.convocatoria.tituloCorto ?? e.convocatoria.titulo}</a>
                  {e.tipo === 'prevista' && e.convocatoria.anio && <span className="ayuda"> (última: {e.convocatoria.anio})</span>}
                  <span className="evento-detalle">
                    <a href={enlace('organismo', e.convocatoria.organismoId)}>{e.convocatoria.organo}</a> · {e.convocatoria.ambito}
                    {e.convocatoria.presupuesto != null && ` · ${euros.format(e.convocatoria.presupuesto)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
