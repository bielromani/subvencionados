import { useEffect, useState } from 'react';
import { MensajeCrm } from '../components/MensajeCrm';
import { crm, type MensajeBandeja, NOMBRE_OPORTUNIDAD } from '../crm';
import { enlace } from '../ruta';
import { useCuenta } from '../sincronizar';

/** Bandeja de aprobación: borradores por revisar, aprobados por enviar y envíos programados. */
export function Bandeja() {
  const usuario = useCuenta().cuenta?.usuario;
  const [datos, setDatos] = useState<{ items: MensajeBandeja[]; envioConectado: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = () => crm.bandeja().then(setDatos, (e: Error) => setError(e.message));
  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario?.email]);

  if (!usuario) return <p className="llamada">La bandeja es de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;
  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="ayuda">Cargando…</p>;
  return (
    <section>
      <section className="bloque">
        <h3>
          Bandeja de aprobación <span className="contador">{datos.items.length}</span>
        </h3>
        <p className="ayuda">
          Nada sale sin tu visto bueno. {datos.envioConectado ? 'Puedes enviarlo desde tu correo o programarlo (y cancelarlo hasta que salga).' : 'Aprobado, se abre en tu correo para enviarlo; luego confirma «Ya lo he enviado».'}
        </p>
        {datos.items.length === 0 && <p className="ayuda">No hay nada pendiente. Los seguimientos aparecerán aquí unos días después de cada envío.</p>}
      </section>
      {datos.items.map((m) => (
        <section key={m.id} className="bloque">
          <h3>
            <a href={m.entidad.ref ? enlace('programador', m.entidad.ref) : enlace('entidad', m.entidad.id)}>{m.entidad.nombre}</a>
          </h3>
          <p className="ayuda">
            {NOMBRE_OPORTUNIDAD[m.oportunidad.tipo]}: {m.oportunidad.titulo}
          </p>
          <MensajeCrm m={m} destinatario={m.destinatario} envioConectado={datos.envioConectado} alCambiar={() => void cargar()} />
        </section>
      ))}
    </section>
  );
}
