import { useEffect, useState } from 'react';
import { api } from '../api';
import { FilaConvocatoria } from '../components/FilaConvocatoria';
import { cambiarParams, type Ruta } from '../ruta';
import { NOMBRE_ESTILO, type Coincidencia } from '../tipos';

type Datos = Awaited<ReturnType<typeof api.grupos>>;

/** Las recomendaciones de cada grupo por separado: qué puede pedir ya, qué viene y por qué encaja. */
export function Grupos({ ruta }: { ruta: Ruta }) {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState(Number(ruta.params.get('grupo')) || 0);

  useEffect(() => {
    api.grupos().then(setD, (e: Error) => setError(e.message));
  }, []);
  useEffect(() => cambiarParams({ grupo: elegido || undefined }), [elegido]);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <p className="ayuda">Cargando…</p>;
  if (!d.perfilCompleto) {
    return (
      <div className="vacio">
        <h2>Añade tus grupos</h2>
        <p>Indica en tu perfil qué grupos llevas y su estilo para ver las ayudas que encajan con cada uno.</p>
        <a className="boton" href="#/perfil">
          Completar mi perfil
        </a>
      </div>
    );
  }

  const g = d.grupos[Math.min(elegido, d.grupos.length - 1)]!;
  const estilo = NOMBRE_ESTILO[g.grupo.estilo].toLowerCase();
  // Lo que menciona el estilo del grupo va aparte de lo general (música sin estilo o cultura), que vale para todos.
  const especifica = (m: Coincidencia) => m.convocatoria.clasificacion.estilosExplicitos.includes(g.grupo.estilo);
  const partir = <T extends Coincidencia>(xs: T[]) => [xs.filter(especifica), xs.filter((m) => !especifica(m))] as const;
  const [abiertasPropias, abiertasGenerales] = partir(g.abiertas.items);
  const [previstasPropias, previstasGenerales] = partir(g.previstas.items);

  return (
    <section>
      <div className="pestanas-grupos" role="tablist">
        {d.grupos.map((x, i) => (
          <button key={i} role="tab" aria-selected={i === elegido} className={i === elegido ? 'activa' : ''} onClick={() => setElegido(i)}>
            {x.grupo.nombre} <span className="ayuda">{NOMBRE_ESTILO[x.grupo.estilo]}</span>
          </button>
        ))}
      </div>

      <Lista
        titulo={`Para pedir ahora · específicas de ${estilo}`}
        explicacion={`Concursos abiertos o a punto de abrir que mencionan expresamente ${estilo}.`}
        propias={abiertasPropias}
        generales={abiertasGenerales}
        vacio="Ninguna abierta que mencione este estilo ahora mismo."
      />
      <Lista
        titulo={`Próximos 6 meses · específicas de ${estilo}`}
        explicacion="Se convocan cada año y se espera la nueva edición pronto (estimación a partir de los años anteriores)."
        propias={previstasPropias}
        generales={previstasGenerales}
        vacio="Ninguna prevista que mencione este estilo."
      />

      {g.artistas.total > 0 && (
        <section className="bloque">
          <h3>
            Para sus músicos <span className="contador">{g.artistas.total}</span>
          </h3>
          <p className="ayuda">Premios y concursos para personas físicas a los que pueden presentarse los integrantes.</p>
          <ul className="filas">
            {g.artistas.items.map((m) => (
              <FilaConvocatoria key={m.convocatoria.id} m={m} />
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function Lista({
  titulo,
  explicacion,
  propias,
  generales,
  vacio,
}: {
  titulo: string;
  explicacion: string;
  propias: (Coincidencia & { prevista?: string })[];
  generales: (Coincidencia & { prevista?: string })[];
  vacio: string;
}) {
  return (
    <section className="bloque">
      <h3>
        {titulo} <span className="contador">{propias.length}</span>
      </h3>
      <p className="ayuda">{explicacion}</p>
      {propias.length === 0 ? (
        <p className="ayuda">{vacio}</p>
      ) : (
        <ul className="filas">
          {propias.map((m) => (
            <FilaConvocatoria key={m.convocatoria.id} m={m} prevista={m.prevista} />
          ))}
        </ul>
      )}
      {generales.length > 0 && (
        <details className="concesiones">
          <summary>
            Y {generales.length} generales de música o cultura, que valen para cualquiera de tus grupos
          </summary>
          <ul className="filas">
            {generales.map((m) => (
              <FilaConvocatoria key={m.convocatoria.id} m={m} prevista={m.prevista} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
