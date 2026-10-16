import { useEffect, useState } from 'react';
import { api } from '../api';
import { Contacto } from '../components/Contacto';
import { FichaDe } from '../components/FichaConvocatoria';
import { TarjetaConvocatoria } from '../components/TarjetaConvocatoria';
import { enlace } from '../ruta';
import type { Convocatoria, Serie } from '../tipos';

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
