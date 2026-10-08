import { useEffect, useState } from 'react';
import { api } from './api';
import { Explorar } from './pages/Explorar';
import { ParaTi } from './pages/ParaTi';
import { Perfil } from './pages/Perfil';
import type { Meta } from './tipos';

type Pestana = 'para-ti' | 'explorar' | 'perfil';
const PESTANAS: [Pestana, string][] = [
  ['para-ti', 'Para ti'],
  ['explorar', 'Explorar'],
  ['perfil', 'Mi perfil'],
];

export function App() {
  const [pestana, setPestana] = useState<Pestana>('para-ti');
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.meta().then(setMeta, () => setError('No se puede conectar con la API. ¿Está arrancado el servidor (npm run dev)?'));
  }, []);

  return (
    <div className="app">
      <header className="cabecera">
        <div>
          <h1>Subvencionados</h1>
          <p className="lema">Ayudas públicas para conciertos de jazz, clásica y ópera</p>
        </div>
        <nav>
          {PESTANAS.map(([id, nombre]) => (
            <button key={id} className={id === pestana ? 'activa' : ''} onClick={() => setPestana(id)}>
              {nombre}
            </button>
          ))}
        </nav>
      </header>

      {meta && meta.total === 0 && (
        <p className="aviso-demo">
          La base de datos está vacía. Ejecuta <code>npm run importar</code> para cargar lo descargado en{' '}
          <code>datos/bdns/</code>.
        </p>
      )}

      <main>
        {error && <p className="error">{error}</p>}
        {meta && pestana === 'para-ti' && <ParaTi irAPerfil={() => setPestana('perfil')} />}
        {meta && pestana === 'explorar' && <Explorar meta={meta} />}
        {meta && pestana === 'perfil' && <Perfil meta={meta} alGuardar={() => setPestana('para-ti')} />}
      </main>

      {meta && (
        <footer className="pie">
          {meta.musicales.toLocaleString('es-ES')} convocatorias de música de {meta.total.toLocaleString('es-ES')}{' '}
          descargadas · Fuente: {meta.fuente}
          {meta.ultimaActualizacion && ` · Actualizado el ${new Date(meta.ultimaActualizacion).toLocaleDateString('es-ES')}`}
        </footer>
      )}
    </div>
  );
}
