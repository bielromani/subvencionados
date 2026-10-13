import { useEffect, useState } from 'react';
import { api, type Lista, type ListaPrevistas } from '../api';
import { FilaContrato } from '../components/FilaContrato';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { enlace } from '../ruta';
import { NOMBRE_ESTILO } from '../tipos';

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
  return (
    <section className="bloque">
      <h3>{titulo}</h3>
      <p className="ayuda">{explicacion}</p>
      <h4 className="subtitulo-bloque">
        Abiertas o a punto de abrir <span className="contador">{datos.ahora.total}</span>
      </h4>
      <Filas lista={datos.ahora} vacio="Ninguna ahora mismo." />
      <h4 className="subtitulo-bloque">
        Se esperan en los próximos meses <span className="contador">{datos.previstas.total}</span>
      </h4>
      <Filas lista={datos.previstas} vacio="Ninguna prevista." />
      <p>
        <a href={`#/explorar?para=${para}&plazo=cerrada&orden=`}>Ver las de años anteriores →</a>
      </p>
    </section>
  );
}

export function Inicio() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.inicio().then(setD, (e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <p className="ayuda">Cargando…</p>;

  return (
    <section>
      <p className="aviso-demo">
        Solo salen las subvenciones que sirven para colocar a tus grupos: las que pueden pedir ellos y el dinero que reciben quienes les contratan.
        {!d.perfilCompleto && (
          <>
            {' '}
            Ahora ves toda España y los tres estilos: <a href="#/perfil">indica tus grupos y dónde trabajas</a> para afinar.
          </>
        )}
      </p>

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
