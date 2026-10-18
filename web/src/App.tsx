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
import { Clientes } from './pages/Clientes';
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
  ['clientes', 'Clientes'],
  ['explorar', 'Ayudas'],
  ['donde-tocar', 'Festivales'],
  ['contratos', 'Contratos'],
  ['guardadas', 'Mi lista'],
  ['perfil', 'Mi perfil'],
  // Fuera del menú (enlazadas desde el pie, la portada y las fichas).
  ['calendario', 'Calendario'],
  ['grupos', 'Mis grupos'],
  ['contactos', 'Contactos'],
  ['organismos', 'Organismos'],
  ['mercado', 'Mercado'],
];
const BARRA: [string, string, string][] = [
  ['', 'Inicio', 'inicio'],
  ['clientes', 'Clientes', 'clientes'],
  ['explorar', 'Ayudas', 'ayudas'],
  ['contratos', 'Contratos', 'contratos'],
  ['guardadas', 'Mi lista', 'lista'],
];

const TRAZOS: Record<string, string> = {
  inicio: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  clientes: 'M4 20v-1a5 5 0 0 1 10 0v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M16 20v-1a5 5 0 0 0-2-4M15 4.2a3.5 3.5 0 0 1 0 6.6',
  ayudas: 'M16.5 6.5A6.5 6.5 0 1 0 16.5 17.5M4 10.5h9M4 13.5h9',
  contratos: 'M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h6M10 15.5h6',
  lista: 'm12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 20.5a7 7 0 0 1 14 0',
};

function Icono({ nombre }: { nombre: string }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

const EN_EL_PIE = new Set(['calendario', 'grupos', 'contactos', 'organismos', 'mercado']);
const SECCION_DE: Record<string, string> = { convocatoria: 'explorar', organismo: 'clientes', 'para-ti': '', contrato: 'contratos', programador: 'clientes', festival: 'donde-tocar', contactos: 'clientes', calendario: 'explorar', grupos: 'perfil', organismos: 'clientes', mercado: 'clientes' };

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
          <p className="lema">Coloca a tus grupos de jazz, clásica y ópera: a quién llamar, qué ayudas pedir y qué contratos están abiertos</p>
        </div>
        <nav className="menu-escritorio">
          {SECCIONES.filter(([d]) => !EN_EL_PIE.has(d)).map(([destino, nombre]) => (
            <a key={destino} href={`#/${destino}`} className={destino === seccion ? 'activa' : ''}>
              {nombre}
            </a>
          ))}
        </nav>
        {/* En el móvil: festivales y perfil arriba; el resto en la barra inferior. */}
        <div className="atajos">
          <a href="#/donde-tocar" className={seccion === 'donde-tocar' ? 'activa' : ''}>
            Festivales
          </a>
          <a href="#/perfil" className={seccion === 'perfil' ? 'activa' : ''} aria-label="Mi perfil">
            <Icono nombre="perfil" />
          </a>
        </div>
      </header>
      <nav className="barra-inferior" aria-label="Secciones">
        {BARRA.map(([destino, nombre, icono]) => (
          <a key={destino} href={`#/${destino}`} className={destino === seccion ? 'activa' : ''}>
            <Icono nombre={icono} />
            <span>{nombre}</span>
          </a>
        ))}
      </nav>

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
        {meta && pagina === 'clientes' && <Clientes meta={meta} ruta={ruta} />}
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
          <a href="#/calendario">Calendario</a> · <a href="#/contactos">Directorio de cultura</a> · <a href="#/organismos">Organismos</a> ·{' '}
          <a href="#/mercado">Mercado</a>
        </footer>
      )}
    </div>
  );
}
