// Anexos a medida (dossieres con producciones de varias líneas) y campañas (unas producciones, a un territorio, con
// su carta y su anexo). Se editan en «Cartas y firma»; las propuestas de una campaña se preparan en «Propuestas».
import { useEffect, useState } from 'react';
import {
  type Anexo,
  type Campana,
  type CartaCampana,
  crm,
  type Espectaculo,
  LINEA_DE_TIPO,
  NOMBRE_LINEA_CARTA,
  NOMBRE_TIPO,
  type PlantillasCarta,
  type TextosAnexo,
  urlDossierAnexo,
} from '../crm';

const nuevoId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const ANEXO_VACIO: TextosAnexo = { titulo: '', subtitulo: '', condiciones: '', notaFinal: '' };
const CARTA_VACIA: CartaCampana = { asunto: '', intro: '', texto: '', cierre: '' };
const vacia = (c: CartaCampana) => !Object.values(c).some((x) => x.trim());

/** Pestañas Castellano / Catalán. */
function Idiomas({ idioma, poner }: { idioma: 'es' | 'ca'; poner: (i: 'es' | 'ca') => void }) {
  return (
    <div className="segmentado segmentado-corto" role="tablist" aria-label="Idioma">
      {(
        [
          ['es', 'Castellano'],
          ['ca', 'Catalán'],
        ] as ['es' | 'ca', string][]
      ).map(([v, n]) => (
        <button key={v} type="button" role="tab" aria-selected={idioma === v} className={idioma === v ? 'activa' : ''} onClick={() => poner(v)}>
          {n}
        </button>
      ))}
    </div>
  );
}

/** Elegir producciones del catálogo, en orden: las marcadas se pueden subir para cambiar el orden. */
function ElegirProducciones({ catalogo, elegidas, cambiar }: { catalogo: Espectaculo[]; elegidas: string[]; cambiar: (ids: string[]) => void }) {
  const porId = new Map(catalogo.map((e) => [e.id, e]));
  const resto = catalogo.filter((e) => !elegidas.includes(e.id)).sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es'));
  const subir = (i: number) => {
    if (i === 0) return;
    const xs = [...elegidas];
    [xs[i - 1], xs[i]] = [xs[i]!, xs[i - 1]!];
    cambiar(xs);
  };
  return (
    <div className="elegir-producciones">
      {elegidas.length > 0 && (
        <ol className="producciones-elegidas">
          {elegidas.map((id, i) => {
            const e = porId.get(id);
            return (
              <li key={id}>
                <span>
                  <strong>{e?.nombre ?? 'Producción que ya no está en el catálogo'}</strong> {e && <span className="ayuda">· {NOMBRE_LINEA_CARTA[LINEA_DE_TIPO[e.tipo]]}</span>}
                </span>
                <span>
                  {i > 0 && (
                    <button type="button" className="accion" onClick={() => subir(i)} aria-label="Subir">
                      ↑
                    </button>
                  )}{' '}
                  <button type="button" className="accion" onClick={() => cambiar(elegidas.filter((x) => x !== id))}>
                    Quitar
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <label>
        Añadir una producción
        <select value="" onChange={(e) => e.target.value && cambiar([...elegidas, e.target.value])}>
          <option value="">Elige…</option>
          {resto.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre} ({NOMBRE_TIPO[e.tipo]})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Guardar({ cambiado, guardar }: { cambiado: boolean; guardar: () => Promise<string> }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (!cambiado && !aviso) return null;
  return (
    <div className="barra-guardar" role="status">
      <span>{cambiado ? 'Tienes cambios sin guardar.' : aviso}</span>
      {cambiado && (
        <button
          type="button"
          className="boton"
          disabled={ocupado}
          onClick={() => {
            setOcupado(true);
            void guardar()
              .then(setAviso, (e: Error) => setAviso(e.message))
              .finally(() => setOcupado(false));
          }}
        >
          {ocupado ? 'Guardando…' : 'Guardar'}
        </button>
      )}
    </div>
  );
}

/** Anexos a medida: un solo PDF con las producciones elegidas, aunque sean de líneas distintas. */
export function Anexos({ catalogo }: { catalogo: Espectaculo[] }) {
  const [xs, setXs] = useState<Anexo[] | null>(null);
  const [guardados, setGuardados] = useState<Anexo[]>([]);
  const [idioma, setIdioma] = useState<'es' | 'ca'>('es');
  const [abierto, setAbierto] = useState<string | null>(null);
  useEffect(() => {
    crm.ajustes().then((r) => (setXs(r.ajustes.anexos ?? []), setGuardados(r.ajustes.anexos ?? [])), () => setXs([]));
  }, []);
  if (!xs) return <p className="ayuda">Cargando…</p>;
  const cambiado = JSON.stringify(xs) !== JSON.stringify(guardados);
  const poner = (id: string, c: Partial<Anexo>) => setXs(xs.map((a) => (a.id === id ? { ...a, ...c } : a)));
  const nuevo = (a: Partial<Anexo> = {}) => {
    const x: Anexo = { id: nuevoId(), nombre: 'Nuevo anexo', espectaculos: [], es: { ...ANEXO_VACIO }, ca: { ...ANEXO_VACIO }, ...a };
    setXs([...xs, x]);
    setAbierto(x.id);
  };
  // Atajo: el anexo de ópera y sinfónico-coral (sinfónico primero, como el PDF de Joan).
  const lirico = () => {
    const de = (ls: string[]) => catalogo.filter((e) => e.enCartas !== false && ls.includes(LINEA_DE_TIPO[e.tipo])).map((e) => e.id);
    nuevo({
      nombre: 'Ópera y sinfónico-coral',
      espectaculos: [...de(['sinfonico']), ...de(['opera'])],
      es: { ...ANEXO_VACIO, titulo: 'Propuestas Sinfónico-Corales y de Ópera · Años 2027 y 2028' },
      ca: { ...ANEXO_VACIO, titulo: 'Propostes Simfònico-Corals i d’Òpera · Anys 2027 i 2028' },
    });
  };
  const guardar = async () => {
    const r = await crm.guardarAnexos(xs);
    setXs(r.anexos);
    setGuardados(r.anexos);
    return 'Anexos guardados.';
  };
  const campo = (a: Anexo, k: keyof TextosAnexo, etiqueta: string, filas: number, pista: string) => (
    <label>
      {etiqueta}
      {filas > 1 ? (
        <textarea rows={filas} value={a[idioma][k]} placeholder={pista} onChange={(e) => poner(a.id, { [idioma]: { ...a[idioma], [k]: e.target.value } })} />
      ) : (
        <input value={a[idioma][k]} placeholder={pista} onChange={(e) => poner(a.id, { [idioma]: { ...a[idioma], [k]: e.target.value } })} />
      )}
    </label>
  );
  return (
    <div className="plantillas">
      <p className="ayuda">
        Un anexo a medida es un dossier en PDF con las producciones que elijas, aunque sean de líneas distintas (por ejemplo Fidelio, La flauta mágica, el Réquiem y la Pasión). Se puede
        descargar y adjuntar a una campaña. Lo que dejes vacío (título, entidades, condiciones, nota final) sale del dossier de la línea principal. Las páginas de cada producción se editan en su
        ficha del Catálogo («En el dossier PDF»).
      </p>
      <div className="barra-herramientas">
        <button type="button" className="boton" onClick={() => nuevo()}>
          Nuevo anexo
        </button>
        <button type="button" className="accion" onClick={lirico}>
          Crear el de ópera y sinfónico-coral
        </button>
      </div>
      {xs.map((a) => (
        <details key={a.id} className="bloque formulario" open={abierto === a.id} onToggle={(e) => (e.currentTarget.open ? setAbierto(a.id) : abierto === a.id && setAbierto(null))}>
          <summary>
            <strong>{a.nombre}</strong> <span className="ayuda">· {a.espectaculos.length} producciones</span>
          </summary>
          <label>
            Nombre (para reconocerlo en la app)
            <input value={a.nombre} onChange={(e) => poner(a.id, { nombre: e.target.value })} />
          </label>
          <h4>Producciones, en este orden</h4>
          <ElegirProducciones catalogo={catalogo} elegidas={a.espectaculos} cambiar={(espectaculos) => poner(a.id, { espectaculos })} />
          <h4>Portada y condiciones</h4>
          <Idiomas idioma={idioma} poner={setIdioma} />
          {campo(a, 'titulo', 'Título (lo que va tras « · » sale debajo, más pequeño)', 1, 'Vacío: el de la línea principal')}
          {campo(a, 'subtitulo', 'Entidades', 1, 'Vacío: las de las líneas de sus producciones')}
          {campo(a, 'condiciones', 'Condiciones generales', 6, 'Vacío: las de la línea principal')}
          {campo(a, 'notaFinal', 'Nota final', 2, 'Vacío: la de la línea principal')}
          <p>
            {guardados.some((g) => g.id === a.id) ? (
              <>
                <a className="boton-secundario" href={urlDossierAnexo(a.id, idioma)} target="_blank" rel="noreferrer">
                  Ver el PDF
                </a>{' '}
                <a href={urlDossierAnexo(a.id, idioma, true)}>Descargarlo</a> <span className="ayuda">(con lo que está guardado)</span>
              </>
            ) : (
              <span className="ayuda">Guárdalo para verlo en PDF.</span>
            )}{' '}
            <button type="button" className="accion" onClick={() => window.confirm(`¿Borrar el anexo «${a.nombre}»?`) && setXs(xs.filter((x) => x.id !== a.id))}>
              Borrar
            </button>
          </p>
        </details>
      ))}
      {!xs.length && <p className="ayuda">Aún no hay anexos a medida.</p>}
      <Guardar cambiado={cambiado} guardar={guardar} />
    </div>
  );
}

/** Campañas: solo estas producciones, solo a este territorio, con su carta y su anexo. */
export function Campanas({ catalogo, plantillas }: { catalogo: Espectaculo[]; plantillas: PlantillasCarta | null }) {
  const [xs, setXs] = useState<Campana[] | null>(null);
  const [guardadas, setGuardadas] = useState<Campana[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [territorio, setTerritorio] = useState<{ ccaa: string; provincias: string[] }[]>([]);
  const [idioma, setIdioma] = useState<'es' | 'ca'>('es');
  const [abierta, setAbierta] = useState<string | null>(null);
  useEffect(() => {
    crm.ajustes().then(
      (r) => (setXs(r.ajustes.campanas ?? []), setGuardadas(r.ajustes.campanas ?? []), setAnexos(r.ajustes.anexos ?? [])),
      () => setXs([]),
    );
    crm.territorio().then((r) => setTerritorio(r.items), () => undefined);
  }, []);
  if (!xs) return <p className="ayuda">Cargando…</p>;
  const cambiado = JSON.stringify(xs) !== JSON.stringify(guardadas);
  const poner = (id: string, c: Partial<Campana>) => setXs(xs.map((a) => (a.id === id ? { ...a, ...c } : a)));
  // La carta de la línea de la primera producción, para empezar a escribir la de la campaña.
  const deLinea = (ids: string[], i: 'es' | 'ca'): CartaCampana | null => {
    const e = catalogo.find((x) => x.id === ids[0]);
    const t = e && plantillas ? plantillas[i].lineas[LINEA_DE_TIPO[e.tipo]] : null;
    return t ? { asunto: t.asunto, intro: t.intro, texto: t.texto, cierre: t.cierre } : null;
  };
  const cambiarProducciones = (c: Campana, espectaculos: string[]) => {
    // Con la carta aún vacía, se rellena con la de la línea de la primera producción.
    const es = vacia(c.es) ? (deLinea(espectaculos, 'es') ?? c.es) : c.es;
    const ca = vacia(c.ca) ? (deLinea(espectaculos, 'ca') ?? c.ca) : c.ca;
    poner(c.id, { espectaculos, es, ca });
  };
  const nueva = () => {
    const x: Campana = { id: nuevoId(), nombre: 'Nueva campaña', espectaculos: [], ccaa: [], provincias: [], anexo: null, es: { ...CARTA_VACIA }, ca: { ...CARTA_VACIA } };
    setXs([...xs, x]);
    setAbierta(x.id);
  };
  const guardar = async () => {
    const r = await crm.guardarCampanas(xs);
    setXs(r.campanas);
    setGuardadas(r.campanas);
    return 'Campañas guardadas. Para preparar sus propuestas, ve a Propuestas y elige la campaña.';
  };
  const conmutar = (lista: string[], x: string) => (lista.includes(x) ? lista.filter((y) => y !== x) : [...lista, x]);
  return (
    <div className="plantillas">
      <p className="ayuda">
        Una campaña ofrece solo unas producciones a un territorio, con su propia carta: por ejemplo, el Réquiem solo a Andalucía, o Fidelio a las provincias entre Zaragoza y Bilbao. Los sitios
        que entran en una campaña reciben solo la carta de la campaña. Sus propuestas se preparan en <a href="#/propuestas">Propuestas</a>, eligiendo la campaña en el desplegable.
      </p>
      <div className="barra-herramientas">
        <button type="button" className="boton" onClick={nueva}>
          Nueva campaña
        </button>
      </div>
      {xs.map((c) => {
        const carta = c[idioma];
        const texto = (k: keyof CartaCampana, etiqueta: string, filas: number) => (
          <label>
            {etiqueta}
            {filas > 1 ? (
              <textarea rows={filas} value={carta[k]} onChange={(e) => poner(c.id, { [idioma]: { ...carta, [k]: e.target.value } })} />
            ) : (
              <input value={carta[k]} onChange={(e) => poner(c.id, { [idioma]: { ...carta, [k]: e.target.value } })} />
            )}
          </label>
        );
        const zonas = [...c.ccaa, ...c.provincias];
        return (
          <details key={c.id} className="bloque formulario" open={abierta === c.id} onToggle={(e) => (e.currentTarget.open ? setAbierta(c.id) : abierta === c.id && setAbierta(null))}>
            <summary>
              <strong>{c.nombre}</strong> <span className="ayuda">· {c.espectaculos.length} producciones · {zonas.length ? zonas.join(', ') : 'sin territorio'}</span>
            </summary>
            <label>
              Nombre
              <input value={c.nombre} onChange={(e) => poner(c.id, { nombre: e.target.value })} />
            </label>
            <h4>Producciones</h4>
            <ElegirProducciones catalogo={catalogo} elegidas={c.espectaculos} cambiar={(ids) => cambiarProducciones(c, ids)} />
            <h4>Territorio</h4>
            <p className="ayuda">Marca comunidades enteras o, dentro de cada una, solo algunas provincias.</p>
            <div className="territorio">
              {territorio.map((t) => (
                <div key={t.ccaa} className="territorio-ccaa">
                  <label className="casilla">
                    <input type="checkbox" checked={c.ccaa.includes(t.ccaa)} onChange={() => poner(c.id, { ccaa: conmutar(c.ccaa, t.ccaa) })} />
                    <strong>{t.ccaa}</strong>
                  </label>
                  {!c.ccaa.includes(t.ccaa) && t.provincias.length > 1 && (
                    <div className="territorio-provincias">
                      {t.provincias.map((p) => (
                        <label key={p} className="casilla">
                          <input type="checkbox" checked={c.provincias.includes(p)} onChange={() => poner(c.id, { provincias: conmutar(c.provincias, p) })} />
                          {p}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <h4>Anexo</h4>
            <label>
              El PDF que se adjunta
              <select value={c.anexo ?? ''} onChange={(e) => poner(c.id, { anexo: e.target.value || null })}>
                <option value="">Automático: un dossier con las producciones de la campaña</option>
                {anexos.map((a) => (
                  <option key={a.id} value={a.id}>
                    Anexo a medida: {a.nombre}
                  </option>
                ))}
              </select>
            </label>
            <h4>La carta de la campaña</h4>
            <p className="ayuda">
              Empieza con la carta de la línea de la primera producción: cámbiala a tu gusto (por ejemplo, quita las producciones que no van en la campaña y añade la fecha y el lugar). El saludo,
              lo que ha programado el sitio, la invitación, la despedida y la firma se ponen solos. Entre llaves, lo que se rellena solo: {'{lugar}'}, {'{remitente}'}, {'{web}'},{' '}
              {'{producciones}'}.
            </p>
            <Idiomas idioma={idioma} poner={setIdioma} />
            {texto('asunto', 'Asunto', 1)}
            {texto('intro', 'Presentación', 4)}
            {texto('texto', 'Texto (con la lista de producciones)', 10)}
            {texto('cierre', 'Cierre', 3)}
            <p>
              <button
                type="button"
                className="accion"
                onClick={() => {
                  const d = deLinea(c.espectaculos, idioma);
                  if (d && window.confirm('¿Sustituir la carta de la campaña (en este idioma) por la de la línea?')) poner(c.id, { [idioma]: d });
                }}
              >
                Volver a empezar con la carta de la línea
              </button>{' '}
              <button type="button" className="accion" onClick={() => window.confirm(`¿Borrar la campaña «${c.nombre}»?`) && setXs(xs.filter((x) => x.id !== c.id))}>
                Borrar la campaña
              </button>
            </p>
          </details>
        );
      })}
      {!xs.length && <p className="ayuda">Aún no hay campañas.</p>}
      <Guardar cambiado={cambiado} guardar={guardar} />
    </div>
  );
}
