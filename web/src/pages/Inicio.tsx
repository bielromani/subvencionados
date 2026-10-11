import { useEffect, useState } from 'react';
import { api, type Lista, type ListaPrevistas } from '../api';
import { FilaContrato } from '../components/FilaContrato';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { enlace } from '../ruta';
import { NOMBRE_ESTILO } from '../tipos';

type Datos = Awaited<ReturnType<typeof api.inicio>>;

function Bloque({ titulo, explicacion, lista, mas }: { titulo: string; explicacion: string; lista: Lista | ListaPrevistas; mas?: [string, string] }) {
  return (
    <section className="bloque">
      <h3>
        {titulo} <span className="contador">{lista.total}</span>
      </h3>
      <p className="ayuda">{explicacion}</p>
      {lista.items.length === 0 ? (
        <p className="ayuda">Nada por ahora.</p>
      ) : (
        <ul className="filas">
          {lista.items.map((m) => (
            <FilaConvocatoria key={m.convocatoria.id} m={m} prevista={'prevista' in m ? m.prevista : undefined} />
          ))}
        </ul>
      )}
      {mas && lista.total > lista.items.length && (
        <p>
          <a href={mas[0]}>{mas[1]} →</a>
        </p>
      )}
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
      {!d.perfilCompleto && (
        <p className="aviso-demo">
          Estás viendo las ayudas de jazz, clásica y ópera de toda España que admiten autónomos, empresas o asociaciones. <a href="#/perfil">Completa tu perfil</a> con tus
          grupos, tu forma jurídica y dónde trabajas para ver solo las que puedes pedir.
        </p>
      )}

      <div className="cifras">
        <a className="cifra cifra-enlace" href="#/para-ti">
          <span className="cifra-etiqueta">Puedes pedir ahora</span>
          <span className="cifra-valor">{d.abiertas}</span>
          <span className="cifra-nota">concursos abiertos o a punto de abrir</span>
        </a>
        <a className="cifra cifra-enlace" href="#/calendario">
          <span className="cifra-etiqueta">Cierran en 30 días</span>
          <span className="cifra-valor">{d.cierranPronto.total}</span>
          <span className="cifra-nota">ver el calendario</span>
        </a>
        <a className="cifra cifra-enlace" href="#/calendario">
          <span className="cifra-etiqueta">Previstas en 6 meses</span>
          <span className="cifra-valor">{d.previstas.total}</span>
          <span className="cifra-nota">según los años anteriores</span>
        </a>
      </div>

      {d.grupos.length > 0 && (
        <section className="bloque">
          <h3>Tus grupos</h3>
          <p className="ayuda">Ayudas que mencionan el estilo de cada grupo; las generales de música valen para todos.</p>
          <ul className="grupos-resumen">
            {d.grupos.map((g, i) => (
              <li key={i}>
                <a href={`${enlace('grupos')}?grupo=${i}`}>
                  <strong>{g.grupo.nombre}</strong> <span className="ayuda">{NOMBRE_ESTILO[g.grupo.estilo]}</span>
                </a>
                <span>
                  {g.abiertas} específicas para pedir ahora · {g.previstas} previstas en 6 meses
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Bloque
        titulo="Cierran pronto"
        explicacion="Concursos que puedes pedir y cierran en los próximos 30 días."
        lista={d.cierranPronto}
        mas={['#/para-ti', 'Ver todas las recomendaciones']}
      />
      <section className="bloque">
        <h3>
          Contratos públicos de conciertos abiertos <span className="contador">{d.licitaciones.total}</span>
        </h3>
        <p className="ayuda">
          Licitaciones de actuaciones musicales en las que se puede presentar oferta
          {d.perfilCompleto ? ' en tus comunidades' : ''}.
        </p>
        {d.licitaciones.items.length === 0 ? (
          <p className="ayuda">Ninguna abierta ahora mismo.</p>
        ) : (
          <ul className="filas">
            {d.licitaciones.items.map((c) => (
              <FilaContrato key={c.id} c={c} />
            ))}
          </ul>
        )}
        {d.licitaciones.total > d.licitaciones.items.length && (
          <p>
            <a href="#/contratos">Ver todas →</a>
          </p>
        )}
      </section>
      <Bloque titulo="Abren pronto" explicacion="El plazo aún no ha empezado: buen momento para preparar la solicitud." lista={d.abrenPronto} mas={['#/calendario', 'Ver el calendario']} />
      <Bloque
        titulo="Previstas en los próximos 6 meses"
        explicacion="Se convocan cada año y se espera la nueva edición pronto (estimación, no es un dato oficial). Las bases del año pasado sirven para adelantar trabajo."
        lista={d.previstas}
        mas={['#/calendario', 'Ver el calendario']}
      />
      <Bloque titulo="Nuevas en las últimas dos semanas" explicacion="Registradas en la BDNS hace poco y que encajan contigo." lista={d.nuevas} mas={['#/explorar?orden=recientes&tipo=concurrencia', 'Ver las más recientes']} />
      {d.artistas.total > 0 && (
        <Bloque titulo="Para tus músicos" explicacion="Premios y concursos abiertos para personas físicas: pueden presentarse tus artistas." lista={d.artistas} mas={['#/para-ti', 'Ver todos']} />
      )}
    </section>
  );
}
