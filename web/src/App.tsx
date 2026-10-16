import { useEffect, useState } from 'react';
import { api } from './api';
import { Calendario } from './pages/Calendario';
import { PaginaContrato } from './pages/Contrato';
import { Contratos } from './pages/Contratos';
import { PaginaConvocatoria } from './pages/Convocatoria';
import { DondeTocar } from './pages/DondeTocar';
import { Explorar } from './pages/Explorar';
import { PaginaFestival, PaginaProgramador } from './pages/FichaDirectorio';
import { Grupos } from './pages/Grupos';
import { Contactos } from './pages/Contactos';
import { Guardadas } from './pages/Guardadas';
import { Inicio } from './pages/Inicio';
import { Mercado } from './pages/Mercado';
import { PaginaOrganismo } from './pages/Organismo';
import { Organismos } from './pages/Organismos';
import { ParaTi } from './pages/ParaTi';
import { Perfil } from './pages/Perfil';
import { useRuta } from './ruta';
import type { Meta } from './tipos';

/** Secciones del menú; la página de una convocatoria u organismo marca la sección de la que cuelga. */
const SECCIONES: [string, string][] = [
  ['', 'Inicio'],
  ['explorar', 'Subvenciones'],
  ['guardadas', 'Guardadas'],
  ['contactos', 'Contactos'],
  ['donde-tocar', 'Dónde tocar'],
  ['contratos', 'Contratos'],
  ['grupos', 'Mis grupos'],
  ['calendario', 'Calendario'],
  ['perfil', 'Mi perfil'],
  // Fuera del menú (enlazadas desde el pie y desde las fichas).
  ['organismos', 'Organismos'],
  ['mercado', 'Mercado'],
];
const EN_EL_PIE = new Set(['organismos', 'mercado']);
const SECCION_DE: Record<string, string> = { convocatoria: 'explorar', organismo: 'organismos', 'para-ti': '', contrato: 'contratos', programador: 'donde-tocar', festival: 'donde-tocar' };

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
          {SECCIONES.filter(([d]) => !EN_EL_PIE.has(d)).map(([destino, nombre]) => (
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
        {meta && pagina === '' && <Inicio />}
        {meta && pagina === 'para-ti' && <ParaTi irAPerfil={() => (window.location.hash = '#/perfil')} />}
        {meta && pagina === 'grupos' && <Grupos ruta={ruta} />}
        {meta && pagina === 'explorar' && <Explorar meta={meta} ruta={ruta} />}
        {meta && pagina === 'guardadas' && <Guardadas />}
        {meta && pagina === 'contactos' && <Contactos meta={meta} ruta={ruta} />}
        {meta && pagina === 'convocatoria' && id && <PaginaConvocatoria id={id} />}
        {meta && pagina === 'contratos' && <Contratos meta={meta} ruta={ruta} />}
        {meta && pagina === 'contrato' && id && <PaginaContrato id={id} />}
        {meta && pagina === 'donde-tocar' && <DondeTocar key={ruta.params.get('ver') ?? ''} meta={meta} ruta={ruta} />}
        {meta && pagina === 'programador' && id && <PaginaProgramador id={id} />}
        {meta && pagina === 'festival' && id && <PaginaFestival id={id} />}
        {meta && pagina === 'calendario' && <Calendario meta={meta} ruta={ruta} />}
        {meta && pagina === 'organismos' && <Organismos meta={meta} ruta={ruta} />}
        {meta && pagina === 'mercado' && <Mercado meta={meta} ruta={ruta} />}
        {meta && pagina === 'organismo' && id && <PaginaOrganismo id={id} />}
        {meta && pagina === 'perfil' && <Perfil meta={meta} alGuardar={() => (window.location.hash = '#/')} />}
        {meta && !SECCIONES.some(([d]) => d === seccion) && <p className="error">Esta página no existe.</p>}
      </main>

      {meta && (
        <footer className="pie">
          {(meta.utiles ?? meta.musicales).toLocaleString('es-ES')} subvenciones útiles para colocar grupos, de {meta.total.toLocaleString('es-ES')}{' '}
          descargadas · Fuente: {meta.fuente}
          {meta.ultimaActualizacion && ` · Actualizado el ${new Date(meta.ultimaActualizacion).toLocaleDateString('es-ES')}`}
          {' · '}
          <a href="#/organismos">Organismos</a> · <a href="#/mercado">Mercado</a>
        </footer>
      )}
    </div>
  );
}
