import { useEffect, useState } from 'react';
import { api, type Lista, type ListaPrevistas } from '../api';
import { FilaCliente } from '../components/Cliente';
import { FilaContrato } from '../components/FilaContrato';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { clientesParaHoy, useMarcas } from '../marcas';
import { enlace } from '../ruta';
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

export function Inicio() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paraHoy = clientesParaHoy(useMarcas().clientes);

  useEffect(() => {
    api.inicio().then(setD, (e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <p className="ayuda">Cargando…</p>;

  return (
    <section>
      {!d.perfilCompleto && (
        <p className="aviso-demo">
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

      <section className="bloque">
        <h3>
          A quién llamar ahora <span className="contador">{d.llamar.total}</span>
        </h3>
        <p className="ayuda">
          Clientes que en años anteriores contrataron música en {d.llamar.meses.map((m) => MESES[m - 1]).join(' y ')}
          {d.perfilCompleto ? ', en tus comunidades y de tus estilos' : ''}: es buen momento para ofrecerles tus grupos.
        </p>
        {d.llamar.items.length === 0 ? (
          <p className="ayuda">Ninguno en estas fechas.</p>
        ) : (
          <ul className="filas">
            {d.llamar.items.map((p) => (
              <FilaCliente key={p.id} p={p} />
            ))}
          </ul>
        )}
        <p>
          <a href={`#/clientes?mes=${d.llamar.meses.join(',')}`}>Ver todos →</a>
        </p>
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
