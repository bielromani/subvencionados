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
import { Cuenta } from './pages/Cuenta';
import { crm } from './crm';
import { useCuenta } from './sincronizar';
import { Bandeja } from './pages/Bandeja';
import { Propuestas } from './pages/Propuestas';
import { Catalogo } from './pages/Catalogo';
import { Resultados } from './pages/Resultados';
import { PaginaEntidad, Seguimiento } from './pages/Seguimiento';
import { useRuta } from './ruta';
import type { Meta } from './tipos';

/** Grupos del menú lateral. Con cuenta, el trabajo diario va primero; sin ella, la exploración de datos públicos. */
type Entrada = [destino: string, nombre: string, icono: string];
const MENU: [string, Entrada[]][] = [
  ['Explorar', [['', 'Inicio', 'inicio'], ['clientes', 'Clientes', 'clientes'], ['explorar', 'Ayudas', 'ayudas'], ['donde-tocar', 'Festivales', 'festivales'], ['contratos', 'Licitaciones', 'contratos']]],
  ['Mi trabajo', [['guardadas', 'Mi lista', 'lista'], ['perfil', 'Mi perfil', 'perfil']]],
  ['Consulta', [['mercado', 'Datos del sector', 'grafico']]],
];
const MENU_CUENTA: [string, Entrada[]][] = [
  ['Trabajo', [['', 'Hoy', 'inicio'], ['propuestas', 'Propuestas', 'propuestas'], ['bandeja', 'Bandeja', 'bandeja'], ['seguimiento', 'Mis entidades', 'entidades'], ['resultados', 'Resultados', 'resultados'], ['clientes', 'Clientes', 'clientes']]],
  ['Oportunidades', [['explorar', 'Ayudas', 'ayudas'], ['contratos', 'Licitaciones', 'contratos'], ['donde-tocar', 'Festivales', 'festivales']]],
  ['Mi cartera', [['catalogo', 'Catálogo', 'catalogo'], ['cartas', 'Cartas y firma', 'cartas'], ['guardadas', 'Mi lista', 'lista']]],
  ['Consulta', [['mercado', 'Datos del sector', 'grafico']]],
];
/** Páginas fuera del menú (enlazadas desde el pie, la portada y las fichas). */
const OTRAS = ['perfil', 'grupos'];
const BARRA: Entrada[] = [
  ['', 'Inicio', 'inicio'],
  ['clientes', 'Clientes', 'clientes'],
  ['explorar', 'Ayudas', 'ayudas'],
  ['contratos', 'Licitaciones', 'contratos'],
  ['mas', 'Más', 'mas'],
];
const BARRA_CUENTA: Entrada[] = [
  ['', 'Hoy', 'inicio'],
  ['propuestas', 'Correos', 'propuestas'],
  ['bandeja', 'Bandeja', 'bandeja'],
  ['seguimiento', 'Entidades', 'entidades'],
  ['mas', 'Más', 'mas'],
];
/** Título y explicación de cada sección (las fichas y el panel «Hoy» llevan el suyo). */
const CABECERAS: Record<string, [string, string]> = {
  '': ['Inicio', 'Coloca a tus grupos de jazz, clásica y ópera: a quién llamar, qué ayudas pedir y qué contratos están abiertos.'],
  propuestas: ['Propuestas', 'Un correo ya escrito para cada sitio donde encaja tu catálogo. Revísalo, ajústalo y envíalo tú.'],
  bandeja: ['Bandeja', 'Lo que tienes por enviar y la constancia de lo que ya has enviado.'],
  seguimiento: ['Mis entidades', 'Ayuntamientos, teatros y festivales con los que estás en contacto.'],
  clientes: ['Clientes', 'Quién contrata música en España, qué estilos programa y cuándo.'],
  explorar: ['Ayudas', 'Subvenciones públicas para tus grupos y para quien los contrata.'],
  contratos: ['Licitaciones', 'Contratos públicos de conciertos: abiertos y adjudicados.'],
  'donde-tocar': ['Festivales', 'Festivales, ciclos y circuitos, y dónde se externaliza su gestión.'],
  catalogo: ['Catálogo', 'Tus producciones: con ellas se eligen los sitios y se escriben los correos.'],
  cartas: ['Cartas y firma', 'Cómo se escriben tus correos y quién los firma.'],
  resultados: ['Resultados', 'Qué funciona: cuántos contactos responden, en qué correo y con qué propuestas.'],
  guardadas: ['Mi lista', 'Lo que has marcado para seguir.'],
  perfil: ['Mi perfil', 'Tus grupos, estilos y territorio.'],
  calendario: ['Ayudas', 'Subvenciones públicas para tus grupos y para quien los contrata.'],
  grupos: ['Mis grupos', 'Lo que encaja con cada uno de tus grupos.'],
  contactos: ['Clientes', 'Quién contrata música en España, qué estilos programa y cuándo.'],
  organismos: ['Datos del sector', 'Cuánto dinero público va a la música y quién lo da.'],
  mercado: ['Datos del sector', 'Cuánto dinero público va a la música y quién lo da.'],
};

const TRAZOS: Record<string, string> = {
  inicio: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  clientes: 'M4 20v-1a5 5 0 0 1 10 0v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M16 20v-1a5 5 0 0 0-2-4M15 4.2a3.5 3.5 0 0 1 0 6.6',
  ayudas: 'M16.5 6.5A6.5 6.5 0 1 0 16.5 17.5M4 10.5h9M4 13.5h9',
  contratos: 'M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h6M10 15.5h6',
  lista: 'm12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 20.5a7 7 0 0 1 14 0',
  bandeja: 'M3.5 13.5 6 5h12l2.5 8.5v5h-17zM3.5 13.5h5l1 2.5h5l1-2.5h5',
  entidades: 'M4 20V9l8-5 8 5v11M9 20v-6h6v6M4 20h16',
  catalogo: 'M5 4.5h10a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3zM5 16.5a3 3 0 0 1 3-3h10',
  propuestas: 'M4 6.5 12 12l8-5.5M4 6h16v12H4zM14.5 3.5l1.2 1.8M17.5 2.5v2',
  festivales: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0',
  marca: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
  grafico: 'M4 20V11M10 20V5M16 20v-6M21 20H3',
  resultados: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  cartas: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
};

function Icono({ nombre, tam = 20 }: { nombre: string; tam?: number }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" width={tam} height={tam} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

/** Páginas hermanas que se muestran como pestañas bajo la misma cabecera. */
const SUBSECCIONES: [string, string][][] = [
  [
    ['clientes', 'Quién contrata'],
    ['contactos', 'Directorio de cultura'],
  ],
  [
    ['explorar', 'Lista'],
    ['calendario', 'Calendario'],
  ],
  [
    ['mercado', 'Mercado'],
    ['organismos', 'Organismos'],
  ],
];

const SECCION_DE: Record<string, string> = { convocatoria: 'explorar', 'para-ti': '', contrato: 'contratos', programador: 'clientes', festival: 'donde-tocar', contactos: 'clientes', calendario: 'explorar', grupos: 'perfil', cuenta: 'perfil', entidad: 'seguimiento', organismos: 'mercado', organismo: 'mercado' };

export function App() {
  const ruta = useRuta();
  const [pagina = '', id] = ruta.partes;
  const seccion = SECCION_DE[pagina] ?? pagina;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cuentaEstado = useCuenta().cuenta;
  const usuario = cuentaEstado?.usuario;
  // Web privada sin sesión: solo la pantalla de entrar (nada más se pide a la API).
  const cerrada = !cuentaEstado || (!!cuentaEstado.privado && !usuario);
  const menu = usuario ? MENU_CUENTA : MENU;
  const barra = usuario ? BARRA_CUENTA : BARRA;
  const [masAbierto, setMasAbierto] = useState(false);
  useEffect(() => setMasAbierto(false), [ruta.partes.join('/')]);
  const conocida = OTRAS.includes(seccion) || MENU.concat(MENU_CUENTA).some(([, xs]) => xs.some(([d]) => d === seccion)) || pagina === 'cuenta';
  const cabecera = !id && pagina !== '' && pagina !== 'para-ti' ? CABECERAS[pagina] : undefined;
  const subsecciones = SUBSECCIONES.find((g) => g.some(([d]) => d === pagina));
  // Borradores y aprobados pendientes de enviar: el número junto a «Bandeja».
  const [pendientes, setPendientes] = useState(0);
  const [propuestas, setPropuestas] = useState(0);
  useEffect(() => {
    if (!usuario || cerrada) return;
    crm.bandeja().then((r) => setPendientes(r.items.filter((m) => m.estado !== 'programado').length), () => setPendientes(0));
    crm.propuestas().then((r) => setPropuestas(r.items.length), () => setPropuestas(0));
  }, [usuario?.email, ruta.partes.join('/')]);
  const contador = (destino: string) => {
    const n = destino === 'bandeja' ? pendientes : destino === 'propuestas' ? propuestas : 0;
    return n > 0 ? <span className="insignia">{n}</span> : null;
  };

  useEffect(() => {
    if (cerrada) return;
    api.meta().then(setMeta, () => setError('No se puede conectar con la API. ¿Está arrancado el servidor (npm run dev)?'));
  }, [cerrada]);

  const entrada = ([destino, nombre, icono]: Entrada) => (
    <a key={destino} href={`#/${destino}`} className={destino === seccion ? 'activa' : ''} aria-current={destino === seccion ? 'page' : undefined}>
      <Icono nombre={icono} />
      <span className="entrada-nombre">{nombre}</span>
      {contador(destino)}
    </a>
  );

  if (cerrada)
    return cuentaEstado ? (
      <main className="app-privada">
        <Cuenta ruta={ruta} />
      </main>
    ) : (
      <p className="ayuda app-privada">Cargando…</p>
    );

  return (
    <div className="app">
      <aside className="lateral" aria-label="Menú">
        <a className="marca-app" href="#/">
          <span className="marca-logo">
            <Icono nombre="marca" tam={18} />
          </span>
          <span>
            <strong>Subvencionados</strong>
            <small>{usuario ? usuario.email : 'Música en directo · España'}</small>
          </span>
        </a>
        <nav className="menu-lateral" aria-label="Principal">
          {menu.map(([grupo, xs]) => (
            <div key={grupo} className="menu-grupo">
              <p className="menu-titulo">{grupo}</p>
              {xs.map(entrada)}
            </div>
          ))}
        </nav>
        <a className={`menu-cuenta${seccion === 'perfil' ? ' activa' : ''}`} href={usuario ? '#/cuenta' : '#/perfil'}>
          <span className="avatar">{usuario ? usuario.email.slice(0, 2).toUpperCase() : <Icono nombre="perfil" tam={18} />}</span>
          <span>
            <strong>{usuario ? 'Mi cuenta' : 'Mi perfil'}</strong>
            <small>{usuario ? 'Perfil, avisos y sesión' : 'Entra o crea una cuenta'}</small>
          </span>
        </a>
      </aside>

      <header className="barra-movil">
        <a className="marca-app" href="#/">
          <span className="marca-logo">
            <Icono nombre="marca" tam={16} />
          </span>
          <strong>Subvencionados</strong>
        </a>
        <a className="avatar" href={usuario ? '#/cuenta' : '#/perfil'} aria-label={usuario ? 'Mi cuenta' : 'Mi perfil'}>
          {usuario ? usuario.email.slice(0, 2).toUpperCase() : <Icono nombre="perfil" tam={18} />}
        </a>
      </header>

      <nav className="barra-inferior" aria-label="Secciones">
        {barra.map(([destino, nombre, icono]) =>
          destino === 'mas' ? (
            <button key="mas" type="button" className={masAbierto ? 'activa' : ''} aria-expanded={masAbierto} onClick={() => setMasAbierto((x) => !x)}>
              <Icono nombre={icono} />
              <span>{nombre}</span>
            </button>
          ) : (
            <a key={destino} href={`#/${destino}`} className={destino === seccion ? 'activa' : ''}>
              <Icono nombre={icono} />
              <span>{nombre}</span>
              {contador(destino)}
            </a>
          ),
        )}
      </nav>
      {masAbierto && (
        <div className="hoja-mas" role="dialog" aria-label="Más secciones">
          {menu.map(([grupo, xs]) => (
            <div key={grupo} className="menu-grupo">
              <p className="menu-titulo">{grupo}</p>
              {xs.map(entrada)}
            </div>
          ))}
        </div>
      )}

      <div className="contenido">
      {meta && meta.total === 0 && (
        <p className="aviso-demo">
          La base de datos está vacía. Ejecuta <code>npm run importar</code> para cargar lo descargado en{' '}
          <code>datos/bdns/</code>.
        </p>
      )}

      <main className="principal">
        {cabecera && (
          <header className="cabecera-pagina">
            <h1>{cabecera[0]}</h1>
            {cabecera[1] && <p>{cabecera[1]}</p>}
            {subsecciones && (
              <nav className="subsecciones segmentado" aria-label="Vistas">
                {subsecciones.map(([d, n]) => (
                  <a key={d} href={`#/${d}`} className={d === pagina ? 'activa' : ''} aria-current={d === pagina ? 'page' : undefined}>
                    {n}
                  </a>
                ))}
              </nav>
            )}
          </header>
        )}
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
        {meta && pagina === 'cuenta' && <Cuenta ruta={ruta} />}
        {meta && pagina === 'bandeja' && <Bandeja />}
        {meta && pagina === 'propuestas' && <Propuestas meta={meta} />}
        {meta && (pagina === 'catalogo' || pagina === 'cartas') && <Catalogo key={pagina} modo={pagina === 'cartas' ? 'cartas' : 'producciones'} />}
        {meta && pagina === 'resultados' && <Resultados />}
        {meta && pagina === 'seguimiento' && <Seguimiento />}
        {meta && pagina === 'entidad' && id && <PaginaEntidad id={id} />}
        {meta && pagina === 'perfil' && <Perfil meta={meta} alGuardar={() => (window.location.hash = '#/')} />}
        {meta && !conocida && <p className="error">Esta página no existe.</p>}
      </main>

      {meta && (
        <footer className="pie">
          {(meta.utiles ?? meta.musicales).toLocaleString('es-ES')} subvenciones útiles para colocar grupos, de {meta.total.toLocaleString('es-ES')}{' '}
          descargadas · Fuente: {meta.fuente}
          {meta.ultimaActualizacion && ` · Actualizado el ${new Date(meta.ultimaActualizacion).toLocaleDateString('es-ES')}`}
        </footer>
      )}
      </div>
    </div>
  );
}
