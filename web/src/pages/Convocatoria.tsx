import { EncajeCatalogo } from '../components/EncajeCatalogo';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Contacto } from '../components/Contacto';
import { FichaDe } from '../components/FichaConvocatoria';
import { BotonesMarca } from '../components/BotonesMarca';
import { enlaceBases } from '../components/TarjetaConvocatoria';
import { enlace } from '../ruta';
import { NOMBRE_ADMINISTRACION, NOMBRE_DESTINO, NOMBRE_ESTILO, NOMBRE_LINEA, type Accion, type Convocatoria, type Serie } from '../tipos';

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

const ambito = (c: Convocatoria) => (c.ambitoNacional ? 'Toda España' : c.provincias.length ? c.provincias.join(', ') : c.ccaa.length ? c.ccaa.join(', ') : 'Ámbito no indicado');
const TONO_PLAZO: Record<string, string> = { abierta: 'tono-verde', proxima: 'tono-azul', cerrada: '', desconocido: '' };

/** Cabecera de la ficha: qué es, quién la da, los datos clave y las acciones. */
function Cabecera({ c }: { c: Convocatoria }) {
  const a = c.accion;
  const cl = c.clasificacion;
  const organo = c.organoNiveles.slice(1).join(' · ') || c.organo;
  const bases = enlaceBases(c.urlBases);
  const presentar = a ? urlWeb(a.presentacion.url) : null;
  const enCalendario = a && (a.plazo.estado === 'abierta' || a.plazo.estado === 'proxima' || (a.plazo.estado === 'cerrada' && c.serie?.proximaPrevista));
  const cuanto = a?.cuanto;
  return (
    <header className="ficha-cabecera">
      <p className="migas">
        <a href="#/explorar">Ayudas</a> / {c.codigoBdns}
      </p>
      <span className="etiquetas">
        {c.tipo === 'directa' && <span className="etiqueta etiqueta-aviso">Concesión directa</span>}
        {cl.destino ? (
          <span className={`etiqueta${cl.destino === 'grupos' ? ' etiqueta-acento' : ''}`}>{NOMBRE_DESTINO[cl.destino]}</span>
        ) : (
          <span className="etiqueta">No encaja: {cl.descarte?.toLowerCase()}</span>
        )}
        <span className="etiqueta">{NOMBRE_ADMINISTRACION[c.administracion]}</span>
        <span className="etiqueta">{ambito(c)}</span>
      </span>
      <h1>{c.tituloCorto ?? c.titulo}</h1>
      {c.tituloCorto && c.tituloCorto !== c.titulo && <p className="titulo-oficial">{c.titulo}</p>}
      <p className="ficha-organo">
        <a href={enlace('organismo', c.organismoId)}>{organo}</a>
        {c.ubicacion?.municipio ? ` · ${c.ubicacion.municipio}` : c.ubicacion?.provincia ? ` · ${c.ubicacion.provincia}` : ''}
      </p>
      <div className="ficha-acciones">
        {presentar && (
          <a className="boton" href={presentar} target="_blank" rel="noreferrer">
            Presentar solicitud ↗
          </a>
        )}
        {bases && (
          <a className={presentar ? 'accion' : 'boton'} href={bases} target="_blank" rel="noreferrer">
            Bases ↗
          </a>
        )}
        {enCalendario && (
          <a className="accion" href={`/api/convocatorias/${encodeURIComponent(c.id)}/calendario.ics`}>
            Añadir al calendario
          </a>
        )}
        <a className="accion" href={c.urlDetalle} target="_blank" rel="noreferrer">
          Ficha oficial BDNS ↗
        </a>
        <BotonesMarca id={c.id} />
      </div>
      <dl className="hechos">
        {a && (
          <div className="hecho-principal">
            <dt>Plazo</dt>
            <dd className={a.plazo.urgente ? 'tono-ambar' : TONO_PLAZO[a.plazo.estado]}>{a.plazo.texto}</dd>
            {a.plazo.nota && <span className="ayuda">{a.plazo.nota}</span>}
          </div>
        )}
        {cuanto?.importeMaximo != null && (
          <div>
            <dt>Máximo por solicitud</dt>
            <dd>{euros.format(cuanto.importeMaximo)}</dd>
          </div>
        )}
        {cuanto?.porcentajeMaximo != null && (
          <div>
            <dt>Cubre hasta</dt>
            <dd>{cuanto.porcentajeMaximo} % del coste</dd>
          </div>
        )}
        {cuanto?.concedido && (
          <div>
            <dt>Suele dar{cuanto.concedido.anio ? ` (${cuanto.concedido.anio})` : ''}</dt>
            <dd>{euros.format(cuanto.concedido.mediana)}</dd>
            <span className="ayuda">
              entre {euros.format(cuanto.concedido.minimo)} y {euros.format(cuanto.concedido.maximo)}
            </span>
          </div>
        )}
        {c.presupuesto != null && (
          <div>
            <dt>Presupuesto total</dt>
            <dd>{euros.format(c.presupuesto)}</dd>
          </div>
        )}
      </dl>
    </header>
  );
}

/** Qué hacer: quién puede pedirla y los pasos. */
function QueHacer({ a }: { a: Accion }) {
  if (!a.quien.length && !a.quienLiteral && !a.pasos.length) return null;
  return (
    <section className="bloque que-hacer">
      <h3>Qué hacer</h3>
      {(a.quien.length > 0 || a.quienLiteral) && (
        <div className="quien">
          <strong>Quién puede pedirla:</strong> {a.quien.join(' · ')}
          {a.quienLiteral && <p className="cita-literal">«{a.quienLiteral}»</p>}
        </div>
      )}
      <ol className="pasos-numerados">
        {a.pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      {a.presentacion.lugar && <p className="ayuda">Dónde se presenta: {a.presentacion.lugar}</p>}
    </section>
  );
}

/** Lo que financia y para qué estilos, y lo ya concedido. */
function Resumen({ c }: { c: Convocatoria }) {
  const cl = c.clasificacion;
  const fechaCorta = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES') : null);
  return (
    <section className="bloque">
      <h3>En resumen</h3>
      <dl className="lista-datos">
        {cl.musical && (
          <div>
            <dt>Estilos</dt>
            <dd>{cl.estilosCompatibles.length === 0 ? `Otros géneros (${cl.otrosGeneros.join(', ')})` : cl.estilosCompatibles.map((e) => NOMBRE_ESTILO[e]).join(' · ')}</dd>
          </div>
        )}
        {cl.lineas.length > 0 && (
          <div>
            <dt>Financia</dt>
            <dd>{cl.lineas.map((l) => NOMBRE_LINEA[l]).join(' · ')}</dd>
          </div>
        )}
        {c.fechaPublicacion && (
          <div>
            <dt>Registrada</dt>
            <dd>{fechaCorta(c.fechaPublicacion)}</dd>
          </div>
        )}
        {c.tipo === 'concurrencia' && (c.fechaInicioSolicitud || c.textoInicio) && (
          <div>
            <dt>Solicitudes desde</dt>
            <dd>{fechaCorta(c.fechaInicioSolicitud) ?? c.textoInicio}</dd>
          </div>
        )}
        {c.tipo === 'concurrencia' && (c.fechaFinSolicitud || c.textoFin) && (
          <div>
            <dt>Solicitudes hasta</dt>
            <dd>{fechaCorta(c.fechaFinSolicitud) ?? c.textoFin}</dd>
          </div>
        )}
      </dl>
      {c.concesiones && c.concesiones.numero > 0 && (
        <details className="concesiones">
          <summary>
            Concedido: {euros.format(c.concesiones.importeTotal)} en {c.concesiones.numero} {c.concesiones.numero === 1 ? 'concesión' : 'concesiones'}
          </summary>
          <ul>
            {c.concesiones.entidades.map((e, i) => (
              <li key={i}>
                {e.nombre} · {euros.format(e.importe)}
                {e.fecha && ` · ${fechaCorta(e.fecha)}`}
              </li>
            ))}
            {c.concesiones.entidades.length < c.concesiones.numero && <li className="ayuda">{c.concesiones.numero - c.concesiones.entidades.length} a personas físicas (no se muestran)</li>}
          </ul>
        </details>
      )}
      {cl.destino === 'programadores' && cl.beneficiarios.entidadesLocales && c.provincias.length > 0 && (
        <p className="llamada">
          La cobran los ayuntamientos: <a href={`#/contactos?provincia=${encodeURIComponent(c.provincias.join(','))}&musica=no`}>a quién llamar en {c.provincias.join(', ')} →</a>
        </p>
      )}
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
    <section className="pagina ficha-pagina">
      <Cabecera c={c} />
      <div className="ficha-cuerpo">
        <div className="ficha-principal">
          {c.accion && <QueHacer a={c.accion} />}
          {(c.ficha || c.basica) && (
            <section className="bloque">
              <h3>{c.ficha ? 'Ficha completa de las bases' : 'Ficha básica'}</h3>
              <FichaDe c={c} />
            </section>
          )}
          {c.serie && c.serie.convocatorias.length > 1 && <OtrosAnios serie={c.serie} actual={c.id} />}
        </div>
        <aside className="ficha-lateral">
          <EncajeCatalogo tipo="convocatoria" id={c.id} />
          <Resumen c={c} />
          {c.contacto && <Contacto c={c.contacto} />}
        </aside>
      </div>
    </section>
  );
}
