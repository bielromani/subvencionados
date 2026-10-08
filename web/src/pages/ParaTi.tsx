import { useEffect, useState } from 'react';
import { api } from '../api';
import { TarjetaConvocatoria } from '../components/TarjetaConvocatoria';
import type { Coincidencia } from '../tipos';

type Recomendaciones = Awaited<ReturnType<typeof api.paraTi>>;

const SECCIONES: [keyof Omit<Recomendaciones, 'perfilCompleto'>, string, string][] = [
  ['abiertas', 'Puedes pedirlas ahora', 'Concursos con el plazo abierto o a punto de abrir a los que puedes presentarte.'],
  [
    'recurrentes',
    'Prepara las próximas',
    'Concursos que encajan contigo y cerraron en los últimos 18 meses: la mayoría se convocan cada año.',
  ],
  [
    'indirectas',
    'Oportunidades indirectas',
    'Ayudas que cobran ayuntamientos u otras entidades para programar cultura: clientes potenciales para vender conciertos de tus grupos.',
  ],
  [
    'precedentes',
    'Precedentes',
    'Concesiones directas o nominativas de los últimos 3 años a proyectos parecidos: muestran qué administraciones pagan estos conciertos y cuánto, y sirven para negociar una propia.',
  ],
];

export function ParaTi({ irAPerfil }: { irAPerfil: () => void }) {
  const [datos, setDatos] = useState<Recomendaciones | null>(null);
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
        <p>
          Con tu forma jurídica, dónde trabajas y los estilos de tus grupos te mostramos solo las ayudas a las que puedes
          optar, y por qué.
        </p>
        <button className="boton-principal" onClick={irAPerfil}>
          Completar mi perfil
        </button>
      </div>
    );
  }

  return (
    <section>
      {SECCIONES.map(([clave, titulo, explicacion]) => (
        <div key={clave}>
          <h2>
            {titulo} ({datos[clave].length}
            {datos[clave].length === 50 ? '+' : ''})
          </h2>
          <p className="ayuda">{explicacion}</p>
          {datos[clave].length === 0 && <p className="ayuda">Nada por ahora.</p>}
          <div className="lista">
            {datos[clave].map((m) => (
              <Recomendacion key={m.convocatoria.id} m={m} />
            ))}
          </div>
        </div>
      ))}
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
