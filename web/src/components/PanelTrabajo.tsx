import { useEffect, useState } from 'react';
import { crm, type Panel, type Pendiente, NOMBRE_HISTORIAL } from '../crm';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';
import { EtiquetaCerteza } from './EntidadCrm';

const fecha = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const enlaceEntidad = (p: Pendiente) => (p.entidadDatos.ref ? enlace('programador', p.entidadDatos.ref) : enlace('entidad', p.entidadDatos.id));
const DIA = 86_400_000;
const hoy0 = () => new Date(new Date().toDateString()).getTime();
/** «Hoy», «Ayer», «Hace 4 días» o «Mañana»/«En 3 días». */
function relativo(iso: string): string {
  const d = Math.round((new Date(`${iso.slice(0, 10)}T00:00:00`).getTime() - hoy0()) / DIA);
  if (d === 0) return 'Hoy';
  if (d === -1) return 'Ayer';
  if (d === 1) return 'Mañana';
  return d < 0 ? `Hace ${-d} días` : `En ${d} días`;
}
function saludo(): string {
  const h = new Date().getHours();
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

type Tono = 'verde' | 'ambar' | 'azul';
interface Tarea {
  clave: string;
  tono: Tono;
  sigla: string;
  titulo: string;
  detalle: string;
  cuando: string;
  accion: { texto: string; href?: string; alPulsar?: () => void };
}

/** Inicio con cuenta: qué hacer hoy, ordenado por urgencia, con el estado de la temporada y lo que cierra pronto. */
export function PanelTrabajo() {
  const usuario = useCuenta().cuenta?.usuario;
  const [p, setP] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = () => crm.panel().then(setP, (e: Error) => setError(e.message));
  useEffect(() => {
    void cargar();
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p className="ayuda">Cargando tu panel…</p>;

  const hecho = (id: string) => () => void crm.hecho(id).then(cargar);
  const tareas: Tarea[] = [
    ...p.respuestas.map(
      (x): Tarea => ({
        clave: x.id,
        tono: 'verde',
        sigla: 'RE',
        titulo: `${x.tipo === 'respuesta' ? 'Contestar a' : NOMBRE_HISTORIAL[x.tipo] + ':'} ${x.entidadDatos.nombre}`,
        detalle: x.texto || NOMBRE_HISTORIAL[x.tipo],
        cuando: relativo(x.fecha),
        accion: { texto: 'Abrir ficha', href: enlaceEntidad(x) },
      }),
    ),
    ...p.llamar.map(
      (x): Tarea => ({
        clave: x.id,
        tono: 'ambar',
        sigla: 'TEL',
        titulo: `Llamar a ${x.entidadDatos.nombre}`,
        detalle: [x.texto, x.entidadDatos.persona, x.entidadDatos.telefono].filter(Boolean).join(' · ') || NOMBRE_HISTORIAL[x.tipo],
        cuando: relativo(x.vence ?? x.fecha),
        accion: { texto: 'Hecho', alPulsar: hecho(x.id) },
      }),
    ),
    ...(p.propuestas > 0
      ? [
          {
            clave: 'propuestas',
            tono: 'azul' as const,
            sigla: '@',
            titulo: `Revisar ${plural(p.propuestas, 'correo nuevo', 'correos nuevos')}`,
            detalle: 'Sitios donde encaja tu catálogo, con el correo ya escrito',
            cuando: 'Hoy',
            accion: { texto: 'Revisar', href: '#/propuestas' },
          },
        ]
      : []),
    ...p.bandeja.items.map(
      (m): Tarea => ({
        clave: m.id,
        tono: 'azul',
        sigla: `${m.paso}.º`,
        titulo: `${m.paso === 1 ? 'Primer correo' : 'Seguimiento'} a ${m.entidad.nombre}`,
        detalle: m.estado === 'aprobado' ? 'Aprobado, falta enviarlo' : m.estado === 'programado' ? 'Programado' : m.asunto,
        cuando: m.programadoPara ? relativo(m.programadoPara) : 'Hoy',
        accion: { texto: 'Revisar', href: '#/bandeja' },
      }),
    ),
  ];

  const plazos = p.ayudas
    .map((a) => ({ a, fin: a.convocatoria.fechaFinSolicitud ?? a.convocatoria.cierreAproximado ?? null }))
    .sort((x, y) => (x.fin ?? '9999').localeCompare(y.fin ?? '9999'))
    .slice(0, 4);
  const e = p.embudo;
  const embudo: [string, number][] = [
    ['Preparadas', e.preparadas],
    ['Contactadas', e.contactadas],
    ['Con respuesta', e.respuesta],
    ['Reunión', e.reunion],
    ['Interesadas', e.interesadas],
  ];
  const nombre = usuario?.email.split('@')[0].split(/[._-]/)[0];
  const resumen = [
    p.propuestas && plural(p.propuestas, 'correo preparado', 'correos preparados'),
    p.llamar.length && plural(p.llamar.length, 'llamada', 'llamadas'),
    p.respuestas.length && plural(p.respuestas.length, 'respuesta que atender', 'respuestas que atender'),
  ].filter(Boolean) as string[];

  return (
    <div className="hoy">
      <header className="titulo-hoy">
        <div>
          <p className="fecha-hoy">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>
            {saludo()}
            {nombre ? `, ${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}` : ''}
          </h1>
          <p className="ayuda">{resumen.length ? `Tienes ${resumen.join(', ').replace(/, ([^,]*)$/, ' y $1')}.` : 'Todo al día. Puedes preparar nuevas propuestas cuando quieras.'}</p>
        </div>
        <a className="boton" href="#/propuestas">
          Revisar correos
        </a>
      </header>

      {p.catalogo === 0 && (
        <p className="llamada">
          Empieza por <a href="#/catalogo">tu catálogo de espectáculos</a>: con él se preparan los correos y se cruzan las ayudas y licitaciones.
        </p>
      )}

      <section className="kpis" aria-label="Resumen">
        <a className="kpi" href="#/propuestas">
          <span className="kpi-titulo">Correos listos para revisar</span>
          <strong>{p.propuestas}</strong>
          <span className="kpi-pie tono-azul">Revisar y enviar →</span>
        </a>
        <div className="kpi">
          <span className="kpi-titulo">Llamadas de seguimiento</span>
          <strong>{p.llamar.length}</strong>
          <span className="kpi-pie tono-ambar">{p.llamar.length ? `La más antigua: ${relativo(p.llamar.map((x) => x.vence ?? x.fecha).sort()[0]).toLowerCase()}` : 'Ninguna pendiente'}</span>
        </div>
        <div className="kpi">
          <span className="kpi-titulo">Respuestas nuevas</span>
          <strong>{p.respuestas.length}</strong>
          <span className="kpi-pie tono-verde">{p.respuestas.map((x) => x.entidadDatos.nombre).slice(0, 2).join(', ') || 'Sin novedades'}</span>
        </div>
        <a className="kpi" href="#/explorar">
          <span className="kpi-titulo">Ayudas nuevas que encajan</span>
          <strong>{p.ayudas.length}</strong>
          <span className="kpi-pie">{plazos[0]?.fin ? `La próxima cierra el ${fecha(plazos[0].fin)}` : 'Últimas dos semanas'}</span>
        </a>
      </section>

      <section className="embudo bloque" aria-label="Tu temporada">
        <strong className="embudo-titulo">Tu temporada</strong>
        <ol>
          {embudo.map(([t, n], i) => (
            <li key={t}>
              <span className={`embudo-barra paso-${i + 1}`} />
              <span>
                {t} <b>{n}</b>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="rejilla-hoy">
        <section className="bloque lista-tareas" aria-labelledby="t-hoy">
          <div className="bloque-cabecera">
            <h2 id="t-hoy">Para hoy</h2>
            <span className="ayuda">Ordenado por urgencia</span>
          </div>
          {tareas.length === 0 ? (
            <p className="vacio-suave">Nada pendiente. Las llamadas aparecen tras el 2.º y el 4.º correo de cada secuencia, y las respuestas cuando las anotas.</p>
          ) : (
            <ul>
              {tareas.map((t) => (
                <li key={t.clave} className="tarea">
                  <span className={`sigla tono-${t.tono}`}>{t.sigla}</span>
                  <span className="tarea-texto">
                    <strong>{t.titulo}</strong>
                    <span>{t.detalle}</span>
                  </span>
                  <span className="tarea-cuando">{t.cuando}</span>
                  {t.accion.href ? (
                    <a className="accion" href={t.accion.href}>
                      {t.accion.texto}
                    </a>
                  ) : (
                    <button type="button" className="accion" onClick={t.accion.alPulsar}>
                      {t.accion.texto}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="columna-hoy">
          <section className="bloque lista-lateral" aria-labelledby="t-plazos">
            <div className="bloque-cabecera">
              <h2 id="t-plazos">Ayudas que encajan</h2>
              <a href="#/explorar">Ver ayudas</a>
            </div>
            {plazos.length === 0 ? (
              <p className="vacio-suave">Ninguna nueva en las dos últimas semanas.</p>
            ) : (
              <ul>
                {plazos.map(({ a, fin }) => (
                  <li key={a.convocatoria.id} className="plazo">
                    <span className="calendario-dia">
                      {fin ? (
                        <>
                          <small>{new Date(`${fin}T00:00:00`).toLocaleDateString('es-ES', { month: 'short' })}</small>
                          <b>{Number(fin.slice(8, 10))}</b>
                        </>
                      ) : (
                        <small>sin fecha</small>
                      )}
                    </span>
                    <span className="tarea-texto">
                      <a href={enlace('convocatoria', a.convocatoria.id)}>{a.convocatoria.tituloCorto ?? a.convocatoria.titulo}</a>
                      <span>
                        <EtiquetaCerteza c={a.certeza} /> {a.convocatoria.organo}
                        {a.espectaculos.length > 0 && ` · ${a.espectaculos.map((x) => x.nombre).join(', ')}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bloque lista-lateral" aria-labelledby="t-lic">
            <div className="bloque-cabecera">
              <h2 id="t-lic">Licitaciones que encajan</h2>
              <a href="#/contratos?estado=abiertas">Ver todas</a>
            </div>
            {p.licitaciones.length === 0 ? (
              <p className="vacio-suave">Ninguna abierta ahora mismo.</p>
            ) : (
              <ul>
                {p.licitaciones.slice(0, 4).map((l) => (
                  <li key={l.contrato.id}>
                    <span className="tarea-texto">
                      <a href={enlace('contrato', l.contrato.id)}>{l.contrato.titulo}</a>
                      <span>
                        {l.contrato.organo.nombre}
                        {l.contrato.finPlazo && ` · ofertas hasta el ${fecha(l.contrato.finPlazo)}`}
                      </span>
                      <span className="etiquetas">
                        {l.espectaculos.map((x) => (
                          <span key={x.id} className={`etiqueta ${x.viabilidad === 'viable' ? 'etiqueta-exito' : x.viabilidad === 'ajustada' ? 'etiqueta-aviso' : ''}`}>
                            {x.nombre}
                            {x.viabilidad === 'viable' ? ' · viable' : x.viabilidad === 'ajustada' ? ' · ajustada' : ''}
                          </span>
                        ))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {p.alertas.length > 0 && (
        <section className="bloque lista-tareas" aria-labelledby="t-alertas">
          <div className="bloque-cabecera">
            <h2 id="t-alertas">Novedades para tus oportunidades abiertas</h2>
            <span className="ayuda">Encaje potencial: verifica los requisitos</span>
          </div>
          <ul>
            {p.alertas.map((a) => (
              <li key={`${a.entidad.id}-${a.ref}`} className="tarea">
                <span className={`sigla tono-${a.tipo === 'convocatoria' ? 'ambar' : 'verde'}`}>{a.tipo === 'convocatoria' ? '€' : 'LIC'}</span>
                <span className="tarea-texto">
                  <a href={a.tipo === 'convocatoria' ? enlace('convocatoria', a.ref) : enlace('contrato', a.ref)}>{a.titulo}</a>
                  <span>
                    Para <a href={a.entidad.ref ? enlace('programador', a.entidad.ref) : enlace('entidad', a.entidad.id)}>{a.entidad.nombre}</a>
                    {a.espectaculos.length > 0 && ` · podría encajar: ${a.espectaculos.map((x) => x.nombre).join(', ')}`}
                  </span>
                </span>
                <button type="button" className="accion" onClick={() => void crm.descartarAlerta(a.entidad.id, a.ref).then(cargar)}>
                  No me interesa
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
