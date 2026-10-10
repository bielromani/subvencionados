import { useEffect, useState } from 'react';
import { api } from './api';
import { PaginaConvocatoria } from './pages/Convocatoria';
import { Explorar } from './pages/Explorar';
import { PaginaOrganismo } from './pages/Organismo';
import { Organismos } from './pages/Organismos';
import { ParaTi } from './pages/ParaTi';
import { Perfil } from './pages/Perfil';
import { useRuta } from './ruta';
import type { Meta } from './tipos';

/** Secciones del menú; la página de una convocatoria u organismo marca la sección de la que cuelga. */
const SECCIONES: [string, string][] = [
  ['', 'Para ti'],
  ['explorar', 'Convocatorias'],
  ['organismos', 'Organismos'],
  ['perfil', 'Mi perfil'],
];
const SECCION_DE: Record<string, string> = { convocatoria: 'explorar', organismo: 'organismos' };

export function App() {
  const ruta = useRuta();
  const [pagina = '', id] = ruta.partes;
  const seccion = SECCION_DE[pagina] ?? pagina;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.meta().then(setMeta, () => setError('No se puede conectar con la API. ¿Está arrancado el servidor (npm run dev)?'));
  }, []);

  return (
    <div className="app">
      <header className="cabecera">
        <div>
          <h1>
            <a href="#/">Subvencionados</a>
          </h1>
          <p className="lema">Ayudas públicas para conciertos de jazz, clásica y ópera</p>
        </div>
        <nav>
          {SECCIONES.map(([destino, nombre]) => (
            <a key={destino} href={`#/${destino}`} className={destino === seccion ? 'activa' : ''}>
              {nombre}
            </a>
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
        {meta && pagina === '' && <ParaTi irAPerfil={() => (window.location.hash = '#/perfil')} />}
        {meta && pagina === 'explorar' && <Explorar meta={meta} ruta={ruta} />}
        {meta && pagina === 'convocatoria' && id && <PaginaConvocatoria id={id} />}
        {meta && pagina === 'organismos' && <Organismos meta={meta} ruta={ruta} />}
        {meta && pagina === 'organismo' && id && <PaginaOrganismo id={id} />}
        {meta && pagina === 'perfil' && <Perfil meta={meta} alGuardar={() => (window.location.hash = '#/')} />}
        {meta && !SECCIONES.some(([d]) => d === seccion) && <p className="error">Esta página no existe.</p>}
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
