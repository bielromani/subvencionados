import { useEffect, useState } from 'react';
import { api } from '../api';
import { Contacto } from '../components/Contacto';
import { FichaDe } from '../components/FichaConvocatoria';
import { enlaceBases, TarjetaConvocatoria } from '../components/TarjetaConvocatoria';
import { enlace } from '../ruta';
import type { Accion, Convocatoria, Serie } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : '—');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** La BDNS solo publica las concesiones de los últimos cuatro años: antes, un 0 es «sin datos». */
const PRIMER_ANIO_CONCESIONES = new Date().getFullYear() - 4;

function OtrosAnios({ serie, actual }: { serie: Serie; actual: string }) {
  const [anio, mes] = serie.proximaPrevista?.split('-').map(Number) ?? [];
  return (
    <section className="bloque">
      <h3>La misma convocatoria otros años</h3>
      <p className="ayuda">
        Convocada {serie.anios.length} años ({serie.anios[0]}–{serie.anios.at(-1)})
        {serie.mesHabitual && `, normalmente en ${MESES[serie.mesHabitual - 1]}`}.
        {anio && mes && ` Próxima prevista: ${MESES[mes - 1]} de ${anio} (estimación a partir del historial, no es un dato oficial).`}
        {serie.retrasada && ' Este año aún no se ha registrado y ya pasó su mes habitual.'}
      </p>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Año</th>
              <th>Plazo</th>
              <th className="num">Presupuesto</th>
              <th className="num">Concedido</th>
            </tr>
          </thead>
          <tbody>
            {[...serie.convocatorias].reverse().map((s) => (
              <tr key={s.id} className={s.id === actual ? 'actual' : ''}>
                <td>{s.id === actual ? s.anio : <a href={enlace('convocatoria', s.id)}>{s.anio ?? '—'}</a>}</td>
                <td>
                  {fecha(s.fechaInicioSolicitud)} – {fecha(s.fechaFinSolicitud)}
                </td>
                <td className="num">{s.presupuesto != null ? euros.format(s.presupuesto) : '—'}</td>
                <td className="num">
                  {s.concedido != null && (s.concedido > 0 || (s.anio ?? 0) >= PRIMER_ANIO_CONCESIONES)
                    ? euros.format(s.concedido)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ayuda">«—» en concedido: sin datos (la BDNS solo publica las concesiones de los últimos cuatro años).</p>
    </section>
  );
}

const urlWeb = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : u && /^www\./i.test(u) ? `https://${u}` : null);

/** Lo primero que necesita el mánager: hasta cuándo, cuánto, quién la pide y qué hacer ahora. */
function QueHacer({ c, a }: { c: Convocatoria; a: Accion }) {
  const { cuanto } = a;
  const enCalendario = a.plazo.estado === 'abierta' || a.plazo.estado === 'proxima' || (a.plazo.estado === 'cerrada' && c.serie?.proximaPrevista);
  const bases = enlaceBases(c.urlBases);
  const presentar = urlWeb(a.presentacion.url);
  return (
    <section className="bloque que-hacer">
      <h3>Qué hacer</h3>
      <p className={`plazo-grande plazo-${a.plazo.urgente ? 'urgente' : a.plazo.estado}`}>{a.plazo.texto}</p>
      {a.plazo.nota && <p className="ayuda">{a.plazo.nota}</p>}
      <dl className="datos datos-grandes">
        {cuanto.importeMaximo != null && (
          <div>
            <dt>Máximo por solicitud</dt>
            <dd>{euros.format(cuanto.importeMaximo)}</dd>
          </div>
        )}
        {cuanto.porcentajeMaximo != null && (
          <div>
            <dt>Cubre hasta</dt>
            <dd>{cuanto.porcentajeMaximo} % del coste</dd>
          </div>
        )}
        {cuanto.concedido && (
          <div>
            <dt>Suele dar{cuanto.concedido.anio ? ` (${cuanto.concedido.anio})` : ''}</dt>
            <dd>
              {euros.format(cuanto.concedido.mediana)}{' '}
              <span className="ayuda">
                entre {euros.format(cuanto.concedido.minimo)} y {euros.format(cuanto.concedido.maximo)}, {cuanto.concedido.entidades} entidades
              </span>
            </dd>
          </div>
        )}
        {cuanto.presupuesto != null && (
          <div>
            <dt>Presupuesto total</dt>
            <dd>{euros.format(cuanto.presupuesto)}</dd>
          </div>
        )}
      </dl>
      {(a.quien.length > 0 || a.quienLiteral) && (
        <div className="quien">
          <strong>Quién puede pedirla:</strong> {a.quien.join(' · ')}
          {a.quienLiteral && <p className="cita-literal">«{a.quienLiteral}»</p>}
        </div>
      )}
      <ol className="pasos">
        {a.pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      {a.presentacion.lugar && <p className="ayuda">Dónde se presenta: {a.presentacion.lugar}</p>}
      <p className="acciones">
        {enCalendario && (
          <a className="accion" href={`/api/convocatorias/${encodeURIComponent(c.id)}/calendario.ics`}>
            📅 Añadir al calendario
          </a>
        )}
        {bases && (
          <a className="accion" href={bases} target="_blank" rel="noreferrer">
            Bases ↗
          </a>
        )}
        {presentar && (
          <a className="accion" href={presentar} target="_blank" rel="noreferrer">
            Presentar solicitud ↗
          </a>
        )}
        <a className="accion" href={c.urlDetalle} target="_blank" rel="noreferrer">
          Ficha oficial BDNS ↗
        </a>
      </p>
    </section>
  );
}

export function PaginaConvocatoria({ id }: { id: string }) {
  const [c, setC] = useState<Convocatoria | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setC(null);
    setError(null);
    api.convocatoria(id).then(setC, (e: Error) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!c) return <p className="ayuda">Cargando…</p>;
  return (
    <section className="pagina">
      <p className="migas">
        <a href="#/explorar">← Convocatorias</a>
      </p>
      <TarjetaConvocatoria c={c} pagina />
      {c.accion && <QueHacer c={c} a={c.accion} />}
      {c.contacto && <Contacto c={c.contacto} />}
      {(c.ficha || c.basica) && (
        <section className="bloque">
          <h3>{c.ficha ? 'Ficha completa de las bases' : 'Ficha básica'}</h3>
          <FichaDe c={c} />
        </section>
      )}
      {c.serie && c.serie.convocatorias.length > 1 && <OtrosAnios serie={c.serie} actual={c.id} />}
    </section>
  );
}
