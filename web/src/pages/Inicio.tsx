import { useEffect, useState } from 'react';
import { api, type Lista, type ListaPrevistas } from '../api';
import { FilaClienteNueva } from '../components/Cliente';
import { FilaContrato } from '../components/FilaContrato';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { clientesParaHoy, useMarcas } from '../marcas';
import { enlace } from '../ruta';
import { PanelTrabajo } from '../components/PanelTrabajo';
import { useCuenta } from '../sincronizar';
import { NOMBRE_ESTILO, type Convocatoria } from '../tipos';
import { visitaAnterior } from '../visitas';

type Datos = Awaited<ReturnType<typeof api.inicio>>;

function Filas({ lista, vacio }: { lista: Lista | ListaPrevistas; vacio: string }) {
  if (lista.items.length === 0) return <p className="ayuda">{vacio}</p>;
  return (
    <ul className="filas">
      {lista.items.map((m) => (
        <FilaConvocatoria key={m.convocatoria.id} m={m} prevista={'prevista' in m ? m.prevista : undefined} />
      ))}
    </ul>
  );
}

function Columna({ titulo, explicacion, datos, para }: { titulo: string; explicacion: string; datos: Datos['para']['grupos']; para: string }) {
  const previstas = { ...datos.previstas, items: datos.previstas.items.slice(0, 4) };
  return (
    <section className="bloque">
      <h3>{titulo}</h3>
      <p className="ayuda">{explicacion}</p>
      <h4 className="subtitulo-bloque">
        Con plazo abierto o a punto de abrir <span className="contador">{datos.ahora.total}</span>
      </h4>
      <Filas lista={datos.ahora} vacio="Ninguna ahora mismo." />
      <h4 className="subtitulo-bloque">
        Se esperan pronto <span className="contador">{datos.previstas.total}</span>
      </h4>
      <Filas lista={previstas} vacio="Ninguna prevista." />
      <p>
        <a href={`#/explorar?para=${para}`}>Ver todas →</a> · <a href="#/calendario">Calendario</a>
      </p>
    </section>
  );
}

type DatosNovedades = Awaited<ReturnType<typeof api.novedades>>;
const fechaCorta = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
const comoFila = (c: Convocatoria) => ({ convocatoria: c, plazo: c.plazo, puntuacion: 0, encaje: 'directo' as const, motivos: [], avisos: [] });

/** Lo que ha pasado desde la última visita: plazos de sus guardadas, ayudas nuevas y lo que han contratado sus clientes. */
function Novedades() {
  const marcas = useMarcas();
  const [anterior] = useState(() => visitaAnterior());
  const [n, setN] = useState<DatosNovedades | null>(null);
  const clientes = Object.keys(marcas.clientes);
  useEffect(() => {
    api.novedades(anterior, clientes, marcas.guardadas).then(setN, () => setN(null));
  }, [anterior, clientes.join(','), marcas.guardadas.join(',')]);
  if (!n) return null;
  const nada = n.guardadas.length + n.ayudas.total + n.adjudicados.total + n.licitaciones.total === 0;
  return (
    <section className="bloque novedades">
      <h3>{anterior ? `Novedades desde tu última visita (${fechaCorta(n.desde)})` : 'Novedades de la última semana'}</h3>
      {nada && <p className="ayuda">Nada nuevo para ti desde el {fechaCorta(n.desde)}.</p>}
      {n.guardadas.length > 0 && (
        <>
          <h4 className="subtitulo-bloque">De tus ayudas guardadas</h4>
          <ul className="filas">
            {n.guardadas.map((g) => (
              <FilaConvocatoria key={g.convocatoria.id} m={comoFila(g.convocatoria)} />
            ))}
          </ul>
        </>
      )}
      {n.ayudas.total > 0 && (
        <>
          <h4 className="subtitulo-bloque">
            Ayudas nuevas que te sirven <span className="contador">{n.ayudas.total}</span>
          </h4>
          <Filas lista={n.ayudas} vacio="" />
          {n.ayudas.total > n.ayudas.items.length && (
            <p>
              <a href={`#/explorar?desde=${n.desde}`}>Ver las {n.ayudas.total} →</a>
            </p>
          )}
        </>
      )}
      {n.adjudicados.total > 0 && (
        <>
          <h4 className="subtitulo-bloque">
            Lo que han contratado tus clientes <span className="contador">{n.adjudicados.total}</span>
          </h4>
          <p className="ayuda">Conciertos adjudicados por los clientes de Mi lista: a quién y por cuánto.</p>
          <ul className="filas">
            {n.adjudicados.items.map((c) => (
              <FilaContrato key={c.id} c={c} />
            ))}
          </ul>
        </>
      )}
      {n.licitaciones.total > 0 && (
        <>
          <h4 className="subtitulo-bloque">
            Licitaciones de conciertos nuevas con plazo abierto <span className="contador">{n.licitaciones.total}</span>
          </h4>
          <ul className="filas">
            {n.licitaciones.items.map((c) => (
              <FilaContrato key={c.id} c={c} />
            ))}
          </ul>
          <p>
            <a href="#/contratos?estado=abiertas">Ver todas →</a>
          </p>
        </>
      )}
    </section>
  );
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function InicioGeneral() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paraHoy = clientesParaHoy(useMarcas().clientes);

  useEffect(() => {
    api.inicio().then(setD, (e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <p className="ayuda">Cargando…</p>;

  const ayudasAbiertas = d.para.grupos.ahora.total + d.para.programadores.ahora.total;
  const mesActual = new Date().getMonth() + 1;
  return (
    <section className="portada">
      <header className="portada-hero">
        <div className="portada-texto">
          <p className="portada-antetitulo">Música en directo · toda España</p>
          <h1>Coloca a tus grupos de jazz, clásica y ópera</h1>
          <p>A quién llamar, qué ayudas pedir y qué contratos están abiertos, con datos públicos que se actualizan cada día.</p>
          <div className="portada-botones">
            <a className="boton" href="#/cuenta">
              Crear cuenta gratis
            </a>
            <a className="accion" href="#/perfil">
              {d.perfilCompleto ? 'Cambiar mis grupos' : 'Indicar mis grupos y territorio'}
            </a>
          </div>
        </div>
        <div className="portada-cifras">
          <a className="kpi" href={`#/clientes?mes=${d.llamar.meses.join(',')}`}>
            <span className="kpi-titulo">Clientes a los que llamar ahora</span>
            <strong>{d.llamar.total.toLocaleString('es-ES')}</strong>
            <span className="kpi-pie tono-azul">Contratan en {d.llamar.meses.map((m) => MESES[m - 1]).join(' y ')} →</span>
          </a>
          <a className="kpi" href="#/explorar">
            <span className="kpi-titulo">Ayudas abiertas o por abrir</span>
            <strong>{ayudasAbiertas.toLocaleString('es-ES')}</strong>
            <span className="kpi-pie tono-azul">Ver ayudas →</span>
          </a>
          <a className="kpi" href="#/contratos">
            <span className="kpi-titulo">Licitaciones de conciertos abiertas</span>
            <strong>{d.licitaciones.total.toLocaleString('es-ES')}</strong>
            <span className="kpi-pie tono-azul">Ver licitaciones →</span>
          </a>
        </div>
      </header>

      {!d.perfilCompleto && (
        <p className="llamada">
          Ves toda España y los tres estilos. <a href="#/perfil">Indica tus grupos y dónde trabajas</a> para ver solo lo tuyo.
        </p>
      )}

      {paraHoy > 0 && (
        <p className="llamada">
          Hoy te toca contactar a {paraHoy} {paraHoy === 1 ? 'cliente' : 'clientes'} de tu lista. <a href="#/guardadas">Ver Mi lista →</a>
        </p>
      )}

      <Novedades />

      {d.grupos.length > 0 && (
        <ul className="grupos-resumen">
          {d.grupos.map((g, i) => (
            <li key={i}>
              <a href={`${enlace('grupos')}?grupo=${i}`}>
                <strong>{g.grupo.nombre}</strong> <span className="ayuda">{NOMBRE_ESTILO[g.grupo.estilo]}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <section className="seccion-portada" aria-labelledby="t-llamar">
        <div className="seccion-cabecera">
          <div>
            <h2 id="t-llamar">A quién llamar ahora</h2>
            <p className="ayuda">
              Contrataron música en {d.llamar.meses.map((m) => MESES[m - 1]).join(' y ')} en años anteriores{d.perfilCompleto ? ', en tus comunidades y de tus estilos' : ''}: es buen momento para ofrecerles tus grupos.
            </p>
          </div>
          <a href={`#/clientes?mes=${d.llamar.meses.join(',')}`}>Ver los {d.llamar.total.toLocaleString('es-ES')} →</a>
        </div>
        {d.llamar.items.length === 0 ? (
          <p className="ayuda">Ninguno en estas fechas.</p>
        ) : (
          <ul className="lista-ayudas lista-clientes">
            {d.llamar.items.map((p) => (
              <FilaClienteNueva key={p.id} p={p} mesActual={mesActual} />
            ))}
          </ul>
        )}
      </section>

      <div className="dos-columnas">
        <Columna
          titulo="Para tus grupos"
          explicacion="Ayudas que pueden pedir tus grupos: giras, grabación, producción, internacionalización y concursos para intérpretes."
          datos={d.para.grupos}
          para="grupos"
        />
        <Columna
          titulo="Para quien te contrata"
          explicacion="Dinero que reciben ayuntamientos, festivales y salas para programar música: momento de ofrecerles tus grupos."
          datos={d.para.programadores}
          para="programadores"
        />
      </div>

      <section className="bloque">
        <h3>
          Contratos públicos de conciertos abiertos <span className="contador">{d.licitaciones.total}</span>
        </h3>
        <p className="ayuda">Ayuntamientos que buscan ahora quién toque{d.perfilCompleto ? ' en tus comunidades' : ''}: se puede presentar oferta.</p>
        {d.licitaciones.items.length === 0 ? (
          <p className="ayuda">Ninguno abierto ahora mismo.</p>
        ) : (
          <ul className="filas">
            {d.licitaciones.items.map((c) => (
              <FilaContrato key={c.id} c={c} />
            ))}
          </ul>
        )}
        {d.licitaciones.total > d.licitaciones.items.length && (
          <p>
            <a href="#/contratos">Ver todos →</a>
          </p>
        )}
      </section>
    </section>
  );
}

/** Con cuenta, Inicio es el panel de trabajo (solo acciones pendientes); sin ella, el resumen general. */
export function Inicio() {
  const usuario = useCuenta().cuenta?.usuario;
  return usuario ? (
    <section>
      <PanelTrabajo />
    </section>
  ) : (
    <InicioGeneral />
  );
}
