import { useEffect, useState } from 'react';
import { api } from '../api';
import { TarjetaConvocatoria } from '../components/TarjetaConvocatoria';
import type { Coincidencia } from '../tipos';

export function ParaTi({ irAPerfil }: { irAPerfil: () => void }) {
  const [datos, setDatos] = useState<{ perfilCompleto: boolean; items: Coincidencia[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.paraTi().then(setDatos, (e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="ayuda">Cargando…</p>;

  if (!datos.perfilCompleto) {
    return (
      <div className="vacio">
        <h2>Cuéntanos qué grupos mueves</h2>
        <p>Con tu forma jurídica, dónde trabajas y los estilos de tus grupos te mostramos solo las ayudas a las que puedes optar, y por qué.</p>
        <button className="boton-principal" onClick={irAPerfil}>
          Completar mi perfil
        </button>
      </div>
    );
  }

  const directas = datos.items.filter((m) => m.encaje === 'directo');
  const indirectas = datos.items.filter((m) => m.encaje === 'indirecto');
  const precedentes = datos.items.filter((m) => m.encaje === 'precedente');

  return (
    <section>
      <h2>Puedes pedirlas tú ({directas.length})</h2>
      {directas.length === 0 && <p className="ayuda">Ninguna convocatoria encaja todavía con tu perfil.</p>}
      <div className="lista">
        {directas.map((m) => (
          <Recomendacion key={m.convocatoria.id} m={m} />
        ))}
      </div>

      {indirectas.length > 0 && (
        <>
          <h2>Oportunidades indirectas ({indirectas.length})</h2>
          <p className="ayuda">
            Ayudas que cobran ayuntamientos u otras entidades para programar cultura: son clientes potenciales para vender
            conciertos de tus grupos.
          </p>
          <div className="lista">
            {indirectas.map((m) => (
              <Recomendacion key={m.convocatoria.id} m={m} />
            ))}
          </div>
        </>
      )}

      {precedentes.length > 0 && (
        <>
          <h2>Precedentes ({precedentes.length})</h2>
          <p className="ayuda">
            Ayudas concedidas sin concurso (nominativas o convenios) a proyectos parecidos al tuyo: muestran qué
            administraciones financian estos conciertos y sirven para negociar una propia.
          </p>
          <div className="lista">
            {precedentes.map((m) => (
              <Recomendacion key={m.convocatoria.id} m={m} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Recomendacion({ m }: { m: Coincidencia }) {
  return (
    <TarjetaConvocatoria c={m.convocatoria}>
      <div className="encaje">
        <div className="puntuacion" title="Puntuación de encaje con tu perfil">
          {m.puntuacion}
        </div>
        <ul>
          {m.motivos.map((x) => (
            <li key={x} className="motivo">
              {x}
            </li>
          ))}
          {m.avisos.map((x) => (
            <li key={x} className="aviso">
              {x}
            </li>
          ))}
        </ul>
      </div>
    </TarjetaConvocatoria>
  );
}
