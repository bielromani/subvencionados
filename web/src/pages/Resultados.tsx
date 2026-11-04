import { useEffect, useState } from 'react';
import { crm, type Estadisticas, NOMBRE_TIPO } from '../crm';
import { useCuenta } from '../sincronizar';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const fechaSemana = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
/** Por debajo de esto, un porcentaje dice poco: se avisa. */
const POCOS = 10;

/** Barra horizontal con su valor: una sola serie, sin leyenda. */
function FilaBarra({ etiqueta, valor, max, detalle }: { etiqueta: string; valor: number; max: number; detalle?: string }) {
  return (
    <li className="fila-barra">
      <span className="fila-barra-etiqueta">{etiqueta}</span>
      <span className="fila-barra-pista" aria-hidden="true">
        <span style={{ width: `${max ? Math.max((valor / max) * 100, valor ? 2 : 0) : 0}%` }} />
      </span>
      <span className="fila-barra-valor">
        <strong>{valor.toLocaleString('es-ES')}</strong>
        {detalle && <span>{detalle}</span>}
      </span>
    </li>
  );
}

/** Columnas verticales (una serie) con el valor encima de las que no son cero y la tabla para leerlo sin gráfico. */
function Columnas({ datos, titulo }: { datos: { etiqueta: string; valor: number; ayuda?: string }[]; titulo: string }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <>
      <div className="columnas-res" role="img" aria-label={`${titulo}: ${datos.map((d) => `${d.etiqueta} ${d.valor}`).join(', ')}`}>
        {datos.map((d) => (
          <div key={d.etiqueta} className="columna-res" title={`${d.etiqueta}: ${d.valor}${d.ayuda ? ` · ${d.ayuda}` : ''}`}>
            <span className="columna-res-valor">{d.valor > 0 ? d.valor : ''}</span>
            <span className="columna-res-barra" style={{ height: `${(d.valor / max) * 100}%` }} />
            <span className="columna-res-etiqueta">{d.etiqueta}</span>
          </div>
        ))}
      </div>
      <details className="ver-tabla">
        <summary>Ver los datos en tabla</summary>
        <table className="tabla">
          <tbody>
            {datos.map((d) => (
              <tr key={d.etiqueta}>
                <td>{d.etiqueta}</td>
                <td className="num">{d.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

/** Tasa de respuesta por grupo (línea del catálogo, comunidad): contactadas, respuestas y porcentaje. */
function TablaTasa({ filas, nombre }: { filas: { nombre: string; contactadas: number; respuesta: number }[]; nombre: string }) {
  if (!filas.length) return <p className="vacio-suave">Aún sin datos.</p>;
  return (
    <div className="tabla-scroll">
      <table className="tabla tabla-tasa">
        <thead>
          <tr>
            <th>{nombre}</th>
            <th className="num">Contactados</th>
            <th className="num">Responden</th>
            <th>Tasa de respuesta</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre}>
              <td>{f.nombre}</td>
              <td className="num">{f.contactadas}</td>
              <td className="num">{f.respuesta}</td>
              <td>
                <span className="tasa">
                  <span className="fila-barra-pista" aria-hidden="true">
                    <span style={{ width: `${pct(f.respuesta, f.contactadas)}%` }} />
                  </span>
                  <span>
                    {pct(f.respuesta, f.contactadas)} %{f.contactadas < 5 && <span className="ayuda"> · pocos</span>}
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Resultados: qué funciona en la prospección, con lo registrado en la app (envíos confirmados y respuestas anotadas). */
export function Resultados() {
  const usuario = useCuenta().cuenta?.usuario;
  const [e, setE] = useState<Estadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (usuario) crm.estadisticas().then(setE, (x: Error) => setError(x.message));
  }, [usuario?.email]);
  if (!usuario) return <p className="llamada">Los resultados son de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;
  if (error) return <p className="error">{error}</p>;
  if (!e) return <p className="ayuda">Cargando…</p>;

  const ent = e.entidades;
  const tasa = pct(ent.respuesta, ent.contactadas);
  const embudo: [string, number, string][] = [
    ['Propuestas preparadas', e.propuestas.total, 'correos escritos por la app'],
    ['Aceptadas', e.propuestas.aceptadas, `${e.propuestas.descartadas} descartadas`],
    ['Sitios contactados', ent.contactadas, 'con al menos un correo enviado'],
    ['Han respondido', ent.respuesta, `${pct(ent.respuesta, ent.contactadas)} % de los contactados`],
    ['Reunión o interés', ent.reunion, `${pct(ent.reunion, ent.contactadas)} %`],
    ['Interesados', ent.interesadas, `${pct(ent.interesadas, ent.contactadas)} %`],
  ];
  const maxEmbudo = Math.max(1, ...embudo.map(([, v]) => v));

  if (ent.contactadas === 0)
    return (
      <div className="bloque vacio">
        <h2>Aún no hay resultados</h2>
        <p className="ayuda">
          Aparecen en cuanto envíes los primeros correos desde <a href="#/propuestas">Propuestas</a> (pulsando «Ya lo he enviado») y anotes las respuestas en la ficha de cada entidad.
        </p>
      </div>
    );

  return (
    <div className="resultados">
      <section className="kpis" aria-label="Resumen">
        <div className="kpi">
          <span className="kpi-titulo">Sitios contactados</span>
          <strong>{ent.contactadas}</strong>
          <span className="kpi-pie">{e.actividad.correos} correos enviados</span>
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Tasa de respuesta</span>
          <strong>{tasa} %</strong>
          <span className="kpi-pie">{ent.contactadas < POCOS ? 'Aún pocos datos para sacar conclusiones' : `${ent.respuesta} de ${ent.contactadas} han respondido`}</span>
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Reuniones o interés</span>
          <strong>{ent.reunion}</strong>
          <span className="kpi-pie tono-verde">{ent.interesadas} interesados</span>
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Días hasta la respuesta</span>
          <strong>{e.diasHastaRespuesta != null ? e.diasHastaRespuesta.toLocaleString('es-ES') : '—'}</strong>
          <span className="kpi-pie">{e.respuestasConFecha ? `mediana de ${e.respuestasConFecha} respuestas` : 'Sin respuestas anotadas'}</span>
        </div>
      </section>

      <div className="rejilla-res">
        <section className="bloque" aria-labelledby="r-embudo">
          <h2 id="r-embudo" className="titulo-res">
            Del correo al concierto
          </h2>
          <ul className="barras-res">
            {embudo.map(([t, v, d]) => (
              <FilaBarra key={t} etiqueta={t} valor={v} max={maxEmbudo} detalle={d} />
            ))}
          </ul>
          <p className="ayuda nota-res">
            {ent.sinRespuesta} sin respuesta tras los cinco correos · {ent.noInteresadas} no interesados · {ent.noContactar} piden no recibir más correos.
          </p>
        </section>

        <section className="bloque" aria-labelledby="r-paso">
          <h2 id="r-paso" className="titulo-res">
            En qué correo responden
          </h2>
          <Columnas titulo="Respuestas por correo de la secuencia" datos={e.porPaso.map((x) => ({ etiqueta: `${x.paso}.º`, valor: x.respuestas }))} />
          <p className="ayuda nota-res">Si muchas respuestas llegan en el 2.º o el 3.º correo, los seguimientos están funcionando.</p>
        </section>
      </div>

      <section className="bloque" aria-labelledby="r-semanas">
        <h2 id="r-semanas" className="titulo-res">
          Correos enviados por semana
        </h2>
        <p className="ayuda nota-res">
          Últimas 12 semanas · {e.semanas.reduce((t, s) => t + s.respuestas, 0)} respuestas y {e.semanas.reduce((t, s) => t + s.llamadas, 0)} llamadas anotadas en ese tiempo.
        </p>
        <Columnas
          titulo="Correos enviados por semana"
          datos={e.semanas.map((s) => ({ etiqueta: fechaSemana(s.semana), valor: s.correos, ayuda: `${s.respuestas} respuestas, ${s.llamadas} llamadas` }))}
        />
      </section>

      <div className="rejilla-res">
        <section className="bloque" aria-labelledby="r-lineas">
          <h2 id="r-lineas" className="titulo-res">
            Qué propuestas responden más
          </h2>
          <TablaTasa nombre="Tipo de propuesta" filas={e.porTipo.map((x) => ({ nombre: NOMBRE_TIPO[x.tipo].charAt(0).toUpperCase() + NOMBRE_TIPO[x.tipo].slice(1), contactadas: x.contactadas, respuesta: x.respuesta }))} />
        </section>
        <section className="bloque" aria-labelledby="r-ccaa">
          <h2 id="r-ccaa" className="titulo-res">
            Dónde responden más
          </h2>
          <TablaTasa nombre="Comunidad" filas={e.porCcaa.map((x) => ({ nombre: x.ccaa, contactadas: x.contactadas, respuesta: x.respuesta }))} />
        </section>
      </div>
      <p className="nota-fuente">
        Cuenta lo registrado en la app: los correos marcados como enviados y las respuestas, llamadas y reuniones anotadas en la ficha de cada entidad. Una respuesta que no se anota no aparece.
      </p>
    </div>
  );
}
