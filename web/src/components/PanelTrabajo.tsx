import { useEffect, useState } from 'react';
import { crm, type Panel, type Pendiente, NOMBRE_HISTORIAL } from '../crm';
import { enlace } from '../ruta';
import { EtiquetaCerteza } from './EntidadCrm';
import { LineaContacto } from './Cliente';

const fecha = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const enlaceEntidad = (p: Pendiente) => (p.entidadDatos.ref ? enlace('programador', p.entidadDatos.ref) : enlace('entidad', p.entidadDatos.id));

/** Inicio con cuenta: solo acciones pendientes. Llamadas, bandeja, respuestas, oportunidades nuevas y contratos. */
export function PanelTrabajo() {
  const [p, setP] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = () => crm.panel().then(setP, (e: Error) => setError(e.message));
  useEffect(() => {
    void cargar();
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p className="ayuda">Cargando tu panel…</p>;
  return (
    <>
      {p.catalogo === 0 && (
        <p className="llamada">
          Empieza por <a href="#/catalogo">tu catálogo de espectáculos</a>: con él se proponen las cartas y se cruzan las ayudas y licitaciones.
        </p>
      )}
      <div className="dos-columnas">
        <section className="bloque">
          <h3>
            ¿A quién llamar ahora? <span className="contador">{p.llamar.length}</span>
          </h3>
          {p.llamar.length === 0 ? (
            <p className="ayuda">Nada pendiente. Las alertas aparecen tras el 2.º y el 4.º envío de cada secuencia.</p>
          ) : (
            <ul className="filas">
              {p.llamar.map((x) => (
                <li key={x.id} className="fila-convocatoria">
                  <a className="fila-titulo" href={enlaceEntidad(x)}>
                    {x.texto || x.entidadDatos.nombre}
                  </a>
                  <span className="fila-detalle">
                    {NOMBRE_HISTORIAL[x.tipo]} · desde el {fecha(x.vence ?? x.fecha)}
                  </span>
                  {(x.entidadDatos.telefono || x.entidadDatos.email) && (
                    <LineaContacto
                      c={{ municipio: x.entidadDatos.municipio ?? '', nombre: x.entidadDatos.persona, cargo: null, email: x.entidadDatos.email, telefono: x.entidadDatos.telefono, deCultura: true }}
                    />
                  )}
                  <button type="button" className="enlace-boton" onClick={() => void crm.hecho(x.id).then(cargar)}>
                    Hecho
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="bloque">
          <h3>
            Borradores por revisar <span className="contador">{p.bandeja.total}</span>
          </h3>
          {p.bandeja.total === 0 ? (
            <p className="ayuda">La bandeja está vacía.</p>
          ) : (
            <ul className="filas">
              {p.bandeja.items.map((m) => (
                <li key={m.id} className="fila-convocatoria">
                  <a className="fila-titulo" href="#/bandeja">
                    {m.entidad.nombre}
                  </a>
                  <span className="fila-detalle">
                    Envío {m.paso} de 5 · {m.estado === 'programado' ? 'programado' : m.estado === 'aprobado' ? 'aprobado, falta enviarlo' : 'borrador'} · {m.asunto}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p>
            <a href="#/bandeja">Abrir la bandeja →</a>
          </p>
        </section>
      </div>

      {p.respuestas.length > 0 && (
        <section className="bloque">
          <h3>
            Respuestas y acciones pendientes <span className="contador">{p.respuestas.length}</span>
          </h3>
          <ul className="filas">
            {p.respuestas.map((x) => (
              <li key={x.id} className="fila-convocatoria">
                <a className="fila-titulo" href={enlaceEntidad(x)}>
                  {x.entidadDatos.nombre}
                </a>
                <span className="fila-detalle">
                  {NOMBRE_HISTORIAL[x.tipo]} el {fecha(x.fecha)}
                  {x.texto && ` · ${x.texto}`}
                </span>
                <button type="button" className="enlace-boton" onClick={() => void crm.hecho(x.id).then(cargar)}>
                  Atendido
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bloque">
        <h3>
          Ayudas nuevas que encajan con tu catálogo <span className="contador">{p.ayudas.length}</span>
        </h3>
        {p.ayudas.length === 0 ? (
          <p className="ayuda">Ninguna en las dos últimas semanas.</p>
        ) : (
          <ul className="filas">
            {p.ayudas.map((a) => (
              <li key={a.convocatoria.id} className="fila-convocatoria">
                <a className="fila-titulo" href={enlace('convocatoria', a.convocatoria.id)}>
                  {a.convocatoria.tituloCorto ?? a.convocatoria.titulo}
                </a>
                <span className="fila-detalle">
                  <EtiquetaCerteza c={a.certeza} /> {a.convocatoria.organo}
                </span>
                {a.espectaculos.length > 0 && <span className="fila-motivos">Podría financiar: {a.espectaculos.map((x) => x.nombre).join(', ')}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bloque">
        <h3>
          Contratos públicos abiertos de interés <span className="contador">{p.licitaciones.length}</span>
        </h3>
        {p.licitaciones.length === 0 ? (
          <p className="ayuda">Ninguno ahora mismo.</p>
        ) : (
          <ul className="filas">
            {p.licitaciones.map((l) => (
              <li key={l.contrato.id} className="fila-convocatoria">
                <a className="fila-titulo" href={enlace('contrato', l.contrato.id)}>
                  {l.contrato.titulo}
                </a>
                <span className="fila-detalle">
                  {l.contrato.organo.nombre}
                  {l.contrato.finPlazo && ` · ofertas hasta el ${fecha(l.contrato.finPlazo)}`}
                </span>
                {l.espectaculos.map((x) => (
                  <span key={x.id} className="fila-motivos">
                    {x.nombre}: {x.viabilidad === 'pendiente' ? 'Pendiente de valorar' : x.viabilidad === 'viable' ? 'viable a priori' : 'ajustada'}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="ayuda">
        Las propuestas, ayudas y licitaciones de cada entidad se gestionan desde su ficha (en <a href="#/clientes">Clientes</a>). <a href="#/catalogo">Tu catálogo</a> ·{' '}
        <a href="#/seguimiento">Mis entidades</a>
      </p>
    </>
  );
}
